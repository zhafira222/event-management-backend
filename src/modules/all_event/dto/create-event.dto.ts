// src/dto/create-event.dto.ts
import { IsDateString, IsInt, IsNotEmpty, IsString } from "class-validator";

import { Transform } from "class-transformer";

export class CreateEventDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsDateString()
  @IsNotEmpty()
  start_date!: string;

  @IsDateString()
  @IsNotEmpty()
  end_date!: string;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  category_id!: number;

  @IsNotEmpty()
  @IsString()
  tickets!: string;
}
