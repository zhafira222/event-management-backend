import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";

interface CreateTransactionPayload {
  userId: number;
  ticketId: string;
  qty: number;
}

export const createTransactionService = async ({
  userId,
  ticketId,
  qty,
}: CreateTransactionPayload) => {
  return await prisma.$transaction(async (tx) => {
    // cek ticket
    const ticket = await tx.tickets.findUnique({
      where: { ticket_id: ticketId },
      include: {
        events: true,
      },
    });

    if (!ticket) throw new ApiError("Ticket not found", 404);

    // cek stok
    if (ticket.stock < qty) {
      throw new ApiError("Not enough ticket stock", 400);
    }

    // buat transaksi
    const now = new Date();
    const price = Number(ticket.price);

const paymentDeadline = new Date(now);
paymentDeadline.setHours(paymentDeadline.getHours() + 1);

const confirmationDeadline = new Date(now);
confirmationDeadline.setDate(confirmationDeadline.getDate() + 1);

const transaction = await tx.transactions.create({
  data: {
    user_id: userId,
    event_id: ticket.event_id, 
    ticket_id: ticketId,
    qty,
    base_price_at_time_buy: ticket.price, 
    total_price: price * qty,
    payment_deadline: paymentDeadline, 
    confirmation_deadline: confirmationDeadline, 
    status: "pending",
  },
});

    // kurangi stok ticket
    await tx.tickets.update({
      where: { ticket_id: ticketId },
      data: {
        stock: { decrement: qty },
      },
    });

    return {
      transaction_id: transaction.transaction_id,
      status: transaction.status,
      total_price: transaction.total_price,
    };
  });
};
