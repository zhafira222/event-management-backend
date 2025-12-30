import { Router } from "express";
import { EventController } from "./event.controller";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateEventDTO } from "./dto/create-event.dto";

export class EventRouter {
  router: Router;
  eventController: EventController;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.eventController = new EventController();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.eventController.getEvents),
      validateBody(CreateEventDTO),
      this.router.post(
        "/",
        this.uploaderMiddleware
          .upload()
          .fields([{ name: "image", maxCount: 1 }]),
        this.eventController.createEvent
      );
  };

  getRouter = () => {
    return this.router;
  };
}
