import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { TransactionController } from "./transaction.controller";
import { CreateTransactionDTO } from "./dto/create-trasaction.dto";

export class TransactionRouter {
  router: Router;
  transactionController: TransactionController;
  jwttMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwttMiddleware = new JwtMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreateTransactionDTO),
      this.transactionController.createTransaction
    );
  };

  getRouter = () => {
    return this.router;
  };
}