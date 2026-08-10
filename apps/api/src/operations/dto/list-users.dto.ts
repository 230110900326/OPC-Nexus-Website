import { IsEnum, IsNumberString, IsOptional, IsString } from "class-validator";
import { SystemRole } from "../../database/entities/role.entity";

export class ListUsersDto {
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(SystemRole) role?: SystemRole;
  @IsOptional() @IsEnum(["active", "banned", "pending"]) status?: "active" | "banned" | "pending";
}
