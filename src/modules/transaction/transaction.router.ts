// transaction.router.ts
import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionController } from "./transaction.controller";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto";
import { UploaderMiddleware } from "../../middlewares/upload.middleware"; // ✅ add

export class TransactionRouter {
  router: Router;
  transactionController: TransactionController;
  jwttMiddleware: JwtMiddleware;
  uploaderMiddleware: UploaderMiddleware; // ✅ add

  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwttMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware(); // ✅ add
    this.initRoutes();
  }

  private initRoutes = () => {
    // 1) create transaction
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateTransactionDTO),
      this.transactionController.createTransaction
    );

    // 2) upload payment proof (image)
    this.router.post(
      "/:transactionId/payment-proof",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.uploaderMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.transactionController.uploadPaymentProof
    );
  };

  getRouter = () => this.router;
}