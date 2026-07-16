import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, IsNull, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/auth-user.interface";
import { AuditAction } from "../database/entities/audit-log.entity";
import { MetricContentType } from "../database/entities/content-metric.entity";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { NotificationType } from "../database/entities/notification.entity";
import { DemandConnectStatus, OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RankingService } from "../ranking/ranking.service";
import { demandCertification, DemandComplianceService } from "./demand-compliance.service";
import { DemandHeatService } from "./demand-heat.service";
import { CreateDemandConnectDto } from "./dto/create-demand-connect.dto";
import { CreateDemandDto } from "./dto/create-demand.dto";
import { DemandSort, ListDemandsDto, ListMyDemandsDto } from "./dto/list-demands.dto";
import { UpdateDemandConnectDto } from "./dto/update-demand-connect.dto";
import { UpdateDemandDto } from "./dto/update-demand.dto";

const demandRelations = { author: { roles: true }, industries: true } as const;
const managerRoles = [SystemRole.MODERATOR, SystemRole.OPERATOR, SystemRole.ADMIN];

@Injectable()
export class DemandsService {
  constructor(
    @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>,
    @InjectRepository(OpcDemandConnect) private readonly connects: Repository<OpcDemandConnect>,
    @InjectRepository(ForumSection) private readonly sections: Repository<ForumSection>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly compliance: DemandComplianceService,
    private readonly heat: DemandHeatService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly ranking: RankingService,
  ) {}

  async boardConfig() {
    const config = await this.compliance.config();
    return { bannerTitle: config.bannerTitle, bannerSubtitle: config.bannerSubtitle, rulesText: config.rulesText, disclaimer: config.disclaimer, allowPhone: config.allowPhone };
  }

  async list(input: ListDemandsDto) {
    const query = this.demands.createQueryBuilder("demand").leftJoinAndSelect("demand.author", "author").leftJoinAndSelect("author.roles", "role").leftJoinAndSelect("demand.industries", "industry").where("demand.status = :status AND demand.deleted_at IS NULL", { status: DemandStatus.PUBLISHED });
    if (input.demandType) query.andWhere("demand.demand_type = :demandType", { demandType: input.demandType });
    if (input.budgetRange) query.andWhere("demand.budget_range = :budgetRange", { budgetRange: input.budgetRange });
    if (input.industryId) query.andWhere("industry.id = :industryId", { industryId: input.industryId });
    if (input.activeOnly) query.andWhere("(demand.deadline IS NULL OR demand.deadline > NOW())");
    const keyword = input.q?.trim();
    if (keyword) query.andWhere(new Brackets((where) => where.where("demand.search_document @@ websearch_to_tsquery('simple', :q)", { q: keyword }).orWhere("demand.title ILIKE :like OR demand.content ILIKE :like OR industry.name ILIKE :like", { like: `%${keyword}%` })));
    query.distinct(true).orderBy("demand.topWeight", "DESC");
    if (input.sort === DemandSort.HOT) query.addOrderBy("demand.heatScore", "DESC");
    query.addOrderBy("demand.createdAt", "DESC").addOrderBy("demand.id", "DESC").skip((input.page - 1) * input.limit).take(input.limit);
    const [items, total] = await query.getManyAndCount();
    return { items: items.map((demand) => this.publicDemand(demand, false)), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }

  async hot(window: "24h" | "7d") {
    const since = new Date(Date.now() - (window === "24h" ? 24 : 168) * 3_600_000);
    const items = await this.demands.createQueryBuilder("demand").leftJoinAndSelect("demand.author", "author").leftJoinAndSelect("author.roles", "role").leftJoinAndSelect("demand.industries", "industry").where("demand.status = :status AND demand.deleted_at IS NULL AND demand.created_at >= :since", { status: DemandStatus.PUBLISHED, since }).orderBy("demand.topWeight", "DESC").addOrderBy("demand.heatScore", "DESC").take(10).getMany();
    return items.map((demand) => this.publicDemand(demand, false));
  }

  async detail(id: string) {
    const demand = await this.demands.findOne({ where: { id, status: DemandStatus.PUBLISHED, deletedAt: IsNull() }, relations: demandRelations });
    if (!demand) throw new NotFoundException("需求不存在或暂不可见");
    await Promise.all([this.demands.increment({ id }, "viewCount", 1), this.ranking.recordDelta(MetricContentType.DEMAND, id, { readCount: 1 })]);
    demand.viewCount += 1;
    const industryIds = demand.industries.map((item) => item.id);
    const related = industryIds.length ? await this.demands.createQueryBuilder("related").leftJoinAndSelect("related.author", "author").leftJoinAndSelect("author.roles", "role").leftJoinAndSelect("related.industries", "industry").where("related.status = :status AND related.id != :id AND related.deleted_at IS NULL", { status: DemandStatus.PUBLISHED, id }).andWhere("industry.id IN (:...industryIds)", { industryIds }).distinct(true).orderBy("related.topWeight", "DESC").addOrderBy("related.heatScore", "DESC").take(4).getMany() : [];
    await this.heat.recalculate(id);
    return { ...this.publicDemand(demand, true), related: related.map((item) => this.publicDemand(item, false)) };
  }

  async contact(id: string, user: AuthUser) {
    const demand = await this.demands.findOne({ where: { id, deletedAt: IsNull() }, relations: demandRelations });
    if (!demand) throw new NotFoundException("需求不存在");
    const canManage = user.roles.some((role) => managerRoles.includes(role));
    if (demand.status !== DemandStatus.PUBLISHED && demand.author.id !== user.id && !canManage) throw new ForbiddenException("当前需求不可查看联系方式");
    return { demandId: demand.id, contactInfo: demand.contactInfo, disclaimer: (await this.compliance.config()).disclaimer };
  }

  async mine(input: ListMyDemandsDto, user: AuthUser) {
    const [items, total] = await this.demands.findAndCount({ where: { author: { id: user.id }, status: input.status }, relations: demandRelations, order: { updatedAt: "DESC" }, skip: (input.page - 1) * input.limit, take: input.limit });
    return { items: items.map((item) => this.ownerDemand(item)), pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }

  async myDetail(id: string, user: AuthUser) { return this.ownerDemand(await this.ownedDemand(id, user.id)); }

  async create(input: CreateDemandDto, actor: AuthUser) {
    const user = await this.user(actor.id);
    await this.compliance.assertCanCreate(user);
    const contacts = await this.compliance.normalizeContacts(input.contactInfo);
    const industries = await this.resolveIndustries(input.industryIds);
    const imageUrls = input.imageUrls?.map((item) => item.trim()).filter(Boolean) ?? [];
    this.compliance.validateImages(imageUrls);
    const demand = await this.demands.save(this.demands.create({ author: user, title: input.title.trim(), content: cleanText(input.content), imageUrls, contactInfo: contacts, contactHash: this.compliance.contactHash(contacts), industries, demandType: input.demandType, budgetRange: input.budgetRange, deadline: input.deadline ? new Date(input.deadline) : null, status: DemandStatus.DRAFT, rulesAcceptedAt: input.agreeToRules ? new Date() : null, riskFlags: [], reviewReason: null, reviewedBy: null, reviewedAt: null, deadlineReminderSentAt: null }));
    await this.audit.record({ actor: { ...actor, displayName: user.displayName }, action: AuditAction.DEMAND_CREATE, targetType: "demand", targetId: demand.id, metadata: { demandType: demand.demandType, budgetRange: demand.budgetRange } });
    return this.ownerDemand(await this.ownedDemand(demand.id, actor.id));
  }

  async update(id: string, input: UpdateDemandDto, actor: AuthUser) {
    const demand = await this.ownedDemand(id, actor.id);
    if (![DemandStatus.DRAFT, DemandStatus.OFFLINE].includes(demand.status)) throw new ForbiddenException("只有草稿或已下架需求可以编辑");
    if (input.title !== undefined) demand.title = input.title.trim();
    if (input.content !== undefined) demand.content = cleanText(input.content);
    if (input.demandType !== undefined) demand.demandType = input.demandType;
    if (input.budgetRange !== undefined) demand.budgetRange = input.budgetRange;
    if (input.industryIds !== undefined) demand.industries = await this.resolveIndustries(input.industryIds);
    if (input.contactInfo !== undefined) { demand.contactInfo = await this.compliance.normalizeContacts(input.contactInfo); demand.contactHash = this.compliance.contactHash(demand.contactInfo); }
    if (input.imageUrls !== undefined) { const urls = input.imageUrls.map((item) => item.trim()).filter(Boolean); this.compliance.validateImages(urls); demand.imageUrls = urls; }
    if (input.deadline !== undefined) demand.deadline = input.deadline ? new Date(input.deadline) : null;
    if (input.agreeToRules !== undefined) demand.rulesAcceptedAt = input.agreeToRules ? new Date() : null;
    if (demand.status === DemandStatus.OFFLINE) demand.status = DemandStatus.DRAFT;
    demand.reviewReason = null; demand.riskFlags = [];
    const saved = await this.demands.save(demand);
    await this.audit.record({ actor, action: AuditAction.DEMAND_EDIT, targetType: "demand", targetId: id, metadata: { fields: Object.keys(input) } });
    return this.ownerDemand(saved);
  }

  async remove(id: string, actor: AuthUser) {
    const demand = await this.ownedDemand(id, actor.id);
    if (demand.status !== DemandStatus.DRAFT) throw new ForbiddenException("只有草稿可以删除");
    await this.demands.softRemove(demand);
    await this.audit.record({ actor, action: AuditAction.DEMAND_STATUS_CHANGE, targetType: "demand", targetId: id, metadata: { to: "deleted" } });
    return { id };
  }

  async submit(id: string, actor: AuthUser) {
    const demand = await this.ownedDemand(id, actor.id);
    if (![DemandStatus.DRAFT, DemandStatus.OFFLINE].includes(demand.status)) throw new ConflictException("当前状态不能提交审核");
    if (!demand.rulesAcceptedAt) throw new BadRequestException("请先同意《需求广场服务规范》");
    if (!demand.contactInfo.length || !demand.industries.length) throw new BadRequestException("请完整填写联系方式和所属行业");
    this.compliance.validateDeadline(demand.deadline);
    const user = await this.user(actor.id);
    demand.riskFlags = await this.compliance.submissionRisk(demand, user);
    demand.status = DemandStatus.PENDING_REVIEW; demand.reviewReason = null; demand.reviewedAt = null; demand.reviewedBy = null;
    await this.demands.save(demand);
    await this.audit.record({ actor, action: AuditAction.DEMAND_SUBMIT, targetType: "demand", targetId: id, metadata: { riskFlags: demand.riskFlags } });
    return this.ownerDemand(demand);
  }

  async offline(id: string, actor: AuthUser) { return this.ownerTransition(id, actor, DemandStatus.PUBLISHED, DemandStatus.OFFLINE); }
  async complete(id: string, actor: AuthUser) { return this.ownerTransition(id, actor, DemandStatus.PUBLISHED, DemandStatus.COMPLETED); }

  async connect(id: string, input: CreateDemandConnectDto, actor: AuthUser) {
    const demand = await this.demands.findOne({ where: { id, status: DemandStatus.PUBLISHED, deletedAt: IsNull() }, relations: demandRelations });
    if (!demand) throw new NotFoundException("需求不存在或暂不可对接");
    if (demand.deadline && demand.deadline <= new Date()) throw new ConflictException("该需求已截止");
    if (demand.author.id === actor.id) throw new BadRequestException("不能对接自己发布的需求");
    await this.compliance.assertCanConnect(actor.id);
    const matches = await this.compliance.scan(input.applyMsg);
    if (matches.length) throw new BadRequestException(`对接留言包含禁止内容：${matches.join("、")}`);
    const user = await this.user(actor.id);
    let connect = await this.connects.findOne({ where: { demand: { id }, applyUser: { id: actor.id } } });
    if (connect && connect.status !== DemandConnectStatus.CANCELLED) throw new ConflictException("你已提交过对接意向");
    const isNewAccount = Date.now() - user.createdAt.getTime() < 24 * 3_600_000;
    const isNewRecord = !connect;
    connect ??= this.connects.create({ demand, applyUser: user });
    Object.assign(connect, { applyMsg: cleanText(input.applyMsg), status: DemandConnectStatus.PENDING_VIEW, isAnomalous: isNewAccount, riskReason: isNewAccount ? "新账号对接申请" : null, countsTowardHeat: !isNewAccount, viewedAt: null });
    const saved = await this.connects.save(connect);
    if (isNewRecord && saved.countsTowardHeat) await this.demands.increment({ id }, "connectCount", 1);
    await Promise.all([this.notifications.create(demand.author.id, NotificationType.DEMAND_CONNECT_RECEIVED, "收到新的需求对接意向", `${user.displayName} 希望对接“${demand.title}”。`, "demand", demand.id), this.audit.record({ actor: { ...actor, displayName: user.displayName }, action: AuditAction.DEMAND_CONNECT, targetType: "demand", targetId: id, metadata: { connectId: saved.id, anomalous: saved.isAnomalous } })]);
    await this.heat.recalculate(id);
    return this.connectView(saved, demand, user);
  }

  async connectionsForDemand(id: string, actor: AuthUser) {
    const demand = await this.ownedDemand(id, actor.id);
    const items = await this.connects.find({ where: { demand: { id } }, relations: { applyUser: { roles: true }, demand: true }, order: { createdAt: "DESC" } });
    const newlyViewed = items.filter((item) => item.status === DemandConnectStatus.PENDING_VIEW);
    for (const item of newlyViewed) { item.status = DemandConnectStatus.VIEWED; item.viewedAt = new Date(); }
    if (newlyViewed.length) { await this.connects.save(newlyViewed); await Promise.all(newlyViewed.map((item) => this.notifications.create(item.applyUser.id, NotificationType.DEMAND_CONNECT_VIEWED, "需求方已查看你的对接意向", `“${demand.title}”的发布人已查看你的留言。`, "demand", demand.id))); }
    return items.map((item) => this.connectView(item, demand, item.applyUser));
  }

  async updateConnect(demandId: string, connectId: string, input: UpdateDemandConnectDto, actor: AuthUser) {
    const connect = await this.connects.findOne({ where: { id: connectId, demand: { id: demandId } }, relations: { demand: { author: { roles: true }, industries: true }, applyUser: { roles: true } } });
    if (!connect) throw new NotFoundException("对接记录不存在");
    const isOwner = connect.demand.author.id === actor.id;
    const isApplicant = connect.applyUser.id === actor.id;
    if (!isOwner && !isApplicant) throw new ForbiddenException("没有权限更新该对接记录");
    if (isApplicant && input.status !== DemandConnectStatus.CANCELLED) throw new ForbiddenException("申请人只能取消自己的对接意向");
    if (isOwner && ![DemandConnectStatus.VIEWED, DemandConnectStatus.COMMUNICATED, DemandConnectStatus.COMPLETED].includes(input.status)) throw new BadRequestException("需求方不能设置该状态");
    if (connect.status === DemandConnectStatus.CANCELLED) throw new ConflictException("已取消的对接记录不能继续更新");
    connect.status = input.status;
    if (!connect.viewedAt && isOwner) connect.viewedAt = new Date();
    const saved = await this.connects.save(connect);
    if (isOwner) await this.notifications.create(connect.applyUser.id, NotificationType.DEMAND_CONNECT_VIEWED, "需求对接状态更新", `“${connect.demand.title}”的对接状态已更新为 ${input.status}。`, "demand", demandId);
    await this.audit.record({ actor, action: AuditAction.DEMAND_CONNECT_STATUS, targetType: "demand_connect", targetId: connectId, metadata: { demandId, to: input.status } });
    return this.connectView(saved, connect.demand, connect.applyUser);
  }

  async myConnects(direction: "sent" | "received", actor: AuthUser) {
    const items = direction === "sent"
      ? await this.connects.find({ where: { applyUser: { id: actor.id } }, relations: { demand: { author: { roles: true }, industries: true }, applyUser: { roles: true } }, order: { createdAt: "DESC" } })
      : await this.connects.createQueryBuilder("connect").leftJoinAndSelect("connect.demand", "demand").leftJoinAndSelect("demand.author", "author").leftJoinAndSelect("author.roles", "authorRole").leftJoinAndSelect("demand.industries", "industry").leftJoinAndSelect("connect.applyUser", "applicant").leftJoinAndSelect("applicant.roles", "applicantRole").where("demand.user_id = :userId", { userId: actor.id }).orderBy("connect.createdAt", "DESC").getMany();
    return items.map((item) => this.connectView(item, item.demand, item.applyUser));
  }

  private async ownerTransition(id: string, actor: AuthUser, from: DemandStatus, to: DemandStatus) {
    const demand = await this.ownedDemand(id, actor.id);
    if (demand.status !== from) throw new ConflictException("当前状态不能执行此操作");
    demand.status = to; await this.demands.save(demand);
    await this.audit.record({ actor, action: AuditAction.DEMAND_STATUS_CHANGE, targetType: "demand", targetId: id, metadata: { from, to } });
    return this.ownerDemand(demand);
  }

  private async ownedDemand(id: string, userId: string) { const demand = await this.demands.findOne({ where: { id, deletedAt: IsNull() }, relations: demandRelations }); if (!demand) throw new NotFoundException("需求不存在"); if (demand.author.id !== userId) throw new ForbiddenException("只能管理自己发布的需求"); return demand; }
  private async user(id: string) { const user = await this.users.findOne({ where: { id, isActive: true }, relations: { roles: true } }); if (!user) throw new NotFoundException("用户不存在或已停用"); return user; }
  private async resolveIndustries(ids: string[]) { const values = await this.sections.findBy({ id: In([...new Set(ids)]), isActive: true }); if (values.length !== new Set(ids).size) throw new BadRequestException("包含不存在或已停用的行业分类"); return values; }
  private safeUser(user: User) { return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, industry: user.industry, company: user.company, jobTitle: user.jobTitle, certification: demandCertification(user) }; }
  private publicDemand(demand: OpcDemand, full: boolean) { return { id: demand.id, title: demand.title, content: full ? demand.content : demand.content.slice(0, 260), imageUrls: demand.imageUrls, industries: demand.industries.map((item) => ({ id: item.id, slug: item.slug, name: item.name })), demandType: demand.demandType, budgetRange: demand.budgetRange, deadline: demand.deadline, status: demand.status, topWeight: demand.topWeight, isPinned: demand.topWeight > 0, viewCount: demand.viewCount, connectCount: demand.connectCount, heatScore: Number(demand.heatScore), createdAt: demand.createdAt, updatedAt: demand.updatedAt, expired: Boolean(demand.deadline && demand.deadline <= new Date()), author: this.safeUser(demand.author) }; }
  private ownerDemand(demand: OpcDemand) { return { ...this.publicDemand(demand, true), contactInfo: demand.contactInfo, riskFlags: demand.riskFlags, reviewReason: demand.reviewReason, rulesAcceptedAt: demand.rulesAcceptedAt, reviewedAt: demand.reviewedAt }; }
  private connectView(connect: OpcDemandConnect, demand: OpcDemand, applicant: User) { return { id: connect.id, demand: this.publicDemand(demand, false), applicant: this.safeUser(applicant), applyMsg: connect.applyMsg, status: connect.status, viewedAt: connect.viewedAt, createdAt: connect.createdAt, updatedAt: connect.updatedAt }; }
}

function cleanText(value: string) { return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim(); }
