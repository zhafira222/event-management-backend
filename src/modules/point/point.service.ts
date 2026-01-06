// src/modules/point/point.service.ts
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePointDTO } from "./dto/create-point.dto";
import { GetPointDTO } from "./dto/get-point.dto";

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export class PointService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  /**
   *   Balance: sum(active earn/referral) + sum(all redeem)
   * - EARN/REFERRAL dihitung hanya yang expires_at > now
   * - REDEEM selalu dihitung (karena itu pemakaian poin)
   */
  private getEffectiveBalanceTx = async (
  tx: Prisma.TransactionClient,
  userId: number
) => {
    const now = new Date();

    const [posAgg, redeemAgg] = await Promise.all([
      tx.points.aggregate({
        where: {
          user_id: userId,
          source: { in: ["EARN", "REFERRAL"] },
          expires_at: { gt: now },
        },
        _sum: { amount: true },
      }),
      tx.points.aggregate({
        where: {
          user_id: userId,
          source: "REDEEM",
        },
        _sum: { amount: true },
      }),
    ]);

    const pos = posAgg._sum.amount ? new Prisma.Decimal(posAgg._sum.amount).toNumber() : 0;
    const redeem = redeemAgg._sum.amount ? new Prisma.Decimal(redeemAgg._sum.amount).toNumber() : 0; // negatif
    const bal = pos + redeem;

    return Math.max(0, bal);
  };

  /** balance untuk UI */
  getBalance = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      select: { id: true },
    });
    if (!user) throw new ApiError("User not found.", 404);

    const bal = await this.getEffectiveBalanceTx(this.prisma, authUserId);

    // optional cache ke user.points_balance biar gampang dipakai FE
    await this.prisma.user.update({
      where: { id: authUserId },
      data: { points_balance: new Prisma.Decimal(bal) },
    });

    return { data: { points_balance: bal } };
  };

  /** history points */
  getPoints = async (authUserId: number, query: GetPointDTO) => {
    const page = query.page ?? 1;
    const take = query.take ?? 10;

    const where: Prisma.pointsWhereInput = { user_id: authUserId };

    if (query.transaction_id) where.transaction_id = query.transaction_id;
    if (query.source) where.source = query.source;

    if (query.activeOnly) {
      // activeOnly = hanya EARN/REFERRAL yg belum expired
      where.OR = [
        { source: { in: ["EARN", "REFERRAL"] }, expires_at: { gt: new Date() } },
        { source: "REDEEM" }, // redeem selalu dianggap “aktif” untuk history
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.points.findMany({
        where,
        take,
        skip: (page - 1) * take,
        orderBy: { [query.sortBy ?? "created_at"]: query.sortOrder ?? "desc" },
        select: {
          point_id: true,
          amount: true,
          source: true,
          expires_at: true,
          transaction_id: true,
          created_at: true,
        },
      }),
      this.prisma.points.count({ where }),
    ]);

    return { data, meta: { page, take, total } };
  };

  /**
   * Create point record:
   * - EARN: +amount (butuh transaction_id & trx PAID, anti double)
   * - REDEEM: -amount (butuh transaction_id & trx WAITING_FOR_PAYMENT, cek balance cukup)
   * - REFERRAL: +amount (TIDAK butuh transaction_id)
   *
   * expires:
   * - EARN/REFERRAL: now + 3 months (default)
   * - REDEEM: pakai expires_at = now (tidak dipakai untuk balance, redeem selalu dihitung)
   */
  createPoint = async (body: CreatePointDTO, authUserId: number) => {
    const amountInt = Number(body.amount);
    if (!Number.isInteger(amountInt) || amountInt < 1) {
      throw new ApiError("amount must be an integer and >= 1.", 400);
    }

    const now = new Date();

    const expiresAtDefault =
      body.expires_at && !Number.isNaN(new Date(body.expires_at).getTime())
        ? new Date(body.expires_at)
        : addMonths(now, 3);

    return await this.prisma.$transaction(async (tx) => {
      // pastikan user ada
      const user = await tx.user.findUnique({
        where: { id: authUserId },
        select: { id: true },
      });
      if (!user) throw new ApiError("User not found.", 404);

      // jika EARN/REDEEM wajib transaction_id
      let trx:
        | { transaction_id: string; user_id: number; status: any }
        | null = null;

      if (body.source === "EARN" || body.source === "REDEEM") {
        if (!body.transaction_id) throw new ApiError("transaction_id is required.", 400);

        trx = await tx.transactions.findUnique({
          where: { transaction_id: body.transaction_id },
          select: { transaction_id: true, user_id: true, status: true },
        });

        if (!trx) throw new ApiError("Transaction not found.", 404);
        if (trx.user_id !== authUserId) throw new ApiError("Forbidden transaction.", 403);

        if (body.source === "EARN") {
          if (trx.status !== "PAID") {
            throw new ApiError("Points can only be earned when transaction is PAID.", 400);
          }

          const alreadyEarned = await tx.points.findFirst({
            where: { transaction_id: trx.transaction_id, user_id: authUserId, source: "EARN" },
            select: { point_id: true },
          });
          if (alreadyEarned) throw new ApiError("Points already earned for this transaction.", 400);
        }

        if (body.source === "REDEEM") {
          if (trx.status !== "WAITING_FOR_PAYMENT") {
            throw new ApiError("Points can only be redeemed before payment (WAITING_FOR_PAYMENT).", 400);
          }

          const currentBalance = await this.getEffectiveBalanceTx(tx, authUserId);
          if (currentBalance < amountInt) throw new ApiError("Not enough points balance.", 400);
        }
      }

      const signedAmount =
        body.source === "REDEEM"
          ? new Prisma.Decimal(-amountInt)
          : new Prisma.Decimal(amountInt);

      const expiresAt =
        body.source === "REDEEM" ? now : expiresAtDefault;

      const created = await tx.points.create({
        data: {
          amount: signedAmount,
          source: body.source,
          expires_at: expiresAt,
          user_id: authUserId,
          transaction_id: trx?.transaction_id ?? null, // ✅ null allowed
        },
        select: {
          point_id: true,
          amount: true,
          source: true,
          expires_at: true,
          transaction_id: true,
          created_at: true,
        },
      });

      // recompute effective balance, lalu cache ke user.points_balance
      const nextBalance = await this.getEffectiveBalanceTx(tx, authUserId);

      await tx.user.update({
        where: { id: authUserId },
        data: { points_balance: new Prisma.Decimal(nextBalance) },
      });

      return {
        message: "Point updated successfully!",
        data: { ...created, current_balance: nextBalance },
      };
    });
  };

  /**
   * Earn points dari transaksi PAID:
   * rumus: floor(totalPaid/1000)
   * ✅ tetapi HANYA kalau transaksi ini tidak pakai points (tidak ada REDEEM)
   * ✅ expires 3 bulan
   */
  awardFromPaidTransaction = async (transaction_id: string, authUserId: number) => {
    return await this.prisma.$transaction(async (tx) => {
      const trx = await tx.transactions.findUnique({
        where: { transaction_id },
        select: {
          transaction_id: true,
          user_id: true,
          status: true,
          qty: true,
          base_price_at_time_buy: true,
          coupon_id: true,
        },
      });

      if (!trx) throw new ApiError("Transaction not found.", 404);
      if (trx.user_id !== authUserId) throw new ApiError("Forbidden transaction.", 403);
      if (trx.status !== "PAID") throw new ApiError("Transaction must be PAID to earn points.", 400);

      const already = await tx.points.findFirst({
        where: { transaction_id: trx.transaction_id, user_id: authUserId, source: "EARN" },
        select: { point_id: true },
      });
      if (already) throw new ApiError("Points already earned for this transaction.", 400);

      // ✅ kalau transaksi pakai points, tidak dapat earn points
      const redeemedAgg = await tx.points.aggregate({
        where: { transaction_id: trx.transaction_id, user_id: authUserId, source: "REDEEM" },
        _sum: { amount: true },
      });

      const redeemedNeg = redeemedAgg._sum.amount
        ? new Prisma.Decimal(redeemedAgg._sum.amount).toNumber()
        : 0; // negatif
      const redeemedAbs = Math.max(0, -redeemedNeg);

      if (redeemedAbs > 0) {
        return { message: "No points earned because points were used in this transaction.", data: { earned: 0 } };
      }

      const baseTotal = trx.base_price_at_time_buy * trx.qty;

      let couponDiscount = 0;
      if (trx.coupon_id) {
        const coupon = await tx.coupons.findUnique({
          where: { coupon_id: trx.coupon_id },
          select: { discount_amount: true },
        });
        couponDiscount = coupon ? new Prisma.Decimal(coupon.discount_amount).toNumber() : 0;
      }

      const totalPaid = Math.max(0, baseTotal - couponDiscount);
      const earned = Math.floor(totalPaid / 1000);

      if (earned <= 0) {
        return { message: "No points earned (totalPaid too small).", data: { earned: 0 } };
      }

      const point = await tx.points.create({
        data: {
          user_id: authUserId,
          transaction_id: trx.transaction_id,
          source: "EARN",
          amount: new Prisma.Decimal(earned),
          expires_at: addMonths(new Date(), 3), // ✅ 3 bulan
        },
        select: {
          point_id: true,
          amount: true,
          source: true,
          expires_at: true,
          transaction_id: true,
          created_at: true,
        },
      });

      const nextBalance = await this.getEffectiveBalanceTx(tx, authUserId);

      await tx.user.update({
        where: { id: authUserId },
        data: { points_balance: new Prisma.Decimal(nextBalance) },
      });

      return {
        message: "Points earned successfully!",
        data: { ...point, earned, current_balance: nextBalance, total_paid: totalPaid },
      };
    });
  };
}