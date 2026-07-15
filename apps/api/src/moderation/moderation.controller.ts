import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CreateReportDto } from "./dto/create-report.dto";
import { ListReportsDto } from "./dto/list-reports.dto";
import { ModeratePostDto } from "./dto/moderate-post.dto";
import { ResolveReportDto } from "./dto/resolve-report.dto";
import { ModerationService } from "./moderation.service";
const moderators = [SystemRole.MODERATOR, SystemRole.OPERATOR, SystemRole.ADMIN];
@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}
  @Post("reports") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) async report(@Body() input: CreateReportDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.moderation.createReport(input, user) }; }
  @Get("admin/reports") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...moderators) async reports(@Query() query: ListReportsDto) { return { success: true, data: await this.moderation.list(query) }; }
  @Patch("admin/reports/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...moderators) async resolve(@Param("id", ParseUUIDPipe) id: string, @Body() input: ResolveReportDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.moderation.resolve(id, input, user) }; }
  @Patch("admin/moderation/posts/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...moderators) async moderatePost(@Param("id", ParseUUIDPipe) id: string, @Body() input: ModeratePostDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.moderation.moderatePost(id, input, user) }; }
  @Get("admin/moderation/logs") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...moderators) async logs(@Query("page", new ParseIntPipe({ optional: true })) page = 1) { return { success: true, data: await this.moderation.listLogs(page) }; }
}
