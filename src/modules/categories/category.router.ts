// src/modules/category/category.router.ts
import { Router } from "express";
import { CategoryController } from "./category.controller";

export class CategoryRouter {
  router: Router;
  categoryController: CategoryController;

  constructor() {
    this.router = Router();
    this.categoryController = new CategoryController();
    this.initRoutes();
  }

  private initRoutes = () => {
    this.router.get("/", this.categoryController.getCategories);
    this.router.get("/:id", this.categoryController.getCategoryById);
  };

  getRouter = () => this.router;
}