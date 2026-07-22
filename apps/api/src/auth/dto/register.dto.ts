import { IsEmail, IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @Length(5, 254)
  email!: string;

  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, { message: "密码需同时包含字母和数字" })
  password!: string;

  @IsString()
  @Length(2, 60)
  displayName!: string;

  @IsOptional()
  @IsString()
  @IsIn(["user", "researcher"])
  role?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  company?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  industry?: string;

  @IsOptional()
  @IsString()
  @Length(10, 280)
  bio?: string;
}
