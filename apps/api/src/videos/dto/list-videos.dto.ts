import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { VideoPlatform } from "../../database/entities/creator-account.entity";
export class ListVideosDto {
  @IsOptional() @IsEnum(VideoPlatform) platform?: VideoPlatform;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsEnum(["latest", "hot", "relevant"] as const) sort?: "latest" | "hot" | "relevant";
  @IsOptional() @IsString() following?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
