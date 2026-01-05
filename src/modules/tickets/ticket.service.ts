import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTicketDTO } from "./dto/create-ticket.dto";

export class TicketService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createTicket = async (body: CreateTicketDTO, authUserId: number) => {
    // 1) pastikan user ini punya organizer profile
    const organizer = await this.prisma.organizers.findUnique({
      where: { user_id: authUserId },
      select: { organizer_id: true },
    });

    if (!organizer) {
      throw new ApiError("Organizer profile not found for this user.", 403);
    }

    // 2) pastikan event ada & milik organizer ini
    const event = await this.prisma.event.findFirst({
      where: {
        event_id: body.event_id,
        organizer_id: organizer.organizer_id,
      },
      select: { event_id: true },
    });

    if (!event) {
      throw new ApiError("Event not found or not owned by this organizer.", 404);
    }

    // 3) cegah duplicate ticket name dalam 1 event
    const existing = await this.prisma.tickets.findFirst({
      where: {
        event_id: body.event_id,
        name: { equals: body.name.trim(), mode: "insensitive" },
      },
      select: { ticket_id: true },
    });

    if (existing) {
      throw new ApiError("Ticket name already exists for this event.", 400);
    }

    // 4) create ticket
    const created = await this.prisma.tickets.create({
      data: {
        event_id: body.event_id,
        name: body.name.trim(),
        price: new Prisma.Decimal(body.price), // input integer juga aman
        stock: body.stock,
        description: body.description.trim(),
      },
      select: {
        ticket_id: true,
        event_id: true,
        name: true,
        price: true,
        stock: true,
        description: true,
        created_at: true,
      },
    });

    return {
      message: "Ticket created successfully!",
      data: created,
    };
  };

  getTicketsByEventId = async (eventId: string) => {
    const tickets = await this.prisma.tickets.findMany({
      where: { event_id: eventId },
      select: {
        ticket_id: true,
        event_id: true,
        name: true,
        price: true,
        stock: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { created_at: "asc" },
    });

    return { data: tickets };
  };

  getTicketById = async (ticketId: string) => {
    const ticket = await this.prisma.tickets.findUnique({
      where: { ticket_id: ticketId },
      select: {
        ticket_id: true,
        event_id: true,
        name: true,
        price: true,
        stock: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!ticket) throw new ApiError("Ticket not found.", 404);
    return { data: ticket };
  };
}