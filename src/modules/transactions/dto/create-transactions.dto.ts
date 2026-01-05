import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from "class-validator";
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

  @IsUUID()
  @IsOptional()
  coupon_id?: string;
}