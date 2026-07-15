import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { ArticleStatus, ArticleType } from "../../database/entities/article.entity";

export class ListArticlesDto {
  @IsOptional() @IsEnum(ArticleType) type?: ArticleType;
  @IsOptional() @IsEnum(ArticleStatus) status?: ArticleStatus;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Transform(({ value }) => ["hot", "recommended"].includes(value) ? value : "latest") sort: "latest" | "hot" | "recommended" = "latest";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 12;
}
