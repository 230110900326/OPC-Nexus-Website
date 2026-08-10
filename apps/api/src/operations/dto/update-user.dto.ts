import { IsBoolean, IsEnum, IsOptional, IsString, Length } from "class-validator";
import { SystemRole } from "../../database/entities/role.entity";

export class UpdateUserDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsEnum(SystemRole, { each: true }) roles?: SystemRole[];
  @IsOptional() @IsString() @Length(0, 500) banReason?: string;
}
