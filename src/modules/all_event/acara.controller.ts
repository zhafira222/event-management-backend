import { Request, Response } from "express";
import { AcaraService } from "./acara.service";
import { ApiError } from "../../utils/api-error";

export class AcaraController {
  acaraService: AcaraService;
  constructor() {
    this.acaraService = new AcaraService();
  }

  getAcaras = async (req: Request, res: Response) => {
    const result = await this.acaraService.getAcaras();
    return res.status(200).send(result);
  };

  createAcara = async (req: Request, res: Response) => {
    const files = req.files as {[fieldname: string]: Express.Multer.File[]};
    const image = files.image[0];
    if(!image) throw new ApiError("image is required", 400);
    const result = await this.acaraService.createAcara(req.body, image);
    return res.status(200).send(result);
  };
}
