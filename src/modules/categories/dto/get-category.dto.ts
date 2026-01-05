// src/modules/category/dto/get-category.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Transform } from "class-transformer";

export class GetCategoryDTO {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(["category_id", "category_name", "category_field", "created_at"])
  sortBy?: "category_id" | "category_name" | "category_field" | "created_at" =
    "category_id";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "asc";
}