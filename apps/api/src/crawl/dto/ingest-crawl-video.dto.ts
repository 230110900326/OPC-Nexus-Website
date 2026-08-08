import { IsDateString, IsInt, IsObject, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from "class-validator";

export class IngestCrawlVideoDto {
  @IsUUID() sourceId!: string;
  @IsString() @MaxLength(240) title!: string;
  @IsUrl({ require_tld: false }) originalUrl!: string;
  @IsOptional() @IsUrl({ require_tld: false }) canonicalUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsInt() @Min(0) durationSeconds?: number;
  @IsOptional() @IsObject() platformMetrics?: Record<string, number>;
}
