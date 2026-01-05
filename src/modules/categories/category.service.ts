// src/modules/category/category.service.ts
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { GetCategoryDTO } from "./dto/get-category.dto";

export class CategoryService {
  prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  getCategories = async (query: GetCategoryDTO) => {
    const { search, sortBy = "category_id", sortOrder = "asc" } = query;

    const whereClause: Prisma.categoriesWhereInput = {};

    if (search) {
      whereClause.OR = [
        { category_name: { contains: search, mode: "insensitive" } },
        { category_field: { contains: search, mode: "insensitive" } },
      ];
    }

    const data = await this.prisma.categories.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      select: {
        category_id: true,
        category_name: true,
        category_field: true,
        created_at: true,
        updated_at: true,
      },
    });

    return { data };
  };

  getCategoryById = async (id: number) => {
    const category = await this.prisma.categories.findUnique({
      where: { category_id: id },
      select: {
        category_id: true,
        category_name: true,
        category_field: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!category) throw new ApiError("Category not found.", 404);

    return { data: category };
  };
}