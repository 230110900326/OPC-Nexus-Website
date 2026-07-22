import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import { CookieOptions, Response, Request } from "express";
import { AuthenticatedUser } from "./authenticated-user.decorator";
import { AuthService } from "./auth.service";
import { AuthUser } from "./auth-user.interface";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() input: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.respondWithSession(await this.auth.register(input), response);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() input: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.respondWithSession(await this.auth.login(input), response);
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(@Res({ passthrough: true }) response: Response, @Req() request: Request) {
    return this.respondWithSession(await this.auth.refresh(request.cookies?.refresh_token), response);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@AuthenticatedUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(user.id);
    response.clearCookie("refresh_token", this.cookieOptions());
    return { success: true, data: { loggedOut: true } };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@AuthenticatedUser() user: AuthUser) {
    return { success: true, data: this.auth.publicUser(await this.auth.getProfile(user.id)) };
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() input: ForgotPasswordDto) {
    const result = await this.auth.forgotPassword(input.email);
    return { success: true, data: result };
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() input: ResetPasswordDto) {
    await this.auth.resetPassword(input);
    return { success: true, data: { message: "密码已重置，请返回登录。" } };
  }

  private respondWithSession(session: Awaited<ReturnType<AuthService["login"]>>, response: Response) {
    response.cookie("refresh_token", session.refreshToken, this.cookieOptions());
    return { success: true, data: { accessToken: session.accessToken, user: session.user } };
  }

  private cookieOptions(): CookieOptions {
    const configuredSecure = this.config.get<boolean | string>("COOKIE_SECURE");
    const secure = configuredSecure === undefined ? this.config.get<string>("NODE_ENV") === "production" : configuredSecure === true || configuredSecure === "true";
    return { httpOnly: true, sameSite: "strict", secure, path: this.config.get<string>("REFRESH_COOKIE_PATH")?.trim() || "/auth" };
  }
}
