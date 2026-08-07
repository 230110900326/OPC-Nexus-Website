import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
export enum FeedMode { RECOMMENDED = "recommended", LATEST = "latest", HOT = "hot", FOLLOWING = "following" }
export enum RankScope { ALL = "all", NEWS = "news", POLICY = "policy", VIDEO = "video", COMMUNITY = "community", DEMAND = "demand" }
export enum RankWindow { DAY = "24h", WEEK = "7d", MONTH = "30d" }
export class FeedQueryDto { @IsOptional() @IsEnum(FeedMode) mode: FeedMode = FeedMode.RECOMMENDED; @IsOptional() @IsEnum(RankScope) scope: RankScope = RankScope.ALL; @IsOptional() @IsEnum(RankWindow) window: RankWindow = RankWindow.WEEK; @IsOptional() @IsString() industry?: string; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number = 20; }
