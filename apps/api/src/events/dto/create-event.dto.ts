import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Max, MaxLength, Min, ValidateIf } from "class-validator";
import { EventRegistrationField, EventStatus } from "../../database/entities/event.entity";

export class CreateEventDto {
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(12000) description!: string;
  @IsString() @MaxLength(160) locationName!: string;
  @IsOptional() @IsString() @MaxLength(280) locationAddress?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsDateString() registrationDeadline?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) capacity?: number;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500) coverUrl?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) registrationFields?: EventRegistrationField[];
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
}
