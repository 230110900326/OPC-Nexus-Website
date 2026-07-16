import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from "class-validator";
import { VideoPlatform } from "../../database/entities/creator-account.entity";
export class CreateCreatorAccountDto { @IsUUID() creatorId!: string; @IsEnum(VideoPlatform) platform!: VideoPlatform; @IsString() @MaxLength(160) platformAccountId!: string; @IsString() @MaxLength(160) displayName!: string; @IsUrl({ require_tld: false }) profileUrl!: string; @IsOptional() @IsBoolean() isEnabled?: boolean; }
