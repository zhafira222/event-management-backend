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
}