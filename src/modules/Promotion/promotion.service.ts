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

  private decimalToNumber(value: any) {
    if (value?.toNumber) return value.toNumber();
    return Number(value);
  }

  createPromotion = async (
    body: CreatePromotionDTO,
    image: Express.Multer.File,
    authUserId: number
  ) => {
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: authUserId },
      select: { organizer_id: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer profile not found for this user.", 403);
    }

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

    const existingByName = await this.prisma.coupons.findFirst({
      where: { discount_name: body.discount_name },
      select: { coupon_id: true },
    });

    if (existingByName) {
      throw new ApiError("The promotion name already exists.", 400);
    }

    const existingByCode = await this.prisma.coupons.findFirst({
      where: { code: body.code },
      select: { coupon_id: true },
    });

    if (existingByCode) {
      throw new ApiError("The promo code already exists.", 400);
    }

    const { secure_url } = await this.cloudinaryService.upload(image);

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

  validatePromotion = async (code: string, eventId: string) => {
    const now = new Date();

    const coupon = await this.prisma.coupons.findFirst({
      where: {
        event_id: eventId,
        code: { equals: code.trim(), mode: "insensitive" },
      },
      select: {
        coupon_id: true,
        code: true,
        discount_name: true,
        discount_amount: true,
        quota: true,
        expires_at: true,
        event_id: true,
      },
    });

    if (!coupon) {
      throw new ApiError("Promo code not found for this event.", 404);
    }

    if (coupon.expires_at.getTime() < now.getTime()) {
      throw new ApiError("Promo code is expired.", 400);
    }

    if (coupon.quota <= 0) {
      throw new ApiError("Promo quota has been used up.", 400);
    }

    return {
      coupon_id: coupon.coupon_id,
      code: coupon.code,
      discount_name: coupon.discount_name,
      discount_amount: this.decimalToNumber(coupon.discount_amount),
      expires_at: coupon.expires_at,
      event_id: coupon.event_id,
    };
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
      select: {
        coupon_id: true,
        code: true,
        discount_name: true,
        discount_amount: true,
        expires_at: true,
        event_id: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        events: { select: { title: true, start_date: true, end_date: true } },
      },
    });

    return promotions.map((p) => ({
      ...p,
      discount_amount: this.decimalToNumber(p.discount_amount),
    }));
  };
}