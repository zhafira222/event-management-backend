import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/email.service";

const mailService = new MailService();

/*
 * CREATE ORGANIZER PROFILE
 */
export const createOrganizerProfileService = async (
  userId: number,
  body: {
    organization_name: string;
    description?: string;
    phone?: string;
  }
) => {
  const existing = await prisma.organizers.findUnique({
    where: { user_id: userId },
  });

  if (existing) {
    throw new ApiError("Organizer profile already exists", 400);
  }

  return prisma.organizers.create({
    data: {
      user_id: userId,
      organization_name: body.organization_name,
      description: "body.description",
    },
  });
};

/*
 * CREATE EVENT
 */
export const createEventService = async (
  organizerUserId: number,
  body: {
    title: string;
    description: string;
    date: string;
    location: string;
    image: string;
    category_id: number;
  }
) => {
  // ambil organizer berdasarkan USER ID
  const organizer = await prisma.organizers.findUnique({
    where: { user_id: organizerUserId },
  });

  if (!organizer) {
    throw new ApiError("Organizer not found", 404);
  }

  return prisma.events.create({
    data: {
      title: body.title,
      description: body.description,
      date: new Date(body.date),
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
export const getOrganizerEventsService = async (userId: number) => {
  const organizer = await prisma.organizers.findUnique({
    where: { user_id: userId },
  });

  if (!organizer) {
    throw new ApiError("Organizer not found", 404);
  }

  return prisma.events.findMany({
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
export const getOrganizerTransactionsService = async (userId: number) => {
  const organizer = await prisma.organizers.findUnique({
    where: { user_id: userId },
  });

  if (!organizer) {
    throw new ApiError("Organizer not found", 404);
  }

  return prisma.transactions.findMany({
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
export const acceptTransactionService = async (transactionId: string) => {
  return prisma.$transaction(async (tx) => {
    const trx = await tx.transactions.findUnique({
      where: { transaction_id: transactionId },
      include: {
        user: true,
        events: true,
      },
    });

    if (!trx) throw new ApiError("Transaction not found", 404);
    if (trx.status !== "pending")
      throw new ApiError("Transaction already processed", 400);

    await tx.transactions.update({
      where: { transaction_id: transactionId },
      data: { status: "accepted" },
    });

    await mailService.sendEmail(
      trx.user.email,
      "Payment Accepted",
      `
        <h3>Payment Accepted</h3>
        <p>Your payment for <b>${trx.events.title}</b> has been accepted.</p>
      `
    );

    return { message: "Transaction accepted" };
  });
};

/* 
 * REJECT TRANSACTION
 */
export const rejectTransactionService = async (transactionId: string) => {
  return prisma.$transaction(async (tx) => {
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
    if (trx.status !== "pending")
      throw new ApiError("Transaction already processed", 400);

    // 1 Update transaction status
    await tx.transactions.update({
      where: { transaction_id: transactionId },
      data: { status: "rejected" },
    });

    // 2 Restore ticket stock
    await tx.tickets.update({
      where: { ticket_id: trx.ticket_id },
      data: {
        stock: { increment: trx.qty },
      },
    });

    // 3 Return points
    if (trx.points.length > 0) {
      for (const point of trx.points) {
        await tx.points.delete({
          where: { point_id: point.point_id },
        });
      }
    }

    // 4 Send email
    await mailService.sendEmail(
      trx.user.email,
      "Payment Rejected",
      `
        <h3>Payment Rejected</h3>
        <p>Your payment for <b>${trx.events.title}</b> has been rejected.</p>
        <p>Any used points or vouchers have been restored.</p>
      `
    );

    return { message: "Transaction rejected & data restored" };
  });
};

/*
 * ATTENDEE LIST
 */
export const getEventAttendeesService = async (eventId: string) => {
  return prisma.transactions.findMany({
    where: {
      event_id: eventId,
      status: "accepted",
    },
    select: {
      qty: true,
      total_price: true,
      user: {
        select: {
          full_name: true,
          email: true,
        },
      },
    },
  });
};

/*
 * DASHBOARD STATISTICS
 */
export const getOrganizerStatsService = async (userId: number) => {
  const organizer = await prisma.organizers.findUnique({
    where: { user_id: userId },
  });

  if (!organizer) {
    throw new ApiError("Organizer not found", 404);
  }

  return prisma.transactions.findMany({
    where: {
      events: {
        organizer_id: organizer.organizer_id,
      },
      status: "accepted",
    },
    select: {
      created_at: true,
      total_price: true,
    },
  });
};
