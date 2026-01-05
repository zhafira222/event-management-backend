import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto"; // sesuai file kamu
import { CloudinaryService } from "../cloudinary/cloudinary.service";

export class TransactionService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createTransaction = async (body: CreateTransactionDTO, authUserId: number) => {
    const qty = body.qty ?? 1;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError("qty must be at least 1.", 400);
    }

    const now = new Date();
    const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
    const confirmationDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 jam

    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Pastikan event ada + event belum lewat
      const event = await tx.event.findUnique({
        where: { event_id: body.event_id },
        select: {
          event_id: true,
          title: true,
          slug: true,
          end_date: true,
        },
      });

      if (!event) throw new ApiError("Event not found.", 404);

      // tidak bisa beli jika event sudah lewat (end_date <= now)
      if (event.end_date <= now) {
        throw new ApiError("Cannot buy ticket: event has ended.", 400);
      }

      // 2) Ambil ticket + pastikan ticket milik event yang sama
      const ticket = await tx.tickets.findUnique({
        where: { ticket_id: body.ticket_id },
        select: {
          ticket_id: true,
          event_id: true,
          name: true,
          price: true,
          stock: true,
        },
      });

      if (!ticket) throw new ApiError("Ticket not found.", 404);
      if (ticket.event_id !== body.event_id) {
        throw new ApiError("Ticket does not belong to this event.", 400);
      }

      // 3) Ambil base price (Int) dari ticket.price (Decimal)
      const basePriceNum = new Prisma.Decimal(ticket.price).toNumber();
      if (!Number.isFinite(basePriceNum) || basePriceNum < 0 || !Number.isInteger(basePriceNum)) {
        throw new ApiError("Invalid ticket price. Price must be an integer.", 400);
      }

      const baseTotal = basePriceNum * qty;

      // 4) Coupon (optional) - validasi + ambil diskon
      let appliedCouponId: string | null = null;
      let discountNum = 0;

      if (body.coupon_id) {
        const coupon = await tx.coupons.findUnique({
          where: { coupon_id: body.coupon_id },
          select: {
            coupon_id: true,
            event_id: true,
            expires_at: true,
            quota: true, // BigInt
            discount_amount: true, // Decimal
            discount_name: true,
          },
        });

        if (!coupon) throw new ApiError("Coupon not found.", 404);
        if (coupon.event_id !== body.event_id) {
          throw new ApiError("Coupon is not valid for this event.", 400);
        }
        if (coupon.expires_at < now) {
          throw new ApiError("Coupon has expired.", 400);
        }
        if (coupon.quota <= 0) {
          throw new ApiError("Coupon quota is empty.", 400);
        }

        const d = new Prisma.Decimal(coupon.discount_amount).toNumber();
        if (!Number.isFinite(d) || d < 0 || !Number.isInteger(d)) {
          throw new ApiError("Invalid discount amount. Must be an integer.", 400);
        }

        appliedCouponId = coupon.coupon_id;
        discountNum = d;
      }

      // 5) Total price (untuk return saja, karena kolom total_price sudah tidak ada)
      const totalPrice = Math.max(0, baseTotal - discountNum);

      // 6) Kurangi stock ticket (anti race)
      const updatedTicket = await tx.tickets.updateMany({
        where: {
          ticket_id: body.ticket_id,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (updatedTicket.count === 0) {
        throw new ApiError("Ticket stock is not enough.", 400);
      }

      // 7) Kurangi quota coupon (anti race)
      if (appliedCouponId) {
        const updatedCoupon = await tx.coupons.updateMany({
          where: {
            coupon_id: appliedCouponId,
            event_id: body.event_id,
            expires_at: { gte: now },
            quota: { gt: 0 },
          },
          data: {
            quota: { decrement: 1 },
          },
        });

        if (updatedCoupon.count === 0) {
          throw new ApiError("Coupon is no longer available.", 400);
        }
      }

      // 8) Create transaction
      const trx = await tx.transactions.create({
        data: {
          ticket_id: body.ticket_id,
          user_id: authUserId,
          event_id: body.event_id,
          qty,
          coupon_id: appliedCouponId,
          payment_deadline: paymentDeadline,
          confirmation_deadline: confirmationDeadline,
          base_price_at_time_buy: basePriceNum, // Int
          // status default: WAITING_FOR_PAYMENT
        },
        include: {
          events: { select: { title: true, slug: true, end_date: true } },
          tickets: { select: { name: true, price: true } },
          coupons: { select: { discount_name: true, discount_amount: true, code: true } },
        },
      });

      // Return + computed total
      return {
        ...trx,
        computed: {
          base_price: basePriceNum,
          qty,
          discount: discountNum,
          total_price: totalPrice,
        },
      };
    });

    return {
      message: "Transaction created successfully!",
      data: result,
    };
  };

uploadPaymentProof = async (
  transactionId: string,
  image: Express.Multer.File,
  authUserId: number
) => {
  const now = new Date();

  // 1) pastikan trx ada & milik user
  const trx = await this.prisma.transactions.findUnique({
    where: { transaction_id: transactionId },
    select: {
      transaction_id: true,
      user_id: true,
      status: true,
      payment_deadline: true,
    },
  });

  if (!trx) throw new ApiError("Transaction not found.", 404);
  if (trx.user_id !== authUserId) throw new ApiError("Forbidden.", 403);

  // 2) validasi status + deadline
  if (trx.status !== "WAITING_FOR_PAYMENT") {
    throw new ApiError("Transaction is not waiting for payment.", 400);
  }
  if (trx.payment_deadline < now) {
    throw new ApiError("Payment deadline has passed.", 400);
  }

  // 3) upload image (pakai CloudinaryService yang kamu sudah punya)
  const cloudinary = new CloudinaryService();
  const { secure_url } = await cloudinary.upload(image);

  // 4) simpan payment record + update transaction
  const updated = await this.prisma.$transaction(async (tx) => {
    await tx.payments.create({
      data: {
        transaction_id: trx.transaction_id,
        image_url: secure_url,
        payment_time: now,
      },
    });

    return tx.transactions.update({
      where: { transaction_id: trx.transaction_id },
      data: {
        paymentProof: secure_url,
        status: "WAITING_FOR_CONFIRMATION", // ✅ alur normal
        // kalau mau langsung PAID: ganti jadi "PAID"
      },
      select: {
        transaction_id: true,
        status: true,
        paymentProof: true,
        updated_at: true,
      },
    });
  });

  return {
    message: "Payment proof uploaded.",
    data: updated,
  };
};
}