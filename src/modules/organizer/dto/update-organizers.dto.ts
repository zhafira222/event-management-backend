import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateOrganizerDTO {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  organization_name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}