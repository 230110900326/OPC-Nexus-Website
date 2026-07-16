import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from "class-validator";
import { DemandBudgetRange, DemandContactType, DemandType } from "../../database/entities/opc-demand.entity";

export class DemandContactDto {
  @IsEnum(DemandContactType) type!: DemandContactType;
  @IsString() @Length(3, 60) value!: string;
}

export class CreateDemandDto {
  @IsString() @Length(2, 30) title!: string;
  @IsString() @Length(20, 10_000) content!: string;
  @IsEnum(DemandType) demandType!: DemandType;
  @IsEnum(DemandBudgetRange) budgetRange!: DemandBudgetRange;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsUUID(undefined, { each: true }) industryIds!: string[];
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => DemandContactDto) contactInfo!: DemandContactDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(1000, { each: true }) imageUrls?: string[];
  @IsOptional() @IsDateString() deadline?: string | null;
  @IsBoolean() agreeToRules = false;
}
