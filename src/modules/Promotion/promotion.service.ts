import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePromotionDTO } from "./dto/create-promotion.dto";

export class PromotionService {
  prisma: PrismaService;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.cloudinaryService = new CloudinaryService();
  }

  createPromotion = async (
    body: CreatePromotionDTO,
    image: Express.Multer.File,
    authUserId: number
  ) => {
    // 1) pastikan user adalah organizer
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: authUserId },
      select: { organizer_id: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer profile not found for this user.", 403);
    }

    // 2) pastikan event exists & milik organizer ini
    const event = await this.prisma.event.findFirst({
      where: {
        event_id: body.event_id,
        organizer_id: organizer.organizer_id,
      },
      select: { event_id: true },
    });

    if (!event) {
      throw new ApiError(
        "Event not found or you don't have access to this event.",
        404
      );
    }

    // 3) cek unique discount_name (sesuai schema)
    const existingByName = await this.prisma.coupons.findFirst({
      where: { discount_name: body.discount_name },
      select: { coupon_id: true },
    });

    if (existingByName) {
      throw new ApiError("The promotion name already exists.", 400);
    }

    // 4) (opsional tapi aman) cek code tidak duplikat
    const existingByCode = await this.prisma.coupons.findFirst({
      where: { code: body.code },
      select: { coupon_id: true },
    });

    if (existingByCode) {
      throw new ApiError("The promo code already exists.", 400);
    }

    // 5) upload image promo ke cloudinary
    const { secure_url } = await this.cloudinaryService.upload(image);

    // 6) create coupon
    await this.prisma.coupons.create({
      data: {
        code: body.code.trim(),
        discount_name: body.discount_name.trim(),
        discount_amount: new Prisma.Decimal(body.discount_amount),
        quota: BigInt(body.quota),
        expires_at: new Date(body.expires_at),
        event_id: body.event_id,
        organizer_id: organizer.organizer_id,
        image: secure_url,
      },
    });

    return { message: "Promotion created successfully!" };
  };

  getPromotions = async (authUserId: number) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: authUserId },
      select: { organizer_id: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer profile not found for this user.", 403);
    }

    const promotions = await this.prisma.coupons.findMany({
      where: { organizer_id: organizer.organizer_id },
      orderBy: { createdAt: "desc" },
      include: {
        events: {
          select: { title: true, },
        },
      },
    });

    return promotions;
  };
}