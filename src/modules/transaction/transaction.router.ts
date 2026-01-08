import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionController } from "./transaction.controller";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";

export class TransactionRouter {
  router: Router;
  transactionController: TransactionController;
  jwttMiddleware: JwtMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwttMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get(
      "/me",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.transactionController.getMyTransactions
    );

    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateTransactionDTO),
      this.transactionController.createTransaction
    );

    this.router.post(
      "/:transactionId/payment-proof",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploaderMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.transactionController.uploadPaymentProof
    );

    this.router.get(
      "/:transactionId",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.transactionController.getTransactionById
    );
  };

  getRouter = () => this.router;
}