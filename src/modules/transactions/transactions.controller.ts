import { Request, Response, NextFunction } from "express";
import { createTransactionService } from "./transactions.service";

export const createTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = res.locals.user.id;
    const { ticket_id, qty } = req.body;

    if (!ticket_id || !qty) {
      return res.status(400).json({
        message: "ticket_id and qty are required",
      });
    }

    const data = await createTransactionService({
      userId,
      ticketId: ticket_id,
      qty,
    });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};
