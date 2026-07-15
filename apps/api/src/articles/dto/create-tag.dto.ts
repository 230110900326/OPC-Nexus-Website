import { IsString, Length, Matches } from "class-validator";
export class CreateTagDto {
  @IsString() @Length(1, 80) name!: string;
  @IsString() @Length(1, 80) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
}
