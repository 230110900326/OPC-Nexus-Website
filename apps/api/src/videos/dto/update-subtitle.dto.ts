import { IsEnum, IsOptional, IsString } from "class-validator";
import { SubtitleStatus } from "../../database/entities/video.entity";
export class UpdateSubtitleDto { @IsEnum(SubtitleStatus) status!: SubtitleStatus; @IsOptional() @IsString() source?: string; @IsOptional() @IsString() transcript?: string; }
