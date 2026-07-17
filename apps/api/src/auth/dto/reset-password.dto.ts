import { IsString, IsUUID, Length, Matches } from "class-validator";

export class ResetPasswordDto {
  @IsString()
  @Length(64, 128)
  token!: string;

  @IsUUID("4")
  userId!: string;

  @IsString()
  @Length(8, 72)
  @Matches(/(?=.*[a-zA-Z])(?=.*\d)/, { message: "密码需同时包含字母和数字" })
  password!: string;
}
