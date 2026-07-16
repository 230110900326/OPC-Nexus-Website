import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { SystemRole } from "../database/entities/role.entity";
import { HomepageConfig, HomepageConfigKind, HomepageModuleKey } from "../database/entities/homepage-config.entity";
import { RecommendationEvent, RecommendationEventType } from "../database/entities/recommendation-event.entity";
import { HomepageConfigService } from "./homepage-config.service";

describe("Stage I homepage configuration", () => {
  const savedEvents: RecommendationEvent[] = [];
  const configs = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: "11111111-1111-4111-8111-111111111111", ...value })), find: jest.fn(), findOneBy: jest.fn(), remove: jest.fn() } as unknown as Repository<HomepageConfig>;
  const events = { create: jest.fn((value) => value), save: jest.fn(async (values: RecommendationEvent[]) => { savedEvents.push(...values); return values; }) } as unknown as Repository<RecommendationEvent>;
  const audit = { record: jest.fn() };
  const service = new HomepageConfigService(configs, events, audit as never);
  const actor = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "operator@opc.local", roles: [SystemRole.OPERATOR] };
  beforeEach(() => { jest.clearAllMocks(); savedEvents.length = 0; });

  it("rejects an inverted effective-time window", async () => {
    await expect(service.create({ kind: HomepageConfigKind.BANNER, moduleKey: HomepageModuleKey.FOCUS, title: "焦点", effectiveFrom: "2026-07-17T00:00:00Z", effectiveTo: "2026-07-16T00:00:00Z" }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("creates an online config and records the actor action", async () => {
    const result = await service.create({ kind: HomepageConfigKind.RECOMMENDATION, moduleKey: HomepageModuleKey.RECOMMENDATIONS, title: "人工精选", targetUrl: "/discover", isOnline: true }, actor);
    expect(result).toEqual(expect.objectContaining({ title: "人工精选", isOnline: true }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actor, targetType: "homepage_config" }));
  });

  it("records only active banner or recommendation events", async () => {
    const active = { id: "11111111-1111-4111-8111-111111111111", kind: HomepageConfigKind.BANNER, isOnline: true, effectiveFrom: null, effectiveTo: null } as HomepageConfig;
    const offline = { id: "22222222-2222-4222-8222-222222222222", kind: HomepageConfigKind.RECOMMENDATION, isOnline: false, effectiveFrom: null, effectiveTo: null } as HomepageConfig;
    (configs.find as jest.Mock).mockResolvedValue([active, offline]);
    const result = await service.track({ configIds: [active.id, offline.id], eventType: RecommendationEventType.IMPRESSION, pagePath: "/" }, "session-a");
    expect(result.recorded).toBe(1);
    expect(savedEvents[0]).toEqual(expect.objectContaining({ homepageConfig: active, eventType: RecommendationEventType.IMPRESSION, pagePath: "/" }));
    expect(savedEvents[0].sessionHash).toHaveLength(64);
  });
});
