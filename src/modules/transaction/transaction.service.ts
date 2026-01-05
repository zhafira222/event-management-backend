import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto";

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

    // 1) Pastikan event ada
    const event = await this.prisma.event.findUnique({
      where: { event_id: body.event_id },
      select: { event_id: true },
    });
    if (!event) throw new ApiError("Event not found.", 404);

    // 2) Ambil ticket + pastikan ticket milik event yang sama
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: body.ticket_id },
      select: {
        ticket_id: true,
        event_id: true,
        price: true,
        stock: true,
      },
    });

    if (!ticket) throw new ApiError("Ticket not found.", 404);
    if (ticket.event_id !== body.event_id) {
      throw new ApiError("Ticket does not belong to this event.", 400);
    }

    // 3) Hitung harga dasar
    const basePrice = new Prisma.Decimal(ticket.price); // Decimal
    const baseTotal = basePrice.mul(qty); // Decimal

    // 4) Jika pakai coupon, validasi coupon
    const now = new Date();
    let appliedCouponId: string | null = null;
    let discountAmount = new Prisma.Decimal(0);

    if (body.coupon_id) {
      const coupon = await this.prisma.coupons.findUnique({
        where: { coupon_id: body.coupon_id },
        select: {
          coupon_id: true,
          event_id: true,
          expires_at: true,
          quota: true,
          discount_amount: true,
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

      appliedCouponId = coupon.coupon_id;
      discountAmount = new Prisma.Decimal(coupon.discount_amount);
    }

    // 5) Total price setelah diskon (minimal 0)
    let totalPrice = baseTotal.minus(discountAmount);
    if (totalPrice.lessThan(0)) totalPrice = new Prisma.Decimal(0);

    // 6) Deadline (kamu bisa ubah sesuai rule bisnis)
    const paymentDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
    const confirmationDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 jam

    // 7) Jalankan transaksi DB: kurangi stock ticket, kurangi quota coupon, create transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 7a) Kurangi stock ticket secara aman (anti race)
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

      // 7b) Jika pakai coupon, kurangi quota coupon secara aman
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

      // 7c) Create transaksi
      const trx = await tx.transactions.create({
        data: {
          ticket_id: body.ticket_id,
          user_id: authUserId,
          event_id: body.event_id,
          qty,
          total_price: totalPrice,
          coupon_id: appliedCouponId,
          payment_deadline: paymentDeadline,
          confirmation_deadline: confirmationDeadline,
          base_price_at_time_buy: basePrice,
          // status default "pending" dari schema
        },
        include: {
          events: { select: { title: true, slug: true } },
          tickets: { select: { name: true, price: true } },
          coupons: { select: { discount_name: true, discount_amount: true } },
        },
      });

      return trx;
    });

    return {
      message: "Transaction created successfully!",
      data: result,
    };
  };
}