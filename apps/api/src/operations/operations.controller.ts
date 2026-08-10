import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { In, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { ListAuditLogsDto } from "../audit/dto/list-audit-logs.dto";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Role, SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { CreateHomepageConfigDto } from "./dto/create-homepage-config.dto";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { ListUsersDto } from "./dto/list-users.dto";
import { TrackRecommendationDto } from "./dto/track-recommendation.dto";
import { UpdateHomepageConfigDto } from "./dto/update-homepage-config.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
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
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
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

  @Get("admin/users") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async listUsers(@Query() query: ListUsersDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    // For OR search, build with QueryBuilder
    let qb = this.users.createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "role")
      .select(["user.id", "user.email", "user.displayName", "user.avatarUrl", "user.industry", "user.company", "user.jobTitle", "user.isActive", "user.certificationStatus", "user.banReason", "user.bannedAt", "user.createdAt", "user.updatedAt", "role.id", "role.name", "role.label"]);

    if (query.search) {
      const kw = `%${query.search.trim()}%`;
      qb = qb.andWhere("(user.email ILIKE :kw OR user.displayName ILIKE :kw)", { kw });
    }
    if (query.role) {
      qb = qb.andWhere("role.name = :role", { role: query.role });
    }
    if (query.status === "banned") {
      qb = qb.andWhere("user.isActive = false AND user.banReason IS NOT NULL");
    } else if (query.status === "pending") {
      qb = qb.andWhere("user.certificationStatus = 'pending'");
    } else if (query.status === "active") {
      qb = qb.andWhere("user.isActive = true");
    }

    const [users, total] = await qb
      .orderBy("user.createdAt", "DESC")
      .skip(skip).take(limit)
      .getManyAndCount();

    const items = users.map((u) => ({
      id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl,
      industry: u.industry, company: u.company, jobTitle: u.jobTitle,
      isActive: u.isActive, certificationStatus: u.certificationStatus,
      banReason: u.banReason, bannedAt: u.bannedAt,
      roles: u.roles.map((r) => r.name),
      createdAt: u.createdAt, updatedAt: u.updatedAt,
    }));

    return { success: true, data: { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } } };
  }

  @Patch("admin/users/:id") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...operators)
  async updateUser(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateUserDto, @AuthenticatedUser() actor: AuthUser) {
    if (id === actor.id) throw new BadRequestException("不能修改自己的账号状态或角色");

    const user = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!user) throw new BadRequestException("用户不存在");

    if (input.isActive !== undefined) {
      user.isActive = input.isActive;
      if (input.isActive) { user.banReason = null; user.bannedAt = null; }
      else { user.banReason = input.banReason || "运营手动封禁"; user.bannedAt = new Date(); }
    }

    if (input.roles !== undefined) {
      const actorUser = await this.users.findOne({ where: { id: actor.id }, relations: { roles: true } });
      const isAdmin = actorUser?.roles.some((r) => r.name === SystemRole.ADMIN);
      // Only admin can grant admin role
      if (!isAdmin && input.roles.includes(SystemRole.ADMIN)) throw new BadRequestException("仅管理员可分配 admin 角色");
      // Prevent removing the last admin
      if (isAdmin && !input.roles.includes(SystemRole.ADMIN)) {
        const adminCount = await this.users.count({ where: { roles: { name: SystemRole.ADMIN } } });
        if (adminCount <= 1) throw new BadRequestException("不能移除唯一的 admin");
      }
      // Prevent demoting own admin role
      if (id === actor.id && actorUser?.roles.some((r) => r.name === SystemRole.ADMIN) && !input.roles.includes(SystemRole.ADMIN)) {
        throw new BadRequestException("不能降级自己的 admin 角色");
      }
      const targetRoles = await this.roles.findBy({ name: In(input.roles) });
      if (targetRoles.length !== input.roles.length) throw new BadRequestException("角色名称无效");
      user.roles = targetRoles;
      // If granting operator/admin, auto-activate
      if (input.roles.some((r) => [SystemRole.ADMIN, SystemRole.OPERATOR].includes(r)) && !user.isActive) {
        user.isActive = true;
        user.banReason = null;
        user.bannedAt = null;
      }
    }

    await this.users.save(user);
    const updated = await this.users.findOne({ where: { id }, relations: { roles: true } });
    if (!updated) throw new BadRequestException("用户不存在");
    return {
      success: true,
      data: {
        id: updated.id, email: updated.email, displayName: updated.displayName, avatarUrl: updated.avatarUrl,
        industry: updated.industry, company: updated.company, jobTitle: updated.jobTitle,
        isActive: updated.isActive, certificationStatus: updated.certificationStatus,
        banReason: updated.banReason, bannedAt: updated.bannedAt,
        roles: updated.roles.map((r) => r.name),
        createdAt: updated.createdAt, updatedAt: updated.updatedAt,
      },
    };
  }
}
