import { IsIn, IsString, Length } from "class-validator";
import { ReportStatus } from "../../database/entities/report.entity";
export class ResolveReportDto { @IsIn([ReportStatus.RESOLVED, ReportStatus.REJECTED]) status!: ReportStatus.RESOLVED | ReportStatus.REJECTED; @IsIn(["none", "hide", "ban"]) action!: "none" | "hide" | "ban"; @IsString() @Length(2, 500) resolution!: string; }
