import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/auth-user.interface";
import { AuditAction } from "../database/entities/audit-log.entity";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { NotificationType } from "../database/entities/notification.entity";
import { OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";
import { Report, ReportTargetType } from "../database/entities/report.entity";
import { User } from "../database/entities/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { demandCertification, DemandComplianceService } from "./demand-compliance.service";
import { DemandHeatService } from "./demand-heat.service";
import { AdminConnectQueryDto, AdminDemandQueryDto } from "./dto/admin-demand-query.dto";
import { DemandDashboardQueryDto } from "./dto/demand-dashboard-query.dto";
import { BatchDemandActionDto, DemandBatchAction, DemandReviewAction, ReviewDemandDto } from "./dto/review-demand.dto";
import { UpdateDemandBoardConfigDto } from "./dto/update-demand-board-config.dto";
import { UpdateDemandDto } from "./dto/update-demand.dto";

const adminRelations = { author: { roles: true }, industries: true, reviewedBy: true } as const;

@Injectable()
export class DemandAdminService {
  constructor(
    @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>,
    @InjectRepository(OpcDemandConnect) private readonly connects: Repository<OpcDemandConnect>,
    @InjectRepository(DemandBoardConfig) private readonly configs: Repository<DemandBoardConfig>,
    @InjectRepository(ForumSection) private readonly sections: Repository<ForumSection>,
    @InjectRepository(ModerationLog) private readonly moderationLogs: Repository<ModerationLog>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly compliance: DemandComplianceService,
    private readonly heat: DemandHeatService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async list(input: AdminDemandQueryDto) {
    const query = this.demands.createQueryBuilder("demand")
      .leftJoinAndSelect("demand.author", "author")
      .leftJoinAndSelect("author.roles", "authorRole")
      .leftJoinAndSelect("demand.industries", "industry")
      .leftJoinAndSelect("demand.reviewedBy", "reviewedBy")
      .where("demand.deleted_at IS NULL");
    if (input.status) query.andWhere("demand.status = :status", { status: input.status });
    if (input.demandType) query.andWhere("demand.demand_type = :demandType", { demandType: input.demandType });
    if (input.budgetRange) query.andWhere("demand.budget_range = :budgetRange", { budgetRange: input.budgetRange });
    if (input.industryId) query.andWhere("industry.id = :industryId", { industryId: input.industryId });
    if (input.author?.trim()) {
      const author = input.author.trim();
      query.andWhere("(author.display_name ILIKE :author OR author.email ILIKE :author OR CAST(author.id AS text) = :authorId)", { author: `%${author}%`, authorId: author });
    }
    if (input.from) query.andWhere("demand.created_at >= :from", { from: startDate(input.from) });
    if (input.to) query.andWhere("demand.created_at <= :to", { to: endDate(input.to) });
    query.distinct(true)
      .orderBy("demand.createdAt", "DESC")
      .addOrderBy("demand.id", "DESC")
      .skip((input.page - 1) * input.limit)
      .take(input.limit);
    const [items, total] = await query.getManyAndCount();
    const reportCounts = await this.reportCounts(items.map((item) => item.id));
    return {
      items: items.map((item) => ({ ...this.adminDemand(item), reportCount: reportCounts.get(item.id) ?? 0 })),
      pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
    };
  }

  async detail(id: string) {
    const demand = await this.findDemand(id);
    const [reports, connectCount] = await Promise.all([
      this.reports.find({ where: { targetType: ReportTargetType.DEMAND, targetId: id }, relations: { reporter: true, handledBy: true }, order: { createdAt: "DESC" } }),
      this.connects.count({ where: { demand: { id } } }),
    ]);
    return { ...this.adminDemand(demand), reports, totalConnectRecords: connectCount };
  }

  async update(id: string, input: UpdateDemandDto, actor: AuthUser) {
    const demand = await this.findDemand(id);
    if (input.title !== undefined) demand.title = input.title.trim();
    if (input.content !== undefined) demand.content = cleanText(input.content);
    if (input.demandType !== undefined) demand.demandType = input.demandType;
    if (input.budgetRange !== undefined) demand.budgetRange = input.budgetRange;
    if (input.industryIds !== undefined) demand.industries = await this.resolveIndustries(input.industryIds);
    if (input.contactInfo !== undefined) {
      demand.contactInfo = await this.compliance.normalizeContacts(input.contactInfo);
      demand.contactHash = this.compliance.contactHash(demand.contactInfo);
    }
    if (input.imageUrls !== undefined) {
      const imageUrls = input.imageUrls.map((item) => item.trim()).filter(Boolean);
      this.compliance.validateImages(imageUrls);
      demand.imageUrls = imageUrls;
    }
    if (input.deadline !== undefined) demand.deadline = input.deadline ? new Date(input.deadline) : null;
    if (input.agreeToRules !== undefined) demand.rulesAcceptedAt = input.agreeToRules ? new Date() : null;
    if ([DemandStatus.PUBLISHED, DemandStatus.PENDING_REVIEW].includes(demand.status)) this.compliance.validateDeadline(demand.deadline);
    demand.riskFlags = await this.compliance.submissionRisk(demand, demand.author);
    const saved = await this.demands.save(demand);
    await this.audit.record({ actor, action: AuditAction.DEMAND_EDIT, targetType: "demand", targetId: id, metadata: { fields: Object.keys(input), adminEdit: true } });
    return this.adminDemand(saved);
  }

  async review(id: string, input: ReviewDemandDto, actor: AuthUser) {
    const demand = await this.findDemand(id);
    this.assertReviewAllowed(demand, input.action, input.reason);
    this.applyReview(demand, input.action, input.reason, actor.id);
    await this.demands.save(demand);
    await this.recordModeration(demand, input.action, input.reason ?? "审核通过", actor);
    await this.notifyReview(demand, input.action, input.reason);
    if (demand.status === DemandStatus.PUBLISHED) await this.heat.recalculate(id);
    return this.adminDemand(await this.findDemand(id));
  }

  async batch(input: BatchDemandActionDto, actor: AuthUser) {
    const uniqueIds = [...new Set(input.ids)];
    const demands = await this.demands.find({ where: { id: In(uniqueIds), deletedAt: IsNull() }, relations: adminRelations });
    if (demands.length !== uniqueIds.length) throw new NotFoundException("批量操作中包含不存在的需求");
    const reason = input.reason?.trim();

    if ([DemandBatchAction.REJECT, DemandBatchAction.BLOCK].includes(input.action) && !reason) throw new BadRequestException("驳回或封禁必须填写原因");
    if (input.action === DemandBatchAction.APPROVE && demands.some((item) => item.status !== DemandStatus.PENDING_REVIEW)) throw new ConflictException("只有待审核需求可以批量通过");
    if (input.action === DemandBatchAction.REJECT && demands.some((item) => item.status !== DemandStatus.PENDING_REVIEW)) throw new ConflictException("只有待审核需求可以批量驳回");
    if (input.action === DemandBatchAction.PIN) {
      if (demands.some((item) => item.status !== DemandStatus.PUBLISHED)) throw new ConflictException("只有正常展示的需求可以置顶");
      const config = await this.compliance.config();
      const pinned = await this.demands.count({ where: { status: DemandStatus.PUBLISHED, deletedAt: IsNull() } });
      const alreadyPinned = await this.demands.createQueryBuilder("demand").where("demand.status = :status AND demand.deleted_at IS NULL AND demand.top_weight > 0", { status: DemandStatus.PUBLISHED }).getCount();
      const newPins = demands.filter((item) => item.topWeight === 0).length;
      if (newPins > 0 && alreadyPinned + newPins > config.maxPinned) throw new ConflictException(`置顶数量不能超过 ${config.maxPinned} 条`);
      if (pinned === 0) throw new ConflictException("没有可置顶的公开需求");
    }

    for (const demand of demands) {
      switch (input.action) {
        case DemandBatchAction.APPROVE:
          this.applyReview(demand, DemandReviewAction.APPROVE, reason, actor.id);
          break;
        case DemandBatchAction.REJECT:
          this.applyReview(demand, DemandReviewAction.REJECT, reason, actor.id);
          break;
        case DemandBatchAction.BLOCK:
          this.applyReview(demand, DemandReviewAction.BLOCK, reason, actor.id);
          break;
        case DemandBatchAction.PIN:
          demand.topWeight = input.topWeight ?? 100;
          break;
        case DemandBatchAction.UNPIN:
          demand.topWeight = 0;
          break;
        case DemandBatchAction.OFFLINE:
          demand.status = DemandStatus.OFFLINE;
          demand.topWeight = 0;
          break;
      }
    }
    await this.demands.save(demands);

    for (const demand of demands) {
      const reviewAction = input.action === DemandBatchAction.APPROVE ? DemandReviewAction.APPROVE : input.action === DemandBatchAction.REJECT ? DemandReviewAction.REJECT : input.action === DemandBatchAction.BLOCK ? DemandReviewAction.BLOCK : null;
      if (reviewAction) {
        await this.recordModeration(demand, reviewAction, reason ?? "审核通过", actor);
        await this.notifyReview(demand, reviewAction, reason);
      } else {
        const auditAction = [DemandBatchAction.PIN, DemandBatchAction.UNPIN].includes(input.action) ? AuditAction.DEMAND_PIN : AuditAction.DEMAND_STATUS_CHANGE;
        await this.audit.record({ actor, action: auditAction, targetType: "demand", targetId: demand.id, metadata: { batch: true, action: input.action, topWeight: demand.topWeight, reason } });
        if (input.action === DemandBatchAction.OFFLINE) await this.notifications.create(demand.author.id, NotificationType.DEMAND_MODERATED, "需求已下架", `你的需求“${demand.title}”已由运营人员下架。${reason ?? ""}`, "demand", demand.id);
      }
    }
    if (input.action === DemandBatchAction.APPROVE) await this.heat.recalculatePublished();
    const refreshed = await this.demands.find({ where: { id: In(uniqueIds), deletedAt: IsNull() }, relations: adminRelations });
    return { updated: refreshed.length, items: refreshed.map((item) => this.adminDemand(item)) };
  }

  async connections(input: AdminConnectQueryDto, paginate = true) {
    const query = this.connects.createQueryBuilder("connect")
      .leftJoinAndSelect("connect.demand", "demand")
      .leftJoinAndSelect("demand.author", "author")
      .leftJoinAndSelect("author.roles", "authorRole")
      .leftJoinAndSelect("demand.industries", "industry")
      .leftJoinAndSelect("connect.applyUser", "applicant")
      .leftJoinAndSelect("applicant.roles", "applicantRole");
    if (input.demandId) query.andWhere("demand.id = :demandId", { demandId: input.demandId });
    if (input.user?.trim()) {
      const user = input.user.trim();
      query.andWhere("(applicant.display_name ILIKE :user OR applicant.email ILIKE :user OR author.display_name ILIKE :user OR author.email ILIKE :user OR CAST(applicant.id AS text) = :userId)", { user: `%${user}%`, userId: user });
    }
    if (input.from) query.andWhere("connect.created_at >= :from", { from: startDate(input.from) });
    if (input.to) query.andWhere("connect.created_at <= :to", { to: endDate(input.to) });
    query.distinct(true).orderBy("connect.createdAt", "DESC").addOrderBy("connect.id", "DESC");
    if (paginate) query.skip((input.page - 1) * input.limit).take(input.limit);
    const [items, total] = await query.getManyAndCount();
    return {
      items: items.map((item) => this.adminConnect(item)),
      pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
    };
  }

  async exportConnections(input: AdminConnectQueryDto) {
    const result = await this.connections(input, false);
    return result.items.map((item) => ({
      demandId: item.demand.id,
      demandTitle: item.demand.title,
      demandStatus: item.demand.status,
      industries: item.demand.industries.map((industry) => industry.name).join(" / "),
      demandAuthor: item.demand.author.displayName,
      demandAuthorEmail: item.demand.author.email,
      demandContacts: item.demand.contactInfo.map((contact) => `${contact.type}:${contact.value}`).join(" / "),
      applicant: item.applicant.displayName,
      applicantEmail: item.applicant.email,
      applyMessage: item.applyMsg,
      connectStatus: item.status,
      anomalous: item.isAnomalous ? "yes" : "no",
      riskReason: item.riskReason ?? "",
      createdAt: item.createdAt,
    }));
  }

  async getConfig() {
    return this.compliance.config();
  }

  async updateConfig(input: UpdateDemandBoardConfigDto, actor: AuthUser) {
    let config = await this.configs.findOne({ where: { id: (await this.compliance.config()).id } });
    config ??= this.configs.create({ ...(await this.compliance.config()) });
    Object.assign(config, input);
    if (input.prohibitedKeywords) config.prohibitedKeywords = [...new Set(input.prohibitedKeywords.map((item) => item.trim()).filter(Boolean))];
    if ((input.normalDailyLimit ?? config.normalDailyLimit) > (input.verifiedDailyLimit ?? config.verifiedDailyLimit)) throw new BadRequestException("认证用户每日上限不能低于普通用户");
    config.updatedBy = { id: actor.id } as User;
    const saved = await this.configs.save(config);
    await this.audit.record({ actor, action: AuditAction.DEMAND_CONFIG_UPDATE, targetType: "demand_board_config", targetId: saved.id, metadata: { fields: Object.keys(input) } });
    return saved;
  }

  async sendDeadlineReminders(now = new Date()) {
    const cutoff = new Date(now.getTime() + 3 * 86_400_000);
    const demands = await this.demands.createQueryBuilder("demand")
      .leftJoinAndSelect("demand.author", "author")
      .where("demand.status = :status AND demand.deleted_at IS NULL", { status: DemandStatus.PUBLISHED })
      .andWhere("demand.deadline_reminder_sent_at IS NULL")
      .andWhere("demand.deadline > :now AND demand.deadline <= :cutoff", { now, cutoff })
      .getMany();
    for (const demand of demands) {
      await this.notifications.create(demand.author.id, NotificationType.DEMAND_DEADLINE_REMINDER, "需求即将截止", `你的需求“${demand.title}”将在 3 天内截止，请及时更新状态或调整截止时间。`, "demand", demand.id);
      demand.deadlineReminderSentAt = now;
    }
    if (demands.length) await this.demands.save(demands);
    return { sent: demands.length, demandIds: demands.map((item) => item.id) };
  }

  async dashboard(input: DemandDashboardQueryDto) {
    const now = new Date();
    const from = input.from ? new Date(startDate(input.from)) : new Date(now.getTime() - 29 * 86_400_000);
    const to = input.to ? new Date(endDate(input.to)) : now;
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new BadRequestException("统计日期范围无效");
    if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new BadRequestException("统计日期范围不能超过 366 天");

    const demandBase = this.demands.createQueryBuilder("demand").where("demand.created_at BETWEEN :from AND :to", { from, to }).andWhere("demand.deleted_at IS NULL");
    if (input.industryId) demandBase.innerJoin("demand.industries", "filterIndustry", "filterIndustry.id = :industryId", { industryId: input.industryId });
    const reviewedBase = this.demands.createQueryBuilder("demand").where("demand.reviewed_at BETWEEN :from AND :to", { from, to }).andWhere("demand.deleted_at IS NULL");
    if (input.industryId) reviewedBase.innerJoin("demand.industries", "filterIndustry", "filterIndustry.id = :industryId", { industryId: input.industryId });
    const connectBase = this.connects.createQueryBuilder("connect").innerJoin("connect.demand", "demand").where("connect.created_at BETWEEN :from AND :to", { from, to });
    if (input.industryId) connectBase.innerJoin("demand.industries", "filterIndustry", "filterIndustry.id = :industryId", { industryId: input.industryId });

    const [newDemands, reviewed, approved, blocked, completed, connectApplications] = await Promise.all([
      demandBase.clone().getCount(),
      reviewedBase.clone().getCount(),
      reviewedBase.clone().andWhere("demand.review_reason IS NULL").getCount(),
      demandBase.clone().andWhere("demand.status = :blocked", { blocked: DemandStatus.BLOCKED }).getCount(),
      demandBase.clone().andWhere("demand.status = :completed", { completed: DemandStatus.COMPLETED }).getCount(),
      connectBase.clone().getCount(),
    ]);

    const industryParams: Record<string, unknown> = { from, to };
    let industryWhere = "demand.created_at BETWEEN :from AND :to AND demand.deleted_at IS NULL";
    if (input.industryId) { industryWhere += " AND industry.id = :industryId"; industryParams.industryId = input.industryId; }
    const industries = await this.demands.createQueryBuilder("demand")
      .innerJoin("demand.industries", "industry")
      .select("industry.id", "id")
      .addSelect("industry.name", "name")
      .addSelect("COUNT(DISTINCT demand.id)", "demandCount")
      .addSelect("COALESCE(SUM(demand.connect_count), 0)", "connectCount")
      .addSelect("COALESCE(AVG(demand.heat_score), 0)", "averageHeat")
      .where(industryWhere, industryParams)
      .groupBy("industry.id").addGroupBy("industry.name")
      .orderBy("COALESCE(AVG(demand.heat_score), 0)", "DESC")
      .limit(12)
      .getRawMany<{ id: string; name: string; demandCount: string; connectCount: string; averageHeat: string }>();

    const demandIndustryClause = input.industryId ? " AND EXISTS (SELECT 1 FROM opc_demand_industries di WHERE di.demand_id = d.id AND di.section_id = $3)" : "";
    const connectIndustryClause = input.industryId ? " AND EXISTS (SELECT 1 FROM opc_demand_industries di WHERE di.demand_id = c.demand_id AND di.section_id = $3)" : "";
    const series = await this.demands.query(`
      SELECT to_char(days.day, 'YYYY-MM-DD') AS date,
        (SELECT COUNT(*)::int FROM opc_demands d WHERE d.created_at::date = days.day::date AND d.deleted_at IS NULL${demandIndustryClause}) AS "newDemands",
        (SELECT COUNT(*)::int FROM opc_demands d WHERE d.reviewed_at::date = days.day::date AND d.review_reason IS NULL AND d.deleted_at IS NULL${demandIndustryClause}) AS "approvedDemands",
        (SELECT COUNT(*)::int FROM opc_demand_connect c WHERE c.created_at::date = days.day::date${connectIndustryClause}) AS "connectApplications"
      FROM generate_series(date_trunc('day', $1::timestamptz), date_trunc('day', $2::timestamptz), interval '1 day') days(day)
      ORDER BY days.day ASC
    `, input.industryId ? [from, to, input.industryId] : [from, to]);

    return {
      range: { from, to },
      summary: { newDemands, reviewed, approved, approvalRate: reviewed ? Math.round((approved / reviewed) * 10_000) / 100 : 0, blocked, completed, connectApplications },
      industries: industries.map((item) => ({ id: item.id, name: item.name, demandCount: Number(item.demandCount), connectCount: Number(item.connectCount), averageHeat: Math.round(Number(item.averageHeat) * 100) / 100 })),
      series,
    };
  }

  private async findDemand(id: string) {
    const demand = await this.demands.findOne({ where: { id, deletedAt: IsNull() }, relations: adminRelations });
    if (!demand) throw new NotFoundException("需求不存在");
    return demand;
  }

  private assertReviewAllowed(demand: OpcDemand, action: DemandReviewAction, reason?: string) {
    if ([DemandReviewAction.APPROVE, DemandReviewAction.REJECT].includes(action) && demand.status !== DemandStatus.PENDING_REVIEW) throw new ConflictException("只有待审核需求可以通过或驳回");
    if ([DemandReviewAction.REJECT, DemandReviewAction.BLOCK].includes(action) && !reason?.trim()) throw new BadRequestException("驳回或封禁必须填写原因");
  }

  private applyReview(demand: OpcDemand, action: DemandReviewAction, reason: string | undefined, actorId: string) {
    demand.status = action === DemandReviewAction.APPROVE ? DemandStatus.PUBLISHED : action === DemandReviewAction.REJECT ? DemandStatus.OFFLINE : DemandStatus.BLOCKED;
    demand.reviewReason = action === DemandReviewAction.APPROVE ? null : reason?.trim() ?? null;
    demand.reviewedBy = { id: actorId } as User;
    demand.reviewedAt = new Date();
    if (demand.status !== DemandStatus.PUBLISHED) demand.topWeight = 0;
  }

  private async notifyReview(demand: OpcDemand, action: DemandReviewAction, reason?: string) {
    const approved = action === DemandReviewAction.APPROVE;
    const blocked = action === DemandReviewAction.BLOCK;
    const title = approved ? "需求审核通过" : blocked ? "需求被封禁" : "需求审核未通过";
    const body = approved ? `你的需求“${demand.title}”已通过审核并公开展示。` : `你的需求“${demand.title}”${blocked ? "已被封禁" : "未通过审核"}。原因：${reason?.trim() ?? "请查看平台规范"}`;
    await this.notifications.create(demand.author.id, blocked ? NotificationType.DEMAND_MODERATED : NotificationType.DEMAND_REVIEW_RESULT, title, body, "demand", demand.id);
  }

  private async recordModeration(demand: OpcDemand, action: DemandReviewAction, reason: string, actor: AuthUser) {
    await Promise.all([
      this.moderationLogs.save(this.moderationLogs.create({ operator: { id: actor.id } as User, targetType: "demand", targetId: demand.id, action, reason: reason.trim().slice(0, 500), metadata: { status: demand.status, riskFlags: demand.riskFlags } })),
      this.audit.record({ actor, action: AuditAction.DEMAND_REVIEW, targetType: "demand", targetId: demand.id, metadata: { result: action, reason, riskFlags: demand.riskFlags } }),
    ]);
  }

  private async resolveIndustries(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const values = await this.sections.findBy({ id: In(uniqueIds), isActive: true });
    if (values.length !== uniqueIds.length) throw new BadRequestException("包含不存在或已停用的行业分类");
    return values;
  }

  private async reportCounts(ids: string[]) {
    const result = new Map<string, number>();
    if (!ids.length) return result;
    const rows = await this.reports.createQueryBuilder("report").select("report.target_id", "id").addSelect("COUNT(*)", "count").where("report.target_type = :type", { type: ReportTargetType.DEMAND }).andWhere("report.target_id IN (:...ids)", { ids }).groupBy("report.target_id").getRawMany<{ id: string; count: string }>();
    for (const row of rows) result.set(row.id, Number(row.count));
    return result;
  }

  private adminDemand(demand: OpcDemand) {
    return {
      id: demand.id,
      title: demand.title,
      content: demand.content,
      imageUrls: demand.imageUrls,
      contactInfo: demand.contactInfo,
      industries: demand.industries.map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      demandType: demand.demandType,
      budgetRange: demand.budgetRange,
      deadline: demand.deadline,
      status: demand.status,
      topWeight: demand.topWeight,
      viewCount: demand.viewCount,
      connectCount: demand.connectCount,
      heatScore: Number(demand.heatScore),
      riskFlags: demand.riskFlags,
      reviewReason: demand.reviewReason,
      rulesAcceptedAt: demand.rulesAcceptedAt,
      reviewedAt: demand.reviewedAt,
      reviewedBy: demand.reviewedBy ? { id: demand.reviewedBy.id, displayName: demand.reviewedBy.displayName, email: demand.reviewedBy.email } : null,
      createdAt: demand.createdAt,
      updatedAt: demand.updatedAt,
      author: { id: demand.author.id, displayName: demand.author.displayName, email: demand.author.email, avatarUrl: demand.author.avatarUrl, certification: demandCertification(demand.author) },
    };
  }

  private adminConnect(connect: OpcDemandConnect) {
    const demand = connect.demand;
    return {
      id: connect.id,
      demand: this.adminDemand(demand),
      applicant: { id: connect.applyUser.id, displayName: connect.applyUser.displayName, email: connect.applyUser.email, avatarUrl: connect.applyUser.avatarUrl, certification: demandCertification(connect.applyUser) },
      applyMsg: connect.applyMsg,
      status: connect.status,
      isAnomalous: connect.isAnomalous,
      riskReason: connect.riskReason,
      countsTowardHeat: connect.countsTowardHeat,
      viewedAt: connect.viewedAt,
      createdAt: connect.createdAt,
      updatedAt: connect.updatedAt,
    };
  }
}

function startDate(value: string) { return value.length === 10 ? `${value}T00:00:00.000Z` : value; }
function endDate(value: string) { return value.length === 10 ? `${value}T23:59:59.999Z` : value; }
function cleanText(value: string) { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim(); }
