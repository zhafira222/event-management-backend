import { Router } from "express";
import { JwtMiddleware } from "../../middlewares/jwtt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { PointController } from "./point.controller";
import { CreatePointDTO } from "./dto/create-point.dto";

export class PointRouter {
  router: Router;
  pointController: PointController;
  jwttMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.pointController = new PointController();
    this.jwttMiddleware = new JwtMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    // semua butuh login
    this.router.get(
      "/balance",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.pointController.getBalance
    );

    this.router.get(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.pointController.getPoints
    );

    // create manual (EARN / REDEEM) + update points_balance
    this.router.post(
      "/",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      validateBody(CreatePointDTO),
      this.pointController.createPoint
    );

    // optional: auto-award dari trx PAID
    this.router.post(
      "/award",
      this.jwttMiddleware.verifyToken(process.env.JWT_SECRET!),
      this.pointController.awardFromPaidTransaction
    );
  };

  getRouter = () => this.router;
}