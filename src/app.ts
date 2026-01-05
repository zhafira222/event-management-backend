import "dotenv/config";
import "reflect-metadata";
import cors from "cors";
import express, { Express } from "express";
import { PORT } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";

import { EventRouter } from "./modules/all_event/event.router";
import { AuthRouter } from "./modules/auth/auth.router";
import { PromotionRouter } from "./modules/Promotion/promotion.router";
import { TransactionRouter } from "./modules/transaction/transaction.router";
import { ReviewRouter } from "./modules/review/review.router";
import { CategoryRouter } from "./modules/categories/category.router";
import { TicketRouter } from "./modules/tickets/ticket.router";

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use("/uploads", express.static("uploads"));
  }

  private routes() {
  const authRouter = new AuthRouter();
    const eventRouter = new EventRouter();
    const categoryRouter = new CategoryRouter();
    const ticketRouter = new TicketRouter();
    const promotionRouter = new PromotionRouter();
    const transactionRouter = new TransactionRouter();
    const reviewRouter = new ReviewRouter();

    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/events", eventRouter.getRouter());
    this.app.use("/categories", categoryRouter.getRouter());
    this.app.use("/tickets", ticketRouter.getRouter());
    this.app.use("/promotions", promotionRouter.getRouter());
    this.app.use("/transactions", transactionRouter.getRouter());
    this.app.use("/reviews", reviewRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}
