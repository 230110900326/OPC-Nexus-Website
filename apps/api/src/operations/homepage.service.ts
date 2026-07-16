import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { AuthorizationStatus, Creator } from "../database/entities/creator.entity";
import { EventRegistration, EventRegistrationStatus } from "../database/entities/event-registration.entity";
import { Event, EventStatus } from "../database/entities/event.entity";
import { HomepageConfig, HomepageConfigKind, HomepageModuleKey } from "../database/entities/homepage-config.entity";
import { FeedMode, RankScope, RankWindow } from "../ranking/dto/feed-query.dto";
import { RankingService } from "../ranking/ranking.service";

const defaultModules = [
  { moduleKey: HomepageModuleKey.RECOMMENDATIONS, title: "今日推荐", displayPosition: "main", sortOrder: 10, config: {} },
  { moduleKey: HomepageModuleKey.POLICIES, title: "政策精选", displayPosition: "main", sortOrder: 20, config: {} },
  { moduleKey: HomepageModuleKey.VIDEOS, title: "热门视频", displayPosition: "main", sortOrder: 30, config: {} },
  { moduleKey: HomepageModuleKey.DISCUSSIONS, title: "社区热议", displayPosition: "main", sortOrder: 40, config: {} },
  { moduleKey: HomepageModuleKey.EVENTS, title: "近期活动", displayPosition: "main", sortOrder: 50, config: {} },
  { moduleKey: HomepageModuleKey.CREATORS, title: "推荐作者", displayPosition: "main", sortOrder: 60, config: {} },
] as const;

@Injectable()
export class HomepageService {
  constructor(
    @InjectRepository(HomepageConfig) private readonly configs: Repository<HomepageConfig>,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(EventRegistration) private readonly registrations: Repository<EventRegistration>,
    @InjectRepository(Creator) private readonly creators: Repository<Creator>,
    private readonly ranking: RankingService,
  ) {}

  async assemble(now = new Date()) {
    const [configs, recommendations, policies, videos, discussions, events, creators] = await Promise.all([
      this.configs.find({ order: { sortOrder: "ASC", updatedAt: "DESC" } }),
      this.ranking.feed({ mode: FeedMode.RECOMMENDED, scope: RankScope.ALL, window: RankWindow.WEEK }),
      this.ranking.feed({ mode: FeedMode.HOT, scope: RankScope.POLICY, window: RankWindow.WEEK }),
      this.ranking.feed({ mode: FeedMode.HOT, scope: RankScope.VIDEO, window: RankWindow.WEEK }),
      this.ranking.feed({ mode: FeedMode.HOT, scope: RankScope.COMMUNITY, window: RankWindow.WEEK }),
      this.events.find({ where: { status: EventStatus.PUBLISHED, startsAt: MoreThan(now) }, relations: { organizer: true }, order: { startsAt: "ASC" }, take: 6 }),
      this.creators.find({ where: { isEnabled: true, authorizationStatus: AuthorizationStatus.AUTHORIZED }, relations: { accounts: true }, order: { trustLevel: "DESC", createdAt: "ASC" }, take: 6 }),
    ]);

    const active = configs.filter((config) => isHomepageConfigActive(config, now));
    const banners = active.filter((config) => config.kind === HomepageConfigKind.BANNER).map(publicConfig);
    const manualRecommendations = active.filter((config) => config.kind === HomepageConfigKind.RECOMMENDATION).map(publicConfig);
    const modules = resolveModules(configs, now);
    const upcomingEvents = await Promise.all(events.map(async (event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      coverUrl: event.coverUrl,
      locationName: event.locationName,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      registrationDeadline: event.registrationDeadline,
      capacity: event.capacity,
      registrationCount: await this.registrations.count({ where: { event: { id: event.id }, status: EventRegistrationStatus.CONFIRMED } }),
      organizer: { id: event.organizer.id, displayName: event.organizer.displayName },
      url: `/events/${event.id}`,
    })));

    return {
      generatedAt: now,
      banners,
      modules,
      manualRecommendations,
      sections: {
        recommendations: recommendations.slice(0, 8),
        policies: policies.slice(0, 4),
        videos: videos.slice(0, 4),
        discussions: discussions.slice(0, 5),
        events: upcomingEvents,
        creators: creators.map((creator) => ({
          id: creator.id,
          name: creator.name,
          avatarUrl: creator.avatarUrl,
          industries: creator.industries,
          trustLevel: creator.trustLevel,
          platforms: creator.accounts.filter((account) => account.isEnabled).map((account) => account.platform),
        })),
      },
    };
  }
}

export function isHomepageConfigActive(config: Pick<HomepageConfig, "isOnline" | "effectiveFrom" | "effectiveTo">, now = new Date()) {
  return config.isOnline && (!config.effectiveFrom || config.effectiveFrom <= now) && (!config.effectiveTo || config.effectiveTo >= now);
}

function resolveModules(configs: HomepageConfig[], now: Date) {
  const configured = configs.filter((config) => config.kind === HomepageConfigKind.MODULE);
  const modules: { moduleKey: HomepageModuleKey; title: string; displayPosition: string; sortOrder: number; config: Record<string, unknown>; source: "default" | "configured" }[] = [];
  for (const fallback of defaultModules) {
    const candidates = configured.filter((config) => config.moduleKey === fallback.moduleKey);
    if (!candidates.length) { modules.push({ ...fallback, source: "default" }); continue; }
    const active = candidates.find((config) => isHomepageConfigActive(config, now));
    if (active) modules.push({ moduleKey: active.moduleKey, title: active.title, displayPosition: active.displayPosition, sortOrder: active.sortOrder, config: active.config, source: "configured" });
  }
  return modules.sort((a, b) => a.sortOrder - b.sortOrder);
}

function publicConfig(config: HomepageConfig) {
  return {
    id: config.id,
    trackingId: config.id,
    kind: config.kind,
    moduleKey: config.moduleKey,
    title: config.title,
    subtitle: config.subtitle,
    targetUrl: config.targetUrl,
    imageUrl: config.imageUrl,
    displayPosition: config.displayPosition,
    sortOrder: config.sortOrder,
    contentType: config.contentType,
    contentId: config.contentId,
    config: config.config,
  };
}
