import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/authenticated-user.decorator";
import { AuthUser } from "../auth/auth-user.interface";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SystemRole } from "../database/entities/role.entity";
import { CreateMetricDto } from "./dto/create-metric.dto";
import { FeedMode, FeedQueryDto } from "./dto/feed-query.dto";
import { RankingService } from "./ranking.service";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../database/entities/audit-log.entity";

@Controller()
export class RankingController {
  constructor(private readonly ranking: RankingService, private readonly audit: AuditService) {}
  @Get("feeds") feed(@Query() query: FeedQueryDto) { return this.ranking.feed(query).then((data) => ({ success: true, data })); }
  @Get("feeds/following") @UseGuards(JwtAuthGuard) following(@Query() query: FeedQueryDto, @AuthenticatedUser() user: AuthUser) { return this.ranking.feed({ ...query, mode: FeedMode.FOLLOWING }, user.id).then((data) => ({ success: true, data })); }
  @Get("rankings") rankings(@Query() query: FeedQueryDto) { return this.ranking.rankings(query).then((data) => ({ success: true, data })); }
  @Post("admin/content-metrics") @UseGuards(JwtAuthGuard, RolesGuard) @Roles(SystemRole.ADMIN, SystemRole.OPERATOR, SystemRole.EDITOR) async metric(@Body() input: CreateMetricDto, @AuthenticatedUser() user: AuthUser) { const data = await this.ranking.record(input); await this.audit.record({ actor: user, action: AuditAction.RANKING_WEIGHT_ADJUST, targetType: input.contentType, targetId: input.contentId, metadata: { fields: Object.keys(input).filter((field) => !["contentType", "contentId"].includes(field)), editorScore: input.editorScore, sourceTrust: input.sourceTrust } }); return { success: true, data }; }
}
