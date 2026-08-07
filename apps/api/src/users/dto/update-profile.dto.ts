import { IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateProfileDto {
  @IsOptional() @IsString() @Length(1, 500000) avatarUrl?: string;
  @IsOptional() @IsString() @Length(2, 8) displayName?: string;
  @IsOptional() @IsString() @Length(0, 280) bio?: string;
  @IsOptional() @IsString() @Length(1, 80) industry?: string;
  @IsOptional() @IsString() @Length(1, 120) company?: string;
  @IsOptional() @IsString() @Length(1, 80) jobTitle?: string;
}
