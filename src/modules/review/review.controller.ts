import { Request, Response } from "express";
import { ReviewService } from "./review.service";
import { CreateReviewDTO } from "./dto/create-review.dto";
import { ApiError } from "../../utils/api-error";

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

  getReviewsByEventId = async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    const result = await this.reviewService.getReviewsByEventId(eventId);
    return res.status(200).send({ message: "Get reviews success", data: result });
  };

  getReviewsByOrganizerId = async (req: Request, res: Response) => {
    const organizerId = Number(req.params.organizerId);
    if (!organizerId || Number.isNaN(organizerId)) {
      throw new ApiError("organizerId must be a number", 400);
    }

    const take = req.query.take ? Number(req.query.take) : 6;
    const result = await this.reviewService.getReviewsByOrganizerId(
      organizerId,
      take
    );

    return res.status(200).send({
      message: "Get reviews by organizer success",
      data: result,
    });
  };
}