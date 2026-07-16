import { IsDateString, IsOptional, IsUUID } from "class-validator";
export class DemandDashboardQueryDto { @IsOptional() @IsDateString() from?: string; @IsOptional() @IsDateString() to?: string; @IsOptional() @IsUUID() industryId?: string; }
