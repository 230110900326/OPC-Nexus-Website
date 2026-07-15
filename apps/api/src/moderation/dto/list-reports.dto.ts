import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { ReportStatus } from "../../database/entities/report.entity";
export class ListReportsDto { @IsOptional() @IsEnum(ReportStatus) status: ReportStatus = ReportStatus.PENDING; @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20; }
