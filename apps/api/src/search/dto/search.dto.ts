import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
export enum SearchContentType { ALL = "all", ARTICLE = "article", VIDEO = "video", POST = "post" }
export class SearchDto {
  @IsString() @MinLength(1) q!: string;
  @IsOptional() @IsEnum(SearchContentType) type: SearchContentType = SearchContentType.ALL;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 12;
}
