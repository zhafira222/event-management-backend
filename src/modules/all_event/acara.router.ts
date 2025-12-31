import { Router } from "express";
import { AcaraController } from "./acara.controller";
import { UploaderMiddleware } from "../../middlewares/upload.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateAcaraDTO } from "./dto/create-acara.dto";

export class AcaraRouter {
  router: Router;
  acaraController: AcaraController;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.acaraController = new AcaraController();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.acaraController.getAcaras),
      validateBody(CreateAcaraDTO),
      this.router.post(
        "/",
        this.uploaderMiddleware
          .upload()
          .fields([{ name: "image", maxCount: 1 }]),
        this.acaraController.createAcara
      );
  };

  getRouter = () => {
    return this.router;
  };
}
