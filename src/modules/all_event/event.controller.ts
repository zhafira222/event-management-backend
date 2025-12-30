import { Request, Response } from "express";
import { EventService } from "./event.service";
import { ApiError } from "../../utils/api-error";

export class EventController {
  eventService: EventService;
  constructor() {
    this.eventService = new EventService();
  }

  getEvents = async (req: Request, res: Response) => {
    const result = await this.eventService.getEvents();
    return res.status(200).send(result);
  };

  createEvent = async (req: Request, res: Response) => {
    const files = req.files as {[fieldname: string]: Express.Multer.File[]};
    const image = files.image[0];
    if(!image) throw new ApiError("image is required", 400);
    const result = await this.eventService.createEvent(req.body, image);
    return res.status(200).send(result);
  };
}
