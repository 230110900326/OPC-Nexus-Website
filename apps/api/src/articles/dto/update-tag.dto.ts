import { IsOptional, IsString, Length, Matches } from "class-validator";
export class UpdateTagDto {
  @IsOptional() @IsString() @Length(1, 80) name?: string;
  @IsOptional() @IsString() @Length(1, 80) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug?: string;
}
