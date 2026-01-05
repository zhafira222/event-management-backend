import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDTO } from "./dto/create-transactions.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

export class TransactionService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  // =========================
  // CREATE TRANSACTION
  // =========================
  async createTransaction(
    body: CreateTransactionDTO,
    authUserId: number
  ) {
    const qty = body.qty ?? 1;

    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError("qty must be at least 1.", 400);
    }

    const now = new Date();
    const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const confirmationDeadline = new Date(
      now.getTime() + 48 * 60 * 60 * 1000
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Validasi event
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
      if (event.end_date <= now) {
        throw new ApiError("Cannot buy ticket: event has ended.", 400);
      }

      // 2. Validasi ticket
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

      // 3. Harga dasar
      const basePrice = new Prisma.Decimal(ticket.price).toNumber();
      if (!Number.isInteger(basePrice) || basePrice < 0) {
        throw new ApiError(
          "Invalid ticket price. Price must be an integer.",
          400
        );
      }

      const baseTotal = basePrice * qty;

      // 4. Coupon (optional)
      let appliedCouponId: string | null = null;
      let discount = 0;

      if (body.coupon_id) {
        const coupon = await tx.coupons.findUnique({
          where: { coupon_id: body.coupon_id },
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

        discount = new Prisma.Decimal(coupon.discount_amount).toNumber();
        appliedCouponId = coupon.coupon_id;
      }

      const totalPrice = Math.max(0, baseTotal - discount);

      // 5. Kurangi stok ticket (anti race)
      const ticketUpdate = await tx.tickets.updateMany({
        where: {
          ticket_id: body.ticket_id,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      });

      if (ticketUpdate.count === 0) {
        throw new ApiError("Ticket stock is not enough.", 400);
      }

      // 6. Kurangi quota coupon
      if (appliedCouponId) {
        const couponUpdate = await tx.coupons.updateMany({
          where: {
            coupon_id: appliedCouponId,
            event_id: body.event_id,
            quota: { gt: 0 },
            expires_at: { gte: now },
          },
          data: {
            quota: { decrement: 1 },
          },
        });

        if (couponUpdate.count === 0) {
          throw new ApiError("Coupon is no longer available.", 400);
        }
      }

      // 7. Buat transaksi
      const trx = await tx.transactions.create({
        data: {
          ticket_id: body.ticket_id,
          user_id: authUserId,
          event_id: body.event_id,
          qty,
          coupon_id: appliedCouponId,
          base_price_at_time_buy: basePrice,
          payment_deadline: paymentDeadline,
          confirmation_deadline: confirmationDeadline,
          status: "WAITING_FOR_PAYMENT",
        },
        include: {
          events: { select: { title: true, slug: true } },
          tickets: { select: { name: true, price: true } },
          coupons: { select: { discount_name: true, code: true } },
        },
      });

      return {
        ...trx,
        computed: {
          base_price: basePrice,
          qty,
          discount,
          total_price: totalPrice,
        },
      };
    });

    return {
      message: "Transaction created successfully!",
      data: result,
    };
  }

  // =========================
  // UPLOAD PAYMENT PROOF
  // =========================
  async uploadPaymentProof(
    transactionId: string,
    image: Express.Multer.File,
    authUserId: number
  ) {
    const now = new Date();

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
    if (trx.status !== "WAITING_FOR_PAYMENT") {
      throw new ApiError("Transaction is not waiting for payment.", 400);
    }
    if (trx.payment_deadline < now) {
      throw new ApiError("Payment deadline has passed.", 400);
    }

    const cloudinary = new CloudinaryService();
    const { secure_url } = await cloudinary.upload(image);

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
          status: "WAITING_FOR_CONFIRMATION",
        },
      });
    });

    return {
      message: "Payment proof uploaded.",
      data: updated,
    };
  }
}
