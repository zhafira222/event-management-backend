import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { PromotionService } from "./promotion.service";

export class PromotionController {
  promotionService: PromotionService;

  constructor() {
    this.promotionService = new PromotionService();
  }

  createPromotion = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files?.image?.[0];
    if (!image) throw new ApiError("image is required", 400);

    const authUserId = Number(res.locals.user.id);

    const result = await this.promotionService.createPromotion(
      req.body,
      image,
      authUserId
    );

    return res.status(200).send(result);
  };

  getPromotions = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);

    const result = await this.promotionService.getPromotions(authUserId);

    return res.status(200).send({
      message: "Get promotions success",
      data: result,
    });
  };

    getPromotionsPublic = async (req: Request, res: Response) => {
    const result = await this.promotionService.getPromotionsPublic();
    return res.status(200).send({
      message: "Get promotions success",
      data: result,
    });
  };

  validatePromotion = async (req: Request, res: Response) => {
    const code = req.query.code;
    const eventId = req.query.event_id;

    if (!code || typeof code !== "string") {
      throw new ApiError("code is required", 400);
    }

    if (!eventId || typeof eventId !== "string") {
      throw new ApiError("event_id is required", 400);
    }

    const result = await this.promotionService.validatePromotion(code, eventId);

    return res.status(200).send({
      message: "Promo is valid",
      data: result,
    });
  };

  getPromotionsByOrganizerId = async (req: Request, res: Response) => {
  const organizerId = Number(req.params.organizerId);
  if (!organizerId || Number.isNaN(organizerId)) {
    throw new ApiError("organizerId is invalid", 400);
  }

  const result = await this.promotionService.getPromotionsByOrganizerId(organizerId);

  return res.status(200).send({
    message: "Get promotions by organizer success",
    data: result,
  });
};
}