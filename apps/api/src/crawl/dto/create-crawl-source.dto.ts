import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from "class-validator";
import { CrawlAuthorizationStatus, CrawlFetchMethod, CrawlSourceType } from "../../database/entities/crawl-source.entity";
export class CreateCrawlSourceDto {
  @IsString() @MaxLength(160) name!: string;
  @IsString() @MaxLength(255) domain!: string;
  @IsEnum(CrawlSourceType) type!: CrawlSourceType;
  @IsEnum(CrawlFetchMethod) fetchMethod!: CrawlFetchMethod;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(10080) scheduleMinutes?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) trustLevel?: number;
  @IsOptional() @IsEnum(CrawlAuthorizationStatus) authorizationStatus?: CrawlAuthorizationStatus;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) keywords?: string[];
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(1000) entryUrl?: string;
}
