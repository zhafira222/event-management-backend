import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateTicketDTO {
  @IsUUID()
  @IsNotEmpty()
  event_id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Min(0)
  price!: number;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Min(1)
  stock!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;
}