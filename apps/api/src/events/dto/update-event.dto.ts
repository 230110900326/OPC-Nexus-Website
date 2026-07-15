import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from "class-validator";
import { EventRegistrationField, EventStatus } from "../../database/entities/event.entity";
export class UpdateEventDto {
  @IsOptional() @IsString() @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(12000) description?: string;
  @IsOptional() @IsString() @MaxLength(160) locationName?: string;
  @IsOptional() @IsString() @MaxLength(280) locationAddress?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsDateString() registrationDeadline?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100000) capacity?: number;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(500) coverUrl?: string;
  @IsOptional() @IsArray() registrationFields?: EventRegistrationField[];
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
}
