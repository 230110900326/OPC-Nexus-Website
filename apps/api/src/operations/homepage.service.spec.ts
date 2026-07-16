import { Repository } from "typeorm";
import { AuthorizationStatus, Creator } from "../database/entities/creator.entity";
import { EventRegistration } from "../database/entities/event-registration.entity";
import { Event, EventStatus } from "../database/entities/event.entity";
import { HomepageConfig, HomepageConfigKind, HomepageModuleKey } from "../database/entities/homepage-config.entity";
import { FeedMode, RankScope } from "../ranking/dto/feed-query.dto";
import { RankingService } from "../ranking/ranking.service";
import { HomepageService, isHomepageConfigActive } from "./homepage.service";

describe("Stage I homepage assembly", () => {
  const now = new Date("2026-07-16T08:00:00.000Z");
  it("applies online and effective-time boundaries", () => {
    expect(isHomepageConfigActive({ isOnline: true, effectiveFrom: new Date("2026-07-16T07:00:00Z"), effectiveTo: new Date("2026-07-16T09:00:00Z") }, now)).toBe(true);
    expect(isHomepageConfigActive({ isOnline: false, effectiveFrom: null, effectiveTo: null }, now)).toBe(false);
    expect(isHomepageConfigActive({ isOnline: true, effectiveFrom: new Date("2026-07-16T09:00:00Z"), effectiveTo: null }, now)).toBe(false);
    expect(isHomepageConfigActive({ isOnline: true, effectiveFrom: null, effectiveTo: new Date("2026-07-16T07:59:59Z") }, now)).toBe(false);
  });

  it("combines configured focus, ranked content, events and authorized creators", async () => {
    const configRows = [
      { id: "11111111-1111-4111-8111-111111111111", kind: HomepageConfigKind.BANNER, moduleKey: HomepageModuleKey.FOCUS, title: "今日焦点", subtitle: "OPC 信号", targetUrl: "/discover", imageUrl: null, displayPosition: "main", sortOrder: 1, contentType: null, contentId: null, isOnline: true, effectiveFrom: null, effectiveTo: null, config: {}, updatedAt: now },
      { id: "22222222-2222-4222-8222-222222222222", kind: HomepageConfigKind.MODULE, moduleKey: HomepageModuleKey.POLICIES, title: "政策雷达", displayPosition: "main", sortOrder: 5, isOnline: true, effectiveFrom: null, effectiveTo: null, config: {}, updatedAt: now },
      { id: "33333333-3333-4333-8333-333333333333", kind: HomepageConfigKind.MODULE, moduleKey: HomepageModuleKey.VIDEOS, title: "暂不显示", displayPosition: "main", sortOrder: 6, isOnline: false, effectiveFrom: null, effectiveTo: null, config: {}, updatedAt: now },
    ] as HomepageConfig[];
    const configs = { find: jest.fn().mockResolvedValue(configRows) } as unknown as Repository<HomepageConfig>;
    const event = { id: "44444444-4444-4444-8444-444444444444", title: "OPC 经营会", description: "活动", coverUrl: null, locationName: "上海", startsAt: new Date("2026-07-20T08:00:00Z"), endsAt: new Date("2026-07-20T10:00:00Z"), registrationDeadline: null, capacity: 30, status: EventStatus.PUBLISHED, organizer: { id: "55555555-5555-4555-8555-555555555555", displayName: "运营员" } } as Event;
    const events = { find: jest.fn().mockResolvedValue([event]) } as unknown as Repository<Event>;
    const registrations = { count: jest.fn().mockResolvedValue(7) } as unknown as Repository<EventRegistration>;
    const creator = { id: "66666666-6666-4666-8666-666666666666", name: "OPC 作者", avatarUrl: null, industries: ["财经"], trustLevel: 5, authorizationStatus: AuthorizationStatus.AUTHORIZED, isEnabled: true, accounts: [{ platform: "bilibili", isEnabled: true }] } as Creator;
    const creators = { find: jest.fn().mockResolvedValue([creator]) } as unknown as Repository<Creator>;
    const feedItem = { id: "77777777-7777-4777-8777-777777777777", contentType: "article", title: "一人公司经营", excerpt: "摘要", url: "/articles/opc", coverImageUrl: null, source: "OPC", industry: "财经", publishedAt: now, heat: 88, reason: "重点主题", metrics: { likes: 1, comments: 1, favorites: 1, shares: 1, reads: 10 } };
    const ranking = { feed: jest.fn(async (input: { mode: FeedMode; scope: RankScope }) => [{ ...feedItem, contentType: input.scope === RankScope.POLICY ? "policy" : input.scope === RankScope.VIDEO ? "video" : input.scope === RankScope.COMMUNITY ? "post" : "article" }]) } as unknown as RankingService;
    const result = await new HomepageService(configs, events, registrations, creators, ranking).assemble(now);
    expect(result.banners[0].title).toBe("今日焦点");
    expect(result.modules.find((item) => item.moduleKey === HomepageModuleKey.POLICIES)?.title).toBe("政策雷达");
    expect(result.modules.some((item) => item.moduleKey === HomepageModuleKey.VIDEOS)).toBe(false);
    expect(result.sections.events[0]).toEqual(expect.objectContaining({ registrationCount: 7, url: `/events/${event.id}` }));
    expect(result.sections.creators[0]).toEqual(expect.objectContaining({ name: "OPC 作者", platforms: ["bilibili"] }));
    expect(ranking.feed).toHaveBeenCalledTimes(4);
  });
});
