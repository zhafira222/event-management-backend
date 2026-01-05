import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class CreateReviewDTO {
  @IsInt()
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsNotEmpty()
  comment!: string;

  @IsUUID()
  @IsNotEmpty()
  event_id!: string;

  @IsUUID()
  @IsNotEmpty()
  transaction_id!: string;
}