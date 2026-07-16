import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AuditAction } from "../../database/entities/audit-log.entity";

export class ListAuditLogsDto {
  @IsOptional() @IsString() @MaxLength(254) actor?: string;
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}
