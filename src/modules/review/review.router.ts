import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { ReviewController } from "./review.controller";
import { CreateReviewDTO } from "./dto/create-review.dto";

export class ReviewRouter {
  router: Router;
  reviewController: ReviewController;
  jwttMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.reviewController = new ReviewController();
    this.jwttMiddleware = new JwtMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    // create review (login required)
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateReviewDTO),
      this.reviewController.createReview
    );

    // OPTIONAL: list reviews per event (public)
    this.router.get("/event/:eventId", this.reviewController.getReviewsByEventId);
  };

  getRouter = () => {
    return this.router;
  };
}