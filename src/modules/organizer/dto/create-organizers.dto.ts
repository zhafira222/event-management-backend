import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOrganizerDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  organization_name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}