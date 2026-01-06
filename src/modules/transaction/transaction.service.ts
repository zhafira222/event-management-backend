import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export class TransactionService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  /** EXPIRED: lewat 2 jam dan belum upload proof */
  expireUnpaid = async () => {
    const now = new Date();

    const targets = await this.prisma.transactions.findMany({
      where: {
        status: "WAITING_FOR_PAYMENT",
        payment_deadline: { lt: now },
        paymentProof: null,
      },
      select: { transaction_id: true },
      take: 200,
    });

    for (const t of targets) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.transactions.updateMany({
          where: {
            transaction_id: t.transaction_id,
            status: "WAITING_FOR_PAYMENT",
            paymentProof: null,
          },
          data: { status: "EXPIRED" },
        });

        if (updated.count === 0) return;

        await this.rollbackIfNeededTx(tx, t.transaction_id);
      });
    }
  };

  /** CANCELED: organizer tidak accept/reject > 3 hari setelah proof upload */
  cancelStaleConfirmation = async () => {
    const now = new Date();

    const targets = await this.prisma.transactions.findMany({
      where: {
        status: "WAITING_FOR_CONFIRMATION",
        confirmation_deadline: { lt: now },
      },
      select: { transaction_id: true },
      take: 200,
    });

    for (const t of targets) {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.transactions.updateMany({
          where: {
            transaction_id: t.transaction_id,
            status: "WAITING_FOR_CONFIRMATION",
          },
          data: { status: "CANCELED" },
        });

        if (updated.count === 0) return;

        await this.rollbackIfNeededTx(tx, t.transaction_id);
      });
    }
  };

  runHousekeeping = async () => {
    await this.expireUnpaid();
    await this.cancelStaleConfirmation();
  };

  private rollbackIfNeededTx = async (
    tx: Prisma.TransactionClient,
    trxId: string
  ) => {
    const trx = await tx.transactions.findUnique({
      where: { transaction_id: trxId },
      select: {
        transaction_id: true,
        user_id: true,
        ticket_id: true,
        qty: true,
        coupon_id: true,
      },
    });

    if (!trx) throw new ApiError("Transaction not found.", 404);

    // restore ticket stock
    await tx.tickets.update({
      where: { ticket_id: trx.ticket_id },
      data: { stock: { increment: trx.qty } },
    });

    // restore coupon quota if any
    if (trx.coupon_id) {
      await tx.coupons.update({
        where: { coupon_id: trx.coupon_id },
        data: { quota: { increment: 1 } },
      });
    }

    // return redeemed points (idempotent)
    const alreadyRollback = await tx.points.findFirst({
      where: {
        transaction_id: trx.transaction_id,
        user_id: trx.user_id,
        source: "ROLLBACK_REDEEM",
      },
      select: { point_id: true },
    });

    if (alreadyRollback) return;

    const redeemedAgg = await tx.points.aggregate({
      where: {
        transaction_id: trx.transaction_id,
        user_id: trx.user_id,
        source: "REDEEM",
      },
      _sum: { amount: true },
    });

    const redeemedSumNeg = redeemedAgg._sum.amount
      ? new Prisma.Decimal(redeemedAgg._sum.amount).toNumber()
      : 0; // negatif

    const redeemedAbs = Math.max(0, -redeemedSumNeg);

    if (redeemedAbs <= 0) return;

    await tx.points.create({
      data: {
        user_id: trx.user_id,
        transaction_id: trx.transaction_id,
        source: "ROLLBACK_REDEEM",
        amount: new Prisma.Decimal(redeemedAbs),
        expires_at: addMonths(new Date(), 3),
      },
    });

    const user = await tx.user.findUnique({
      where: { id: trx.user_id },
      select: { points_balance: true },
    });

    const current = user?.points_balance
      ? new Prisma.Decimal(user.points_balance).toNumber()
      : 0;

    const next = new Prisma.Decimal(current)
      .plus(new Prisma.Decimal(redeemedAbs))
      .toNumber();

    await tx.user.update({
      where: { id: trx.user_id },
      data: { points_balance: new Prisma.Decimal(next) },
    });
  };

  private getEffectiveBalanceTx = async (
    tx: Prisma.TransactionClient,
    userId: number
  ) => {
    const now = new Date();

    const [posAgg, redeemAgg] = await Promise.all([
      tx.points.aggregate({
        where: {
          user_id: userId,
          source: { in: ["EARN", "REFERRAL", "ROLLBACK_REDEEM"] },
          expires_at: { gt: now },
        },
        _sum: { amount: true },
      }),
      tx.points.aggregate({
        where: { user_id: userId, source: "REDEEM" },
        _sum: { amount: true },
      }),
    ]);

    const pos = posAgg._sum.amount
      ? new Prisma.Decimal(posAgg._sum.amount).toNumber()
      : 0;

    const redeem = redeemAgg._sum.amount
      ? new Prisma.Decimal(redeemAgg._sum.amount).toNumber()
      : 0; // negatif

    return Math.max(0, pos + redeem);
  };

  createTransaction = async (
    body: CreateTransactionDTO,
    authUserId: number
  ) => {
    const qty = body.qty ?? 1;
    if (!Number.isInteger(qty) || qty < 1) {
      throw new ApiError("qty must be at least 1.", 400);
    }

    const requestedPoints = body.points_used ?? 0;
    if (!Number.isInteger(requestedPoints) || requestedPoints < 0) {
      throw new ApiError("points_used must be an integer and >= 0.", 400);
    }

    const now = new Date();

    // ✅ 2 jam untuk upload payment proof
    const paymentDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // ✅ 3 hari untuk organizer confirm setelah proof upload
    // (ini nanti akan di-set ulang saat uploadProof)
    const confirmationDeadline = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // event
      const event = await tx.event.findUnique({
        where: { event_id: body.event_id },
        select: { event_id: true, end_date: true, title: true, slug: true },
      });
      if (!event) throw new ApiError("Event not found.", 404);
      if (event.end_date <= now)
        throw new ApiError("Cannot buy ticket: event has ended.", 400);

      // ticket
      const ticket = await tx.tickets.findUnique({
        where: { ticket_id: body.ticket_id },
        select: {
          ticket_id: true,
          event_id: true,
          price: true,
          stock: true,
          name: true,
        },
      });
      if (!ticket) throw new ApiError("Ticket not found.", 404);
      if (ticket.event_id !== body.event_id)
        throw new ApiError("Ticket does not belong to this event.", 400);

      const basePriceNum = new Prisma.Decimal(ticket.price).toNumber();
      if (!Number.isInteger(basePriceNum) || basePriceNum < 0) {
        throw new ApiError(
          "Invalid ticket price. Price must be an integer.",
          400
        );
      }

      const baseTotal = basePriceNum * qty;

      // coupon by code (referral coupon)
      let appliedCouponId: string | null = null;
      let discountNum = 0;

      if (body.coupon_code && body.coupon_code.trim().length > 0) {
        const code = body.coupon_code.trim();

        const coupon = await tx.coupons.findFirst({
          where: {
            code,
            event_id: body.event_id, // ✅ wajib match event (sesuai schema kamu)
          },
          select: {
            coupon_id: true,
            expires_at: true,
            quota: true, // bigint
            discount_amount: true, // Decimal
          },
        });

        if (!coupon)
          throw new ApiError("Coupon code not found for this event.", 404);
        if (coupon.expires_at < now)
          throw new ApiError("Coupon has expired.", 400);
        if (coupon.quota <= 0)
          throw new ApiError("Coupon quota is empty.", 400);

        const d = new Prisma.Decimal(coupon.discount_amount).toNumber();
        if (!Number.isInteger(d) || d < 0) {
          throw new ApiError(
            "Invalid discount amount. Must be an integer.",
            400
          );
        }

        appliedCouponId = coupon.coupon_id;
        discountNum = d;
      }

      const payableBeforePoints = Math.max(0, baseTotal - discountNum);

      // points
      const availablePoints = await this.getEffectiveBalanceTx(tx, authUserId);
      if (requestedPoints > availablePoints)
        throw new ApiError("Not enough points balance.", 400);

      const pointsToUse = Math.max(
        0,
        Math.min(requestedPoints, availablePoints, payableBeforePoints)
      );
      const totalPrice = Math.max(0, payableBeforePoints - pointsToUse);

      // decrement stock (anti race)
      const updatedTicket = await tx.tickets.updateMany({
        where: { ticket_id: body.ticket_id, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
      if (updatedTicket.count === 0)
        throw new ApiError("Ticket stock is not enough.", 400);

      // decrement coupon quota (anti race)
      if (appliedCouponId) {
        const updatedCoupon = await tx.coupons.updateMany({
          where: {
            coupon_id: appliedCouponId,
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

      const trx = await tx.transactions.create({
        data: {
          ticket_id: body.ticket_id,
          user_id: authUserId,
          event_id: body.event_id,
          qty,
          coupon_id: appliedCouponId,
          payment_deadline: paymentDeadline,
          confirmation_deadline: confirmationDeadline,
          base_price_at_time_buy: basePriceNum,
        },
      });

      // record redeem
      if (pointsToUse > 0) {
        await tx.points.create({
          data: {
            user_id: authUserId,
            transaction_id: trx.transaction_id,
            source: "REDEEM",
            amount: new Prisma.Decimal(-pointsToUse),
            expires_at: now,
          },
        });
      }

      // cache balance
      const nextBalance = await this.getEffectiveBalanceTx(tx, authUserId);
      await tx.user.update({
        where: { id: authUserId },
        data: { points_balance: new Prisma.Decimal(nextBalance) },
      });

      return {
        ...trx,
        computed: {
          base_price: basePriceNum,
          qty,
          discount: discountNum,
          points_used: pointsToUse,
          total_price: totalPrice,
        },
      };
    });

    return { message: "Transaction created successfully!", data: result };
  };

  getTransactionById = async (transactionId: string, authUserId: number) => {
    const trx = await this.prisma.transactions.findUnique({
      where: { transaction_id: transactionId },
      select: {
        transaction_id: true,
        user_id: true,
        status: true,
        payment_deadline: true,
        confirmation_deadline: true,
        paymentProof: true,
      },
    });

    if (!trx) throw new ApiError("Transaction not found.", 404);
    if (trx.user_id !== authUserId) throw new ApiError("Forbidden.", 403);

    return trx;
  };

  uploadPaymentProof = async (
    transactionId: string,
    image: Express.Multer.File,
    authUserId: number
  ) => {
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
          confirmation_deadline: new Date(
            now.getTime() + 3 * 24 * 60 * 60 * 1000
          ), // ✅ 3 hari dari upload
        },
        select: {
          transaction_id: true,
          status: true,
          paymentProof: true,
          payment_deadline: true,
          confirmation_deadline: true,
          updated_at: true,
        },
      });
    });

    return { message: "Payment proof uploaded.", data: updated };
  };
}
