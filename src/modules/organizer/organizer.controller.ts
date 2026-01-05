import { Request, Response, NextFunction } from "express";
import { rejectTransactionService } from "./organizer.service";

/*
 * REJECT TRANSACTION (CONTROLLER)
 */
export const rejectTransactionController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const result = await rejectTransactionService(id);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
