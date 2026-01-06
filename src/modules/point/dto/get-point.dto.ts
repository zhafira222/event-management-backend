// src/modules/point/dto/get-point.dto.ts
import { IsIn, IsInt, IsOptional, IsUUID, Min, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";

export class GetPointDTO {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  take?: number = 10;

  @IsOptional()
  @IsIn(["created_at", "expires_at", "amount"])
  sortBy?: "created_at" | "expires_at" | "amount" = "created_at";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsUUID()
  transaction_id?: string;

  @IsOptional()
  @IsIn(["EARN", "REDEEM", "REFERRAL"])
  source?: "EARN" | "REDEEM" | "REFERRAL";

  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  activeOnly?: boolean;
}