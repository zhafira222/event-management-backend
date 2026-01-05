import { Request, Response } from "express";
import { TransactionService } from "./transaction.service";

export class TransactionController {
  transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  createTransaction = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);

    const result = await this.transactionService.createTransaction(
      req.body,
      authUserId
    );

    return res.status(200).send(result);
  };
}