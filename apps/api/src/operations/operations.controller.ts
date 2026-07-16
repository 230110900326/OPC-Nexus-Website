import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { ListAuditLogsDto } from "../audit/dto/list-audit-logs.dto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CreateHomepageConfigDto } from "./dto/create-homepage-config.dto";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { TrackRecommendationDto } from "./dto/track-recommendation.dto";
import { UpdateHomepageConfigDto } from "./dto/update-homepage-config.dto";
import { HomepageConfigService } from "./homepage-config.service";
import { HomepageService } from "./homepage.service";
import { OperationsDashboardService } from "./operations-dashboard.service";

const operators = [SystemRole.OPERATOR, SystemRole.ADMIN];

@Controller()
export class OperationsController {
  constructor(
    private readonly homepage: HomepageService,
    private readonly homepageConfigs: HomepageConfigService,
    private readonly dashboard: OperationsDashboardService,
    private readonly audit: AuditService,
  ) {}

  @Get("homepage") async getHomepage() { return { success: true, data: await this.homepage.assemble() }; }
  @Post("homepage/recommendation-events") async track(@Body() input: TrackRecommendationDto, @Req() request: Request) {
    const fingerprint = request.get("x-session-id") ?? `${request.ip}|${request.get("user-agent") ?? ""}`;
    return { success: true, data: await this.homepageConfigs.track(input, fingerprint) };
  }

  @Get("admin/homepage/configs") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async configs() { return { success: true, data: await this.homepageConfigs.list() }; }
  @Post("admin/homepage/configs") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async createConfig(@Body() input: CreateHomepageConfigDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.homepageConfigs.create(input, user) }; }
  @Patch("admin/homepage/configs/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async updateConfig(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateHomepageConfigDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.homepageConfigs.update(id, input, user) }; }
  @Delete("admin/homepage/configs/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async deleteConfig(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.homepageConfigs.remove(id, user) }; }

  @Get("admin/operations/dashboard") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async operationsDashboard(@Query() query: DashboardQueryDto) { return { success: true, data: await this.dashboard.dashboard(query) }; }
  @Get("admin/audit-logs") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async auditLogs(@Query() query: ListAuditLogsDto) { return { success: true, data: await this.audit.list(query) }; }
}
