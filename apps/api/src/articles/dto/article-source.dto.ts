import { IsBoolean, IsOptional, IsString, IsUrl, Length } from "class-validator";

export class ArticleSourceDto {
  @IsString() @Length(1, 160) name!: string;
  @IsUrl({ require_tld: false }) @Length(1, 1000) url!: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
