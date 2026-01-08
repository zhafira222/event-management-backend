import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDTO } from "./dto/create-review.dto";

export class ReviewService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createReview = async (body: CreateReviewDTO, authUserId: number) => {
    // 1) pastikan transaksi ada + ambil event organizer untuk update rating
    const trx = await this.prisma.transactions.findUnique({
      where: { transaction_id: body.transaction_id },
      select: {
        transaction_id: true,
        user_id: true,
        event_id: true,
        status: true,
        events: {
          select: {
            event_id: true,
            organizer_id: true,
            end_date: true,
          },
        },
      },
    });

    if (!trx) throw new ApiError("Transaction not found.", 404);

    // 2) transaksi harus milik user login
    if (trx.user_id !== authUserId) {
      throw new ApiError("You don't have access to this transaction.", 403);
    }

    // 3) pastikan event_id sesuai transaksi
    // if (trx.event_id !== body.event_id) {
    //   throw new ApiError("Event ID does not match this transaction.", 400);
    // }

    const now = new Date();
    if (trx.events.end_date > now) {
      throw new ApiError("You can review only after the event has ended.", 400);
    }

    const now = new Date();
    if (trx.events.end_date > now) {
      throw new ApiError("You can review only after the event has ended.", 400);
    }

    // 4) pastikan status transaksi tidak pending
    if (!["PAID", "WAITING_FOR_REVIEW", "REVIEW_DONE"].includes(trx.status)) {
      throw new ApiError(
        "You can review only after payment is completed.",
        400
      );
    }

    // 5) pastikan 1 transaksi hanya 1 review
    const existing = await this.prisma.reviews.findFirst({
      where: { transaction_id: body.transaction_id },
      select: { review_id: true },
    });

    if (existing) {
      throw new ApiError("Review for this transaction already exists.", 400);
    }

    // 6) create review + update organizer rating secara atomic
    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.reviews.create({
        data: {
          rating: body.rating,
          comment: body.comment.trim(),
          user_id: authUserId,
          event_id: body.event_id,
          transaction_id: body.transaction_id,
        },
        include: {
          user: { select: { id: true, full_name: true, profile_image: true } },
        },
      });

      // ambil organizer current stats
      const org = await tx.organizers.findUnique({
        where: { organizer_id: trx.events.organizer_id },
        select: {
          organizer_id: true,
          average_rating: true,
          total_reviews: true,
        },
      });

      if (!org) {
        throw new ApiError("Organizer not found.", 404);
      }

      const prevTotal = org.total_reviews ?? 0;
      const prevAvg = new Prisma.Decimal(org.average_rating ?? 0);

      const newTotal = prevTotal + 1;
      const newAvg = prevAvg
        .mul(prevTotal)
        .plus(body.rating)
        .div(newTotal)
        .toDecimalPlaces(2);

      await tx.organizers.update({
        where: { organizer_id: org.organizer_id },
        data: {
          total_reviews: { increment: 1 },
          average_rating: newAvg,
        },
      });

      return review;
    });

    return {
      message: "Review created successfully!",
      data: result,
    };
  };

  getReviewsByEventId = async (eventId: string) => {
    const reviews = await this.prisma.reviews.findMany({
      where: { event_id: eventId },
      orderBy: { created_at: "desc" },
      include: {
        user: { select: { id: true, full_name: true, profile_image: true } },
      },
    });

    return reviews;
  };
}
