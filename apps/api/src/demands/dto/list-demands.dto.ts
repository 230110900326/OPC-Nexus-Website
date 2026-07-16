import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { DemandBudgetRange, DemandStatus, DemandType } from "../../database/entities/opc-demand.entity";

export enum DemandSort { LATEST = "latest", HOT = "hot", PINNED = "pinned" }
export enum DemandHotWindow { DAY = "24h", WEEK = "7d" }
export enum MyConnectDirection { SENT = "sent", RECEIVED = "received" }

export class ListDemandsDto {
  @IsOptional() @IsEnum(DemandType) demandType?: DemandType;
  @IsOptional() @IsEnum(DemandBudgetRange) budgetRange?: DemandBudgetRange;
  @IsOptional() @IsUUID() industryId?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsEnum(DemandSort) sort: DemandSort = DemandSort.LATEST;
  @IsOptional() @Transform(({ value }) => value === true || value === "true") @IsBoolean() activeOnly = false;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class ListMyDemandsDto {
  @IsOptional() @IsEnum(DemandStatus) status?: DemandStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export class MyConnectsDto {
  @IsOptional() @IsEnum(MyConnectDirection) direction: MyConnectDirection = MyConnectDirection.SENT;
}
