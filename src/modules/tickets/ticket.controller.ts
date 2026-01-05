import { Request, Response } from "express";
import { TicketService } from "./ticket.service";

export class TicketController {
  ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  createTicket = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const result = await this.ticketService.createTicket(req.body, authUserId);
    return res.status(200).send(result);
  };

  getTicketsByEventId = async (req: Request, res: Response) => {
    const eventId = req.params.eventId;
    const result = await this.ticketService.getTicketsByEventId(eventId);
    return res.status(200).send(result);
  };

  getTicketById = async (req: Request, res: Response) => {
    const ticketId = req.params.ticketId;
    const result = await this.ticketService.getTicketById(ticketId);
    return res.status(200).send(result);
  };
}