// src/modules/category/category.controller.ts
import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { GetCategoryDTO } from "./dto/get-category.dto";
import { CategoryService } from "./category.service";

export class CategoryController {
  categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getCategories = async (req: Request, res: Response) => {
    const query = plainToInstance(GetCategoryDTO, req.query);
    const result = await this.categoryService.getCategories(query);
    return res.status(200).send(result);
  };

  getCategoryById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      throw new ApiError("Invalid category id.", 400);
    }

    const result = await this.categoryService.getCategoryById(id);
    return res.status(200).send(result);
  };
}