import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { DemandBudgetRange, DemandStatus, DemandType } from "../../database/entities/opc-demand.entity";

export class AdminDemandQueryDto {
  @IsOptional() @IsEnum(DemandStatus) status?: DemandStatus;
  @IsOptional() @IsEnum(DemandType) demandType?: DemandType;
  @IsOptional() @IsEnum(DemandBudgetRange) budgetRange?: DemandBudgetRange;
  @IsOptional() @IsUUID() industryId?: string;
  @IsOptional() @IsString() @MaxLength(254) author?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 30;
}

export class AdminConnectQueryDto {
  @IsOptional() @IsUUID() demandId?: string;
  @IsOptional() @IsString() @MaxLength(254) user?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 50;
}
