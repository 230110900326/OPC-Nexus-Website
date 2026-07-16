import { Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuditLog } from "../database/entities/audit-log.entity";
import { Creator } from "../database/entities/creator.entity";
import { EventRegistration } from "../database/entities/event-registration.entity";
import { Event } from "../database/entities/event.entity";
import { HomepageConfig, HomepageConfigKind, HomepageModuleKey } from "../database/entities/homepage-config.entity";
import { RecommendationEvent, RecommendationEventType } from "../database/entities/recommendation-event.entity";
import { SystemRole } from "../database/entities/role.entity";
import { RankingService } from "../ranking/ranking.service";
import { HomepageConfigService } from "../operations/homepage-config.service";
import { HomepageService } from "../operations/homepage.service";

describe("A-I operations integration", () => {
  it("flows from audited config creation to homepage exposure tracking", async () => {
    const rows: HomepageConfig[] = [];
    const audits: AuditLog[] = [];
    const recommendationEvents: RecommendationEvent[] = [];
    const auditRepository = { create: jest.fn((value) => value), save: jest.fn(async (value) => { audits.push(value as AuditLog); return value; }) } as unknown as Repository<AuditLog>;
    const configRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => { const saved = { id: "11111111-1111-4111-8111-111111111111", createdAt: new Date(), updatedAt: new Date(), ...value } as HomepageConfig; rows.push(saved); return saved; }),
      find: jest.fn(async () => rows),
    } as unknown as Repository<HomepageConfig>;
    const eventRepository = { create: jest.fn((value) => value), save: jest.fn(async (values: RecommendationEvent[]) => { recommendationEvents.push(...values); return values; }) } as unknown as Repository<RecommendationEvent>;
    const audit = new AuditService(auditRepository);
    const configService = new HomepageConfigService(configRepository, eventRepository, audit);
    const actor = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "operator@opc.local", roles: [SystemRole.OPERATOR] };
    await configService.create({ kind: HomepageConfigKind.BANNER, moduleKey: HomepageModuleKey.FOCUS, title: "OPC 今日焦点", targetUrl: "/discover", isOnline: true }, actor);
    const homepage = new HomepageService(configRepository, { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<Event>, { count: jest.fn() } as unknown as Repository<EventRegistration>, { find: jest.fn().mockResolvedValue([]) } as unknown as Repository<Creator>, { feed: jest.fn().mockResolvedValue([]) } as unknown as RankingService);
    const assembled = await homepage.assemble(new Date());
    await configService.track({ configIds: [assembled.banners[0].trackingId], eventType: RecommendationEventType.IMPRESSION, pagePath: "/" }, "integration-session");
    expect(assembled.banners[0].title).toBe("OPC 今日焦点");
    expect(audits).toHaveLength(1);
    expect(recommendationEvents).toHaveLength(1);
    expect(recommendationEvents[0].eventType).toBe(RecommendationEventType.IMPRESSION);
  });
});
