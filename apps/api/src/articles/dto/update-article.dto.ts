import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUrl, IsUUID, Length, ValidateNested } from "class-validator";
import { ArticleType } from "../../database/entities/article.entity";
import { ArticleSourceDto } from "./article-source.dto";

export class UpdateArticleDto {
  @IsOptional() @IsString() @Length(1, 180) slug?: string;
  @IsOptional() @IsString() @Length(1, 240) title?: string;
  @IsOptional() @IsString() @Length(1, 800) summary?: string;
  @IsOptional() @IsEnum(ArticleType) type?: ArticleType;
  @IsOptional() @IsUrl({ require_tld: false }) @Length(1, 1000) originalUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @Length(1, 500) coverImageUrl?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsUUID("4", { each: true }) tagIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => ArticleSourceDto) sources?: ArticleSourceDto[];
  @IsOptional() @IsString() @Length(1, 160) policyIssuer?: string | null;
  @IsOptional() @IsString() @Length(1, 100) policyNumber?: string | null;
  @IsOptional() @IsDateString() effectiveDate?: string | null;
  @IsOptional() @IsDateString() publishedAt?: string | null;
  @IsOptional() @IsString() @Length(1, 100) applicableRegion?: string | null;
  @IsOptional() @IsString() @Length(1, 40) policyStatus?: string | null;
  @IsOptional() @IsString() policyHighlights?: string | null;
  @IsOptional() @IsString() impactIndustries?: string | null;
}
