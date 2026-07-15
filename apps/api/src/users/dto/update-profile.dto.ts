import { IsOptional, IsString, IsUrl, Length } from "class-validator";

export class UpdateProfileDto {
  @IsOptional() @IsUrl({ require_protocol: true }) @Length(1, 500) avatarUrl?: string;
  @IsOptional() @IsString() @Length(2, 60) displayName?: string;
  @IsOptional() @IsString() @Length(0, 280) bio?: string;
  @IsOptional() @IsString() @Length(1, 80) industry?: string;
  @IsOptional() @IsString() @Length(1, 120) company?: string;
  @IsOptional() @IsString() @Length(1, 80) jobTitle?: string;
}
