import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/email.service";
import { TransactionStatus } from "@prisma/client";

// Helper slug sederhana (biar gak bergantung util lain)
const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export class OrganizerService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
  }

  /*
   * CREATE ORGANIZER PROFILE
   */
  createOrganizerProfile = async (
    userId: number,
    body: {
      organization_name: string;
      description?: string; // boleh optional dari FE
      phone?: string;
    }
  ) => {
    const existing = await this.prisma.organizers.findUnique({
      where: { user_id: userId },
    });

    if (existing) {
      throw new ApiError("Organizer profile already exists", 400);
    }

    // organizers.description di Prisma adalah String (WAJIB), jadi harus dipastikan string
    const description = body.description ?? "";

    // phone tidak ada di table organizers pada schema kamu.
    // Kalau kamu mau, bisa update user.phone_number di sini (opsional).
    if (body.phone) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { phone_number: body.phone },
      });
    }

    return this.prisma.organizers.create({
      data: {
        user_id: userId,
        organization_name: body.organization_name,
        description,
      },
    });
  };

  /*
   * CREATE EVENT
   */
  createEvent = async (
    organizerUserId: number,
    body: {
      title: string;
      description: string;
      start_date: Date;
      end_date: Date;
      location: string;
      image: string;
      category_id: number;
    }
  ) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: organizerUserId },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 404);
    }

    // event.slug WAJIB di Prisma schema kamu
    let slug = slugify(body.title);

    // pastikan unik
    const existingSlug = await this.prisma.event.findUnique({
      where: { slug },
      select: { event_id: true },
    });

    if (existingSlug) {
      slug = "${slug}-${Date.now()}";
    }

    return this.prisma.event.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        start_date: body.start_date,
        end_date: body.end_date,
        location: body.location,
        image: body.image,
        category_id: body.category_id,
        organizer_id: organizer.organizer_id,
      },
    });
  };

  /*
   * DASHBOARD - EVENTS
   */
  getOrganizerEvents = async (userId: number) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: userId },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 404);
    }

    return this.prisma.event.findMany({
      where: { organizer_id: organizer.organizer_id },
      include: {
        tickets: true,
        transactions: true,
      },
      orderBy: { created_at: "desc" },
    });
  };

  /*
   * DASHBOARD - TRANSACTIONS
   */
  getOrganizerTransactions = async (userId: number) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: userId },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 404);
    }

    return this.prisma.transactions.findMany({
      where: {
        events: {
          organizer_id: organizer.organizer_id,
        },
      },
      include: {
        user: true,
        tickets: true,
        payments: true,
        coupons: true,
      },
      orderBy: { created_at: "desc" },
    });
  };

  /*
   * ACCEPT TRANSACTION
   */
  acceptTransaction = async (transactionId: string) => {
    return this.prisma.$transaction(async (tx) => {
      const trx = await tx.transactions.findUnique({
        where: { transaction_id: transactionId },
        include: {
          user: true,
          events: true,
        },
      });

      if (!trx) throw new ApiError("Transaction not found", 404);

      // "pending" tidak ada di enum kamu → gunakan status yang relevan
      // Saat organizer ngecek bukti bayar: biasanya WAITING_FOR_CONFIRMATION
      if (trx.status !== TransactionStatus.WAITING_FOR_CONFIRMATION) {
        throw new ApiError("Transaction already processed / invalid status", 400);
      }

      await tx.transactions.update({
        where: { transaction_id: transactionId },
        data: { status: TransactionStatus.PAID },
      });

      await this.mailService.sendEmail(
        trx.user.email,
        "Payment Accepted",
        `
          <h3>Payment Accepted</h3>
          <p>Your payment for <b>${trx.events.title}</b> has been accepted.</p>
        `,
        {} // <- FIX: email.service.ts minta argumen ke-4 "context"
      );

      return { message: "Transaction accepted" };
    });
  };

  /*
   * REJECT TRANSACTION
   */
  rejectTransaction = async (transactionId: string) => {
    return this.prisma.$transaction(async (tx) => {
      const trx = await tx.transactions.findUnique({
        where: { transaction_id: transactionId },
        include: {
          tickets: true,
          user: true,
          points: true,
          coupons: true,
          events: true,
        },
      });

      if (!trx) throw new ApiError("Transaction not found", 404);

      if (trx.status !== TransactionStatus.WAITING_FOR_CONFIRMATION) {
        throw new ApiError("Transaction already processed / invalid status", 400);
      }

      await tx.transactions.update({
        where: { transaction_id: transactionId },
        data: { status: TransactionStatus.REJECT },
      });

      // balikin stok tiket
      await tx.tickets.update({
        where: { ticket_id: trx.ticket_id },
        data: {
          stock: { increment: trx.qty },
        },
      });

      // hapus points yang terkait trx ini (kalau ada)
      if (trx.points.length > 0) {
        for (const point of trx.points) {
          await tx.points.delete({
            where: { point_id: point.point_id },
          });
        }
      }

      await this.mailService.sendEmail(
        trx.user.email,
        "Payment Rejected",
        `
          <h3>Payment Rejected</h3>
          <p>Your payment for <b>${trx.events.title}</b> has been rejected.</p>
          <p>Any used points or vouchers have been restored.</p>
        `,
        {} // <- FIX: context
      );

      return { message: "Transaction rejected & data restored" };
    });
  };

  /*
   * ATTENDEE LIST
   */
  getEventAttendees = async (eventId: string) => {
    const rows = await this.prisma.transactions.findMany({
      where: {
        event_id: eventId,
        status: TransactionStatus.PAID, // "accepted" tidak ada → PAID
      },
      select: {
        qty: true,
        base_price_at_time_buy: true,
        user: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
    });

    // total_price tidak ada di schema, jadi hitung manual
    return rows.map((r) => ({
      qty: r.qty,
      total_price: r.base_price_at_time_buy * r.qty,
      user: r.user,
    }));
  };

  /*
   * DASHBOARD STATISTICS
   */
  getOrganizerStats = async (userId: number) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: userId },
    });

    if (!organizer) {
      throw new ApiError("Organizer not found", 404);
    }

    const rows = await this.prisma.transactions.findMany({
      where: {
        events: {
          organizer_id: organizer.organizer_id,
        },
        status: TransactionStatus.PAID,
      },
      select: {
        created_at: true,
        base_price_at_time_buy: true,
        qty: true,
      },
      orderBy: { created_at: "asc" },
    });

    return rows.map((r) => ({
      created_at: r.created_at,
      total_price: r.base_price_at_time_buy * r.qty,
    }));
  };
}

/**
 * ==================================================
 * SERVICE WRAPPERS (UNTUK ROUTER)
 * ==================================================
 * Dibuat agar router bisa import function-style
 * TANPA mengubah logic class OrganizerService
 */

const organizerService = new OrganizerService();

/**
 * CREATE ORGANIZER PROFILE
 * POST /api/organizer/profile
 */
export const createOrganizerProfileService = (
  userId: number,
  body: {
    organization_name: string;
    description?: string;
    phone?: string;
  }
) => organizerService.createOrganizerProfile(userId, body);

/**
 * CREATE EVENT
 * POST /api/organizer/events
 */
export const createEventService = (
  userId: number,
  body: {
    title: string;
    description: string;
    start_date: Date;
    end_date: Date;
    location: string;
    image: string;
    category_id: number;
  }
) => organizerService.createEvent(userId, body);

/**
 * GET ORGANIZER EVENTS
 * GET /api/organizer/events
 */
export const getOrganizerEventsService = (userId: number) =>
  organizerService.getOrganizerEvents(userId);

/**
 * GET ORGANIZER TRANSACTIONS
 * GET /api/organizer/transactions
 */
export const getOrganizerTransactionsService = (userId: number) =>
  organizerService.getOrganizerTransactions(userId);

/**
 * ACCEPT TRANSACTION
 * PATCH /api/organizer/transactions/:id/accept
 */
export const acceptTransactionService = (transactionId: string) =>
  organizerService.acceptTransaction(transactionId);

/**
 * REJECT TRANSACTION
 * PATCH /api/organizer/transactions/:id/reject
 */
export const rejectTransactionService = (transactionId: string) =>
  organizerService.rejectTransaction(transactionId);

/**
 * EVENT ATTENDEES
 * GET /api/organizer/events/:eventId/attendees
 */
export const getEventAttendeesService = (eventId: string) =>
  organizerService.getEventAttendees(eventId);

/**
 * ORGANIZER STATISTICS
 * GET /api/organizer/stats
 */
export const getOrganizerStatsService = (userId: number) =>
  organizerService.getOrganizerStats(userId);
