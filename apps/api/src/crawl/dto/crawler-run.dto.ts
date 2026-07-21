import { Type } from "class-transformer";
import { IsArray, IsDateString, IsInt, IsObject, IsOptional, IsString, IsUrl, IsUUID, Max, MaxLength, Min, ValidateNested } from "class-validator";

export class CrawledArticleDto {
  @IsString() @MaxLength(240) title!: string;
  @IsString() content!: string;
  @IsUrl({ require_tld: false }) originalUrl!: string;
  @IsOptional() @IsUrl({ require_tld: false }) canonicalUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverImageUrl?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsObject() agentAnalysis?: Record<string, unknown>;
}

export class CrawledVideoDto {
  @IsString() @MaxLength(240) title!: string;
  @IsUrl({ require_tld: false }) originalUrl!: string;
  @IsOptional() @IsUrl({ require_tld: false }) canonicalUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
}

export class CrawlerRunDto {
  @IsUUID() sourceId!: string;
  @IsDateString() startedAt!: string;
  @IsDateString() finishedAt!: string;
  @IsInt() @Min(0) @Max(86_400_000) durationMs!: number;
  @IsArray() @IsUrl({ require_tld: false }, { each: true }) discoveredUrls!: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CrawledArticleDto) articles!: CrawledArticleDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CrawledVideoDto) videos!: CrawledVideoDto[];
  @IsOptional() @IsInt() @Min(0) @Max(100_000) filteredCount?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000) batchDuplicateCount?: number;
  @IsOptional() @IsString() @MaxLength(40) agentVersion?: string;
  @IsOptional() @IsString() @MaxLength(2000) errorMessage?: string;
}

export class RunCrawlNowDto {
  @IsOptional() @IsUUID() sourceId?: string;
}
