import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { CreateReviewDTO } from "./dto/create-review.dto";

export class ReviewController {
  reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  createReview = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);

    const result = await this.reviewService.createReview(
      req.body as CreateReviewDTO,
      authUserId
    );

    return res.status(200).send(result);
  };

  // OPTIONAL: untuk event detail page (public)
  getReviewsByEventId = async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    const result = await this.reviewService.getReviewsByEventId(eventId);
    return res.status(200).send({ message: "Get reviews success", data: result });
  };
}