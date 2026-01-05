import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsPhoneNumber,
} from "class-validator";

export class RegisterDTO {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  @IsNotEmpty()
  @IsString()
  phone_number!: string;

  @IsOptional()
  @IsString()
  referral_code?: string;

  @IsOptional()
  @IsInt()
  referrer_id?: number;

}