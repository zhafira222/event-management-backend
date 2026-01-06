// src/modules/point/dto/create-point.dto.ts
import { IsIn, IsInt, IsISO8601, IsOptional, IsUUID, Min, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";

export class CreatePointDTO {
  @IsInt()
  @Transform(({ value }) => Number(value))
  @Min(1)
  amount!: number;

  // EARN = poin masuk karena transaksi PAID
  // REDEEM = poin dipakai (akan disimpan negatif)
  // REFERRAL = poin masuk karena referral
  @IsIn(["EARN", "REDEEM", "REFERRAL"])
  source!: "EARN" | "REDEEM" | "REFERRAL";

  // wajib kalau EARN/REDEEM, optional kalau REFERRAL
  @ValidateIf((o) => o.source === "EARN" || o.source === "REDEEM")
  @IsUUID()
  transaction_id?: string;

  // optional; kalau tidak dikirim akan auto now + 3 months (untuk EARN/REFERRAL)
  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}