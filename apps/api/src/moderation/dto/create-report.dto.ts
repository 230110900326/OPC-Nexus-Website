import { IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";
import { ReportTargetType } from "../../database/entities/report.entity";
export class CreateReportDto { @IsEnum(ReportTargetType) targetType!: ReportTargetType; @IsUUID() targetId!: string; @IsString() @Length(2, 80) reason!: string; @IsOptional() @IsString() @Length(1, 1000) details?: string; }
