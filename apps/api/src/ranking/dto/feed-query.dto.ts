import { IsEnum, IsOptional, IsString } from "class-validator";
export enum FeedMode { RECOMMENDED = "recommended", LATEST = "latest", HOT = "hot", FOLLOWING = "following" }
export enum RankScope { ALL = "all", NEWS = "news", POLICY = "policy", VIDEO = "video", COMMUNITY = "community", DEMAND = "demand" }
export enum RankWindow { DAY = "24h", WEEK = "7d", MONTH = "30d" }
export class FeedQueryDto { @IsOptional() @IsEnum(FeedMode) mode: FeedMode = FeedMode.RECOMMENDED; @IsOptional() @IsEnum(RankScope) scope: RankScope = RankScope.ALL; @IsOptional() @IsEnum(RankWindow) window: RankWindow = RankWindow.WEEK; @IsOptional() @IsString() industry?: string; }
