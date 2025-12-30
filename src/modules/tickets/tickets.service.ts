import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";

/*
 * CREATE TICKET
 * Only organizer can create ticket for their own event
 */
export const createTicketService = async (
  organizerUserId: number,
  body: {
    event_id: string;
    name: string;
    price: number;
    stock: number;
    description: string;
  }
) => {
  // Cari organizer berdasarkan user login
  const organizer = await prisma.organizers.findUnique({
    where: { user_id: organizerUserId },
  });

  if (!organizer) {
    throw new ApiError("Organizer not found", 404);
  }

  // Mastiin event milik organizer tsb
  const event = await prisma.events.findFirst({
    where: {
      event_id: body.event_id,
      organizer_id: organizer.organizer_id,
    },
  });

  if (!event) {
    throw new ApiError("Event not found or not yours", 403);
  }

  // Create ticket
  const ticket = await prisma.tickets.create({
    data: {
      event_id: body.event_id,
      name: body.name,
      price: body.price,
      stock: body.stock,
      description: body.description,
    },
  });

  return ticket;
};
