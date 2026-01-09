import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Transform } from "class-transformer";

export class GetEventDTO {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  take: number = 9;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  category_id?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  organizer_id?: number;

  @IsOptional()
  @IsIn(["created_at", "title", "start_date", "end_date", "category_id"])
  sortBy: "created_at" | "title" | "start_date" | "end_date" | "category_id" =
    "created_at";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}
