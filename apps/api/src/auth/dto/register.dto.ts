import { IsEmail, IsString, Length, Matches } from "class-validator";

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
}
