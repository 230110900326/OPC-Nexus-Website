import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get("me") async getMe(@AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.users.getMe(user.id) }; }
  @Patch("me") async updateMe(@AuthenticatedUser() user: AuthUser, @Body() input: UpdateProfileDto) { return { success: true, data: await this.users.updateMe(user.id, input) }; }
  @Get(":id") async publicProfile(@Param("id", ParseUUIDPipe) id: string) { return { success: true, data: await this.users.publicProfile(id) }; }
}
