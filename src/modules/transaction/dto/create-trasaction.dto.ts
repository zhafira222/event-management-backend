// src/modules/transaction/dto/create-transaction.dto.ts
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Transform } from "class-transformer";

export class CreateTransactionDTO {
  @IsUUID()
  @IsNotEmpty()
  ticket_id!: string;

  @IsUUID()
  @IsNotEmpty()
  event_id!: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(1)
  qty?: number;

  @IsString()
  @IsOptional()
  coupon_code?: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @Min(0)
  points_used?: number;
}