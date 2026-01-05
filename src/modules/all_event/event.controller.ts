import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { GetEventDTO } from "./dto/get-event.dto";
import { EventService } from "./event.service";

export class EventController {
  eventService: EventService;
  constructor() {
    this.eventService = new EventService();
  }

  createEvent = async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files.image?.[0];

    if (!image) throw new ApiError("image is required", 400);

    const authUserId = Number(res.locals.user.id);

    const result = await this.eventService.createEvent(
      req.body,
      image,
      authUserId
    );
    return res.status(200).send(result);
  };

  getEvents = async (req: Request, res: Response) => {
    const query = plainToInstance(GetEventDTO, req.query);
    const result = await this.eventService.getEvents(query);
    return res.status(200).send(result);
  };
 
  getEventBySlug = async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const result = await this.eventService.getEventBySlug(slug);
    return res.status(200).send(result);
  };
  
}
