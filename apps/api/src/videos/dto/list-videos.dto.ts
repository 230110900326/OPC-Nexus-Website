import { IsEnum, IsOptional, IsString } from "class-validator";
import { VideoPlatform } from "../../database/entities/creator-account.entity";
export class ListVideosDto { @IsOptional() @IsEnum(VideoPlatform) platform?: VideoPlatform; @IsOptional() @IsString() industry?: string; @IsOptional() @IsEnum(["latest", "hot"] as const) sort?: "latest" | "hot"; @IsOptional() @IsString() following?: string; }
