import { Router } from "express";
import { EventController } from "./event.controller";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateEventDTO } from "./dto/create-event.dto";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";

export class EventRouter {
  router: Router;
  eventController: EventController;
  jwttMiddleware: JwtMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.eventController = new EventController();
    this.jwttMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploaderMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      validateBody(CreateEventDTO),
      this.eventController.createEvent
    );

    this.router.get("/", this.eventController.getEvents);
    this.router.get("/:slug", this.eventController.getEventBySlug);
  };

  getRouter = () => {
    return this.router;
  };
}
