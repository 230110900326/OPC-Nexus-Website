import { IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import { HomepageConfigKind, HomepageContentType, HomepageModuleKey } from "../../database/entities/homepage-config.entity";

export class UpdateHomepageConfigDto {
  @IsOptional() @IsEnum(HomepageConfigKind) kind?: HomepageConfigKind;
  @IsOptional() @IsEnum(HomepageModuleKey) moduleKey?: HomepageModuleKey;
  @IsOptional() @IsString() @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(600) subtitle?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) targetUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string | null;
  @IsOptional() @IsString() @MaxLength(60) displayPosition?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsEnum(HomepageContentType) contentType?: HomepageContentType | null;
  @IsOptional() @IsUUID() contentId?: string | null;
  @IsOptional() @IsDateString() effectiveFrom?: string | null;
  @IsOptional() @IsDateString() effectiveTo?: string | null;
  @IsOptional() @IsBoolean() isOnline?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
