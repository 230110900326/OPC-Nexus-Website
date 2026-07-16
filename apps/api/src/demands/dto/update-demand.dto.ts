import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from "class-validator";
import { DemandBudgetRange, DemandType } from "../../database/entities/opc-demand.entity";
import { DemandContactDto } from "./create-demand.dto";

export class UpdateDemandDto {
  @IsOptional() @IsString() @Length(2, 30) title?: string;
  @IsOptional() @IsString() @Length(20, 10_000) content?: string;
  @IsOptional() @IsEnum(DemandType) demandType?: DemandType;
  @IsOptional() @IsEnum(DemandBudgetRange) budgetRange?: DemandBudgetRange;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsUUID(undefined, { each: true }) industryIds?: string[];
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => DemandContactDto) contactInfo?: DemandContactDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(1000, { each: true }) imageUrls?: string[];
  @IsOptional() @IsDateString() deadline?: string | null;
  @IsOptional() @IsBoolean() agreeToRules?: boolean;
}
