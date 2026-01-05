// src/dto/create-promotion.dto.ts
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsInt,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreatePromotionDTO {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Min(1)
  discount_amount!: number;

  @IsString()
  @IsNotEmpty()
  discount_name!: string;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  quota!: number;

  @IsDateString()
  @IsNotEmpty()
  expires_at!: string;

  @IsUUID()
  @IsNotEmpty()
  event_id!: string;
}