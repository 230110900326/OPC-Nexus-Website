import { IsEnum, IsOptional } from "class-validator";
import { EventRegistrationStatus } from "../../database/entities/event-registration.entity";
export class UpdateRegistrationDto { @IsOptional() @IsEnum(EventRegistrationStatus) status?: EventRegistrationStatus; @IsOptional() checkedIn?: boolean; }
