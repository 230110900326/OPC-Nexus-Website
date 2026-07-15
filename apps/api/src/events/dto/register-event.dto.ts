import { IsObject, IsOptional } from "class-validator";
export class RegisterEventDto { @IsOptional() @IsObject() formData?: Record<string, string>; }
