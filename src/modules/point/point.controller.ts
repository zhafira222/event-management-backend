import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { CreatePointDTO } from "./dto/create-point.dto";
import { GetPointDTO } from "./dto/get-point.dto";
import { PointService } from "./point.service";

export class PointController {
  pointService: PointService;

  constructor() {
    this.pointService = new PointService();
  }

  getBalance = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const result = await this.pointService.getBalance(authUserId);
    return res.status(200).send(result);
  };

  getPoints = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const query = plainToInstance(GetPointDTO, req.query);
    const result = await this.pointService.getPoints(authUserId, query);
    return res.status(200).send({ message: "Get points success", ...result });
  };

  createPoint = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const body = plainToInstance(CreatePointDTO, req.body);
    const result = await this.pointService.createPoint(body, authUserId);
    return res.status(200).send(result);
  };

  // optional endpoint: award points from PAID trx
  awardFromPaidTransaction = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const { transaction_id } = req.body as { transaction_id?: string };

    if (!transaction_id) {
      return res.status(400).send({ message: "transaction_id is required" });
    }

    const result = await this.pointService.awardFromPaidTransaction(transaction_id, authUserId);
    return res.status(200).send(result);
  };
}