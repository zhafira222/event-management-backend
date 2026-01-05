import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { TicketController } from "./ticket.controller";
import { CreateTicketDTO } from "./dto/create-ticket.dto";

export class TicketRouter {
  router: Router;
  ticketController: TicketController;
  jwttMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.ticketController = new TicketController();
    this.jwttMiddleware = new JwtMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    // create ticket (organizer only)
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateTicketDTO),
      this.ticketController.createTicket
    );

    // get tickets by event
    this.router.get("/event/:eventId", this.ticketController.getTicketsByEventId);

    // get ticket by id
    this.router.get("/:ticketId", this.ticketController.getTicketById);
  };

  getRouter = () => this.router;
}