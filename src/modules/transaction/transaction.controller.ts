import { Request, Response } from "express";
import { TransactionService } from "./transaction.service";
import { ApiError } from "../../utils/api-error";

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

   getMyTransactions = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);

    const result = await this.transactionService.getMyTransactions(
      req.query as any,
      authUserId
    );

    return res.status(200).send({
      message: "Get my transactions success",
      ...result,
    });
  };

  getTransactionById = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const transactionId = req.params.transactionId;

    const trx = await this.transactionService.getTransactionById(
      transactionId,
      authUserId
    );

    return res.status(200).send({ data: trx });
  };

  uploadPaymentProof = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const transactionId = req.params.transactionId;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const image = files?.image?.[0];
    if (!image) throw new ApiError("image is required", 400);

    const result = await this.transactionService.uploadPaymentProof(
      transactionId,
      image,
      authUserId
    );

    return res.status(200).send(result);
  };
}