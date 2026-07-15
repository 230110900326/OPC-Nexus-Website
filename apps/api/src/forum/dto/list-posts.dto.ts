import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
export class ListPostsDto {
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Transform(({ value }) => ["hot", "featured"].includes(value) ? value : "latest") sort: "latest" | "hot" | "featured" = "latest";
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
