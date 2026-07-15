import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Min } from "class-validator";

export class UpdateCategoryDto {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @Length(1, 80) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsUUID() parentId?: string | null;
}
