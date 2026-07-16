import { Repository } from "typeorm";
import { AuditAction } from "../database/entities/audit-log.entity";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { ForumSection } from "../database/entities/forum-section.entity";
import { ModerationLog } from "../database/entities/moderation-log.entity";
import { NotificationType } from "../database/entities/notification.entity";
import { OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { DemandBudgetRange, DemandStatus, DemandType, OpcDemand } from "../database/entities/opc-demand.entity";
import { Report } from "../database/entities/report.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { DemandAdminService } from "../demands/demand-admin.service";
import { DemandComplianceService } from "../demands/demand-compliance.service";
import { DemandsService } from "../demands/demands.service";
import { DemandReviewAction } from "../demands/dto/review-demand.dto";

describe("Stage J demand marketplace integration", () => {
  it("flows from a compliant draft through review to a recorded matching request", async () => {
    const ownerId = "10000000-0000-4000-8000-000000000001";
    const applicantId = "10000000-0000-4000-8000-000000000003";
    const demandId = "10000000-0000-4000-8000-000000000801";
    const section = { id: "10000000-0000-4000-8000-000000000040", slug: "technology-industry", name: "科技与产业", isActive: true } as ForumSection;
    const owner = { id: ownerId, email: "owner@opc.local", displayName: "需求方", avatarUrl: null, industry: "科技", company: "OPC", jobTitle: "研究员", isActive: true, createdAt: new Date("2025-01-01"), roles: [{ name: SystemRole.USER }] } as User;
    const applicant = { id: applicantId, email: "partner@opc.local", displayName: "协作者", avatarUrl: null, industry: "制造业", company: "独立顾问", jobTitle: "访谈顾问", isActive: true, createdAt: new Date("2025-01-01"), roles: [{ name: SystemRole.USER }] } as User;
    const operator = { id: "10000000-0000-4000-8000-000000000002", email: "operator@opc.local", roles: [SystemRole.OPERATOR] };
    let storedDemand: OpcDemand | null = null;
    let storedConnect: OpcDemandConnect | null = null;
    const notifications: { userId: string; type: NotificationType }[] = [];
    const audits: AuditAction[] = [];

    const demandQuery = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getCount: jest.fn().mockResolvedValue(0) };
    const demandRepository = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((value) => ({ id: demandId, topWeight: 0, viewCount: 0, connectCount: 0, heatScore: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), ...value })),
      save: jest.fn(async (value: OpcDemand) => { storedDemand = value; storedDemand.updatedAt = new Date(); return storedDemand; }),
      findOne: jest.fn(async () => storedDemand),
      increment: jest.fn(async (_criteria, field: keyof OpcDemand, amount: number) => { if (storedDemand) (storedDemand[field] as number) += amount; }),
      createQueryBuilder: jest.fn(() => demandQuery),
    } as unknown as Repository<OpcDemand>;
    const connectRepository = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(async () => storedConnect),
      create: jest.fn((value) => ({ id: "10000000-0000-4000-8000-000000000811", createdAt: new Date(), updatedAt: new Date(), ...value })),
      save: jest.fn(async (value: OpcDemandConnect) => { storedConnect = value; return value; }),
    } as unknown as Repository<OpcDemandConnect>;
    const config = { id: "10000000-0000-4000-8000-000000000010", prohibitedKeywords: ["荐股", "保证收益"], normalDailyLimit: 3, verifiedDailyLimit: 10, connectDailyLimit: 20, maxPinned: 10, allowPhone: true } as DemandBoardConfig;
    const configRepository = { findOne: jest.fn().mockResolvedValue(config) } as unknown as Repository<DemandBoardConfig>;
    const sectionRepository = { findBy: jest.fn().mockResolvedValue([section]) } as unknown as Repository<ForumSection>;
    const userRepository = { findOne: jest.fn(async ({ where }: { where: { id: string } }) => where.id === ownerId ? owner : applicant) } as unknown as Repository<User>;
    const compliance = new DemandComplianceService(configRepository, demandRepository, connectRepository);
    const heat = { recalculate: jest.fn().mockResolvedValue(80), recalculatePublished: jest.fn().mockResolvedValue({ updated: 1 }) };
    const notificationService = { create: jest.fn(async (userId: string, type: NotificationType) => { notifications.push({ userId, type }); }) };
    const auditService = { record: jest.fn(async ({ action }: { action: AuditAction }) => { audits.push(action); }) };
    const demands = new DemandsService(demandRepository, connectRepository, sectionRepository, userRepository, compliance, heat as never, notificationService as never, auditService as never, { recordDelta: jest.fn() } as never);
    const admin = new DemandAdminService(demandRepository, connectRepository, configRepository, sectionRepository, { create: jest.fn((value) => value), save: jest.fn() } as unknown as Repository<ModerationLog>, { find: jest.fn(), count: jest.fn() } as unknown as Repository<Report>, compliance, heat as never, notificationService as never, auditService as never);

    const created = await demands.create({ title: "寻找 AI 行业访谈协作者", content: "需要在两周内完成六位企业服务从业者访谈，并交付访谈纪要和核心判断。", demandType: DemandType.RESEARCH_COLLECTION, budgetRange: DemandBudgetRange.FROM_2000_TO_10000, industryIds: [section.id], contactInfo: [{ type: "wechat" as never, value: "opc_researcher" }], deadline: new Date(Date.now() + 7 * 86_400_000).toISOString(), agreeToRules: true }, { id: ownerId, email: owner.email, roles: [SystemRole.USER] });
    expect(created.status).toBe(DemandStatus.DRAFT);
    await demands.submit(demandId, { id: ownerId, email: owner.email, roles: [SystemRole.USER] });
    expect((storedDemand as unknown as OpcDemand).status).toBe(DemandStatus.PENDING_REVIEW);
    await admin.review(demandId, { action: DemandReviewAction.APPROVE }, operator);
    expect((storedDemand as unknown as OpcDemand).status).toBe(DemandStatus.PUBLISHED);

    const connected = await demands.connect(demandId, { applyMsg: "我有企业服务访谈经验，可按期完成访谈、逐字纪要和结构化结论。" }, { id: applicantId, email: applicant.email, roles: [SystemRole.USER] });
    expect(connected.status).toBe("pending_view");
    expect((storedDemand as unknown as OpcDemand).connectCount).toBe(1);
    expect(notifications.map((item) => item.type)).toEqual(expect.arrayContaining([NotificationType.DEMAND_REVIEW_RESULT, NotificationType.DEMAND_CONNECT_RECEIVED]));
    expect(audits).toEqual(expect.arrayContaining([AuditAction.DEMAND_CREATE, AuditAction.DEMAND_SUBMIT, AuditAction.DEMAND_REVIEW, AuditAction.DEMAND_CONNECT]));
  });
});
