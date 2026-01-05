import { Router } from "express";
import { PromotionController } from "./promotion.controller";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { CreatePromotionDTO } from "./dto/create-promotion.dto";

export class PromotionRouter {
  router: Router;
  promotionController: PromotionController;
  jwttMiddleware: JwtMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.promotionController = new PromotionController();
    this.jwttMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    // create promotion (requires login + image upload)
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploaderMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      validateBody(CreatePromotionDTO),
      this.promotionController.createPromotion
    );

    // get promotions (requires login)
    this.router.get(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.promotionController.getPromotions
    );
  };

  getRouter = () => {
    return this.router;
  };
}