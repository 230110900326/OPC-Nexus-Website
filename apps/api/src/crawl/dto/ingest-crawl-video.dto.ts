import { IsDateString, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from "class-validator";

export class IngestCrawlVideoDto {
  @IsUUID() sourceId!: string;
  @IsString() @MaxLength(240) title!: string;
  @IsUrl({ require_tld: false }) originalUrl!: string;
  @IsOptional() @IsUrl({ require_tld: false }) canonicalUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}
