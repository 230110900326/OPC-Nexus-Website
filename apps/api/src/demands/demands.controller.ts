import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { DemandAdminService } from "./demand-admin.service";
import { DemandsService } from "./demands.service";
import { AdminConnectQueryDto, AdminDemandQueryDto } from "./dto/admin-demand-query.dto";
import { CreateDemandConnectDto } from "./dto/create-demand-connect.dto";
import { CreateDemandDto } from "./dto/create-demand.dto";
import { DemandDashboardQueryDto } from "./dto/demand-dashboard-query.dto";
import { DemandHotWindow, ListDemandsDto, ListMyDemandsDto, MyConnectDirection, MyConnectsDto } from "./dto/list-demands.dto";
import { BatchDemandActionDto, ReviewDemandDto } from "./dto/review-demand.dto";
import { UpdateDemandBoardConfigDto } from "./dto/update-demand-board-config.dto";
import { UpdateDemandConnectDto } from "./dto/update-demand-connect.dto";
import { UpdateDemandDto } from "./dto/update-demand.dto";

const reviewers = [SystemRole.MODERATOR, SystemRole.OPERATOR, SystemRole.ADMIN];
const operators = [SystemRole.OPERATOR, SystemRole.ADMIN];

@Controller()
export class DemandsController {
  constructor(private readonly demands: DemandsService, private readonly admin: DemandAdminService) {}

  @Get("demands/config")
  async config() { return { success: true, data: await this.demands.boardConfig() }; }

  @Get("demands/hot")
  async hot(@Query() query: { window?: DemandHotWindow }) { return { success: true, data: await this.demands.hot(query.window === DemandHotWindow.DAY ? "24h" : "7d") }; }

  @Get("demands")
  async list(@Query() query: ListDemandsDto) { return { success: true, data: await this.demands.list(query) }; }

  @Get("demands/mine") @UseGuards(JwtAuthGuard)
  async mine(@Query() query: ListMyDemandsDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.mine(query, user) }; }

  @Get("demands/mine/connects") @UseGuards(JwtAuthGuard)
  async myConnects(@Query() query: MyConnectsDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.myConnects(query.direction, user) }; }

  @Get("demands/mine/:id") @UseGuards(JwtAuthGuard)
  async myDetail(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.myDetail(id, user) }; }

  @Post("demands") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() input: CreateDemandDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.create(input, user) }; }

  @Get("demands/:id")
  async detail(@Param("id", ParseUUIDPipe) id: string) { return { success: true, data: await this.demands.detail(id) }; }

  @Get("demands/:id/contact") @UseGuards(JwtAuthGuard)
  async contact(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.contact(id, user) }; }

  @Patch("demands/:id") @UseGuards(JwtAuthGuard)
  async update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateDemandDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.update(id, input, user) }; }

  @Delete("demands/:id") @UseGuards(JwtAuthGuard)
  async remove(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.remove(id, user) }; }

  @Post("demands/:id/submit") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async submit(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.submit(id, user) }; }

  @Patch("demands/:id/offline") @UseGuards(JwtAuthGuard)
  async offline(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.offline(id, user) }; }

  @Patch("demands/:id/complete") @UseGuards(JwtAuthGuard)
  async complete(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.complete(id, user) }; }

  @Post("demands/:id/connects") @UseGuards(JwtAuthGuard) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async connect(@Param("id", ParseUUIDPipe) id: string, @Body() input: CreateDemandConnectDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.connect(id, input, user) }; }

  @Get("demands/:id/connects") @UseGuards(JwtAuthGuard)
  async demandConnects(@Param("id", ParseUUIDPipe) id: string, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.connectionsForDemand(id, user) }; }

  @Patch("demands/:id/connects/:connectId") @UseGuards(JwtAuthGuard)
  async updateConnect(@Param("id", ParseUUIDPipe) id: string, @Param("connectId", ParseUUIDPipe) connectId: string, @Body() input: UpdateDemandConnectDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.demands.updateConnect(id, connectId, input, user) }; }

  @Get("admin/demands") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...reviewers)
  async adminList(@Query() query: AdminDemandQueryDto) { return { success: true, data: await this.admin.list(query) }; }

  @Get("admin/demands/dashboard") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...reviewers)
  async dashboard(@Query() query: DemandDashboardQueryDto) { return { success: true, data: await this.admin.dashboard(query) }; }

  @Post("admin/demands/batch") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async batch(@Body() input: BatchDemandActionDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.admin.batch(input, user) }; }

  @Get("admin/demands/config") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async adminConfig() { return { success: true, data: await this.admin.getConfig() }; }

  @Patch("admin/demands/config") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async updateConfig(@Body() input: UpdateDemandBoardConfigDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.admin.updateConfig(input, user) }; }

  @Post("admin/demands/deadline-reminders") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async reminders() { return { success: true, data: await this.admin.sendDeadlineReminders() }; }

  @Get("admin/demand-connects") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async adminConnects(@Query() query: AdminConnectQueryDto) { return { success: true, data: await this.admin.connections(query) }; }

  @Get("admin/demand-connects.csv") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async exportConnects(@Query() query: AdminConnectQueryDto, @Res() response: Response) {
    const rows = await this.admin.exportConnections(query);
    const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const columns = ["demand_id", "demand_title", "demand_status", "industries", "demand_author", "demand_author_email", "demand_contacts", "applicant", "applicant_email", "apply_message", "connect_status", "anomalous", "risk_reason", "created_at"];
    const contents = [columns.join(","), ...rows.map((row) => [row.demandId, row.demandTitle, row.demandStatus, row.industries, row.demandAuthor, row.demandAuthorEmail, row.demandContacts, row.applicant, row.applicantEmail, row.applyMessage, row.connectStatus, row.anomalous, row.riskReason, row.createdAt].map(quote).join(","))].join("\n");
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", "attachment; filename=opc-demand-connects.csv");
    response.send(`\uFEFF${contents}`);
  }

  @Get("admin/demands/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...reviewers)
  async adminDetail(@Param("id", ParseUUIDPipe) id: string) { return { success: true, data: await this.admin.detail(id) }; }

  @Patch("admin/demands/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...reviewers)
  async adminUpdate(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateDemandDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.admin.update(id, input, user) }; }

  @Patch("admin/demands/:id/review") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...reviewers)
  async review(@Param("id", ParseUUIDPipe) id: string, @Body() input: ReviewDemandDto, @AuthenticatedUser() user: AuthUser) { return { success: true, data: await this.admin.review(id, input, user) }; }
}
