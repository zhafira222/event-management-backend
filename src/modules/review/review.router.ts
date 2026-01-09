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
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateReviewDTO),
      this.reviewController.createReview
    );

    this.router.get("/event/:eventId", this.reviewController.getReviewsByEventId);

    this.router.get(
      "/organizer/:organizerId",
      this.reviewController.getReviewsByOrganizerId
    );
  };

  getRouter = () => this.router;
}