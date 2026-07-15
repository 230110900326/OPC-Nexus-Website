import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, Max, Min } from "class-validator";
import { EventStatus } from "../../database/entities/event.entity";
export class ListEventsDto { @IsOptional() @IsEnum(EventStatus) status?: EventStatus; @IsOptional() @IsString() q?: string; @IsOptional() @Type(() => Number) @Min(1) page = 1; @IsOptional() @Type(() => Number) @Min(1) @Max(100) limit = 20; }
