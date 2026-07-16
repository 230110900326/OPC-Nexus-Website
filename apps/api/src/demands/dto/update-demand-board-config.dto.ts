import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class UpdateDemandBoardConfigDto {
  @IsOptional() @IsString() @Length(2, 180) bannerTitle?: string;
  @IsOptional() @IsString() @Length(2, 600) bannerSubtitle?: string;
  @IsOptional() @IsString() @Length(20, 10_000) rulesText?: string;
  @IsOptional() @IsString() @Length(20, 10_000) disclaimer?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) prohibitedKeywords?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(100) normalDailyLimit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) verifiedDailyLimit?: number;
  @IsOptional() @IsInt() @Min(1) @Max(200) connectDailyLimit?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) maxPinned?: number;
  @IsOptional() @IsBoolean() allowPhone?: boolean;
}
