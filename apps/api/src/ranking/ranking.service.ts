import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { Article, ArticleStatus, ArticleType } from "../database/entities/article.entity";
import { ContentMetric, MetricContentType, MetricSource } from "../database/entities/content-metric.entity";
import { Follow } from "../database/entities/follow.entity";
import { DemandStatus, OpcDemand } from "../database/entities/opc-demand.entity";
import { Post, PostStatus } from "../database/entities/post.entity";
import { User } from "../database/entities/user.entity";
import { Video } from "../database/entities/video.entity";
import { CreateMetricDto } from "./dto/create-metric.dto";
import { FeedMode, FeedQueryDto, RankScope, RankWindow } from "./dto/feed-query.dto";
import { calculateHeat, percentile } from "./heat-score";

export type FeedItem = {
  id: string;
  contentType: "article" | "policy" | "video" | "post" | "demand";
  title: string;
  excerpt: string;
  url: string;
  coverImageUrl: string | null;
  source: string;
  industry: string | null;
  publishedAt: Date;
  heat: number;
  reason: string;
  metrics: { likes: number; comments: number; favorites: number; shares: number; reads: number };
};

type Candidate = {
  id: string;
  type: FeedItem["contentType"];
  title: string;
  excerpt: string;
  url: string;
  cover: string | null;
  source: string;
  industry: string | null;
  publishedAt: Date;
  ownerId: string;
  keywordMatch: number;
  trust: number;
  externalViews: number;
  externalLikes: number;
  normalizationGroup: string;
  fixedHeat?: number;
};

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(ContentMetric) private readonly metrics: Repository<ContentMetric>,
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>,
    @InjectRepository(Follow) private readonly follows: Repository<Follow>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  record(input: CreateMetricDto) {
    return this.metrics.save(this.metrics.create({
      ...input,
      source: input.source ?? MetricSource.INTERNAL,
      readCount: input.readCount ?? 0,
      likeCount: input.likeCount ?? 0,
      commentCount: input.commentCount ?? 0,
      favoriteCount: input.favoriteCount ?? 0,
      shareCount: input.shareCount ?? 0,
      externalViewCount: input.externalViewCount ?? 0,
      externalLikeCount: input.externalLikeCount ?? 0,
      editorScore: input.editorScore ?? 0,
      sourceTrust: input.sourceTrust ?? 0.5,
      syncedAt: input.syncedAt ? new Date(input.syncedAt) : new Date(),
    }));
  }

  async recordDelta(contentType: MetricContentType, contentId: string, delta: Partial<Pick<ContentMetric, "readCount" | "likeCount" | "commentCount" | "favoriteCount" | "shareCount">>) {
    const latest = await this.metrics.findOne({ where: { contentType, contentId, source: MetricSource.INTERNAL }, order: { syncedAt: "DESC" } });
    return this.record({
      contentType,
      contentId,
      source: MetricSource.INTERNAL,
      readCount: Math.max(0, (latest?.readCount ?? 0) + (delta.readCount ?? 0)),
      likeCount: Math.max(0, (latest?.likeCount ?? 0) + (delta.likeCount ?? 0)),
      commentCount: Math.max(0, (latest?.commentCount ?? 0) + (delta.commentCount ?? 0)),
      favoriteCount: Math.max(0, (latest?.favoriteCount ?? 0) + (delta.favoriteCount ?? 0)),
      shareCount: Math.max(0, (latest?.shareCount ?? 0) + (delta.shareCount ?? 0)),
      externalViewCount: latest?.externalViewCount ?? 0,
      externalLikeCount: latest?.externalLikeCount ?? 0,
      editorScore: Number(latest?.editorScore ?? 0),
      sourceTrust: Number(latest?.sourceTrust ?? 0.5),
    });
  }

  async feed(input: FeedQueryDto, userId?: string) {
    let items = await this.candidates(input.scope);
    const user = userId ? await this.users.findOneBy({ id: userId }) : null;
    const followed = userId ? await this.follows.find({ where: { follower: { id: userId } } }) : [];
    if (input.mode === FeedMode.FOLLOWING) {
      const ids = new Set(followed.map((item) => item.targetId));
      items = items.filter((item) => ids.has(item.ownerId));
    }
    const scored = await Promise.all(items.map((item) => this.score(item, input, user, items)));
    scored.sort((a, b) => input.mode === FeedMode.LATEST ? b.publishedAt.getTime() - a.publishedAt.getTime() : b.heat - a.heat);
    return scored.slice(0, 50);
  }

  async rankings(input: FeedQueryDto) {
    const hours = input.window === RankWindow.DAY ? 24 : input.window === RankWindow.MONTH ? 720 : 168;
    const items = await this.feed({ ...input, mode: FeedMode.HOT });
    return items.filter((item) => Date.now() - item.publishedAt.getTime() <= hours * 3_600_000).map((item, index) => ({ ...item, rank: index + 1, previousRank: null, updatedAt: new Date() }));
  }

  private async candidates(scope: RankScope): Promise<Candidate[]> {
    const [articles, videos, posts, demands] = await Promise.all([
      [RankScope.VIDEO, RankScope.COMMUNITY, RankScope.DEMAND].includes(scope) ? [] : this.articles.find({ where: { status: ArticleStatus.PUBLISHED, publishedAt: LessThanOrEqual(new Date()) }, relations: { category: true, tags: true, sources: true, operator: true }, order: { publishedAt: "DESC" }, take: 60 }),
      scope !== RankScope.ALL && scope !== RankScope.VIDEO ? [] : this.videos.find({ where: { isPublished: true }, relations: { creatorAccount: { creator: true } }, order: { publishedAt: "DESC" }, take: 60 }),
      scope !== RankScope.ALL && scope !== RankScope.COMMUNITY ? [] : this.posts.find({ where: { status: PostStatus.PUBLISHED }, relations: { author: true, section: true }, order: { createdAt: "DESC" }, take: 60 }),
      scope !== RankScope.ALL && scope !== RankScope.DEMAND ? [] : this.demands.find({ where: { status: DemandStatus.PUBLISHED }, relations: { author: { roles: true }, industries: true }, order: { createdAt: "DESC" }, take: 60 }),
    ]);

    const articleItems: Candidate[] = articles
      .filter((item) => scope === RankScope.ALL || (scope === RankScope.POLICY ? item.type === ArticleType.POLICY : scope === RankScope.NEWS ? item.type !== ArticleType.POLICY : true))
      .map((item) => {
        const publishedAt = item.publishedAt ?? item.createdAt;
        const type = item.type === ArticleType.POLICY ? "policy" as const : "article" as const;
        const industry = item.category?.name ?? null;
        return { id: item.id, type, title: item.title, excerpt: item.summary, url: `/articles/${item.slug}`, cover: item.coverImageUrl, source: item.sources[0]?.name ?? "OPC 编辑部", industry, publishedAt, ownerId: item.operator?.id ?? "", keywordMatch: Object.keys(item.classification ?? {}).length ? Math.max(...Object.values(item.classification)) : 0, trust: 0.7, externalViews: 0, externalLikes: 0, normalizationGroup: `${type}:${industry ?? "综合"}:${publishedAt.toISOString().slice(0, 7)}` };
      });
    const videoItems: Candidate[] = videos.map((item) => {
      const publishedAt = item.publishedAt ?? item.createdAt;
      const industry = item.industryTags[0] ?? item.creatorAccount.creator.industries[0] ?? null;
      return { id: item.id, type: "video", title: item.title, excerpt: item.contentSummary ?? item.platformDescription, url: item.originalUrl, cover: item.coverUrl, source: item.creatorAccount.creator.name, industry, publishedAt, ownerId: item.creatorAccount.creator.id, keywordMatch: item.industryTags.some((tag) => tag.includes("OPC")) ? 1 : 0, trust: item.creatorAccount.creator.trustLevel / 5, externalViews: item.platformMetrics.views ?? 0, externalLikes: item.platformMetrics.likes ?? 0, normalizationGroup: `video:${item.platform}:${industry ?? "综合"}:${publishedAt.toISOString().slice(0, 7)}` };
    });
    const postItems: Candidate[] = posts.map((item) => ({ id: item.id, type: "post", title: item.title, excerpt: item.body.slice(0, 240), url: `/community/posts/${item.id}`, cover: null, source: item.author.displayName, industry: item.section.name, publishedAt: item.createdAt, ownerId: item.author.id, keywordMatch: /OPC|一人公司|超级个体/.test(`${item.title}${item.body}`) ? 1 : 0, trust: 0.5, externalViews: 0, externalLikes: 0, normalizationGroup: `post:${item.section.name}:${item.createdAt.toISOString().slice(0, 7)}` }));
    const demandItems: Candidate[] = demands.map((item) => ({ id: item.id, type: "demand", title: item.title, excerpt: item.content.slice(0, 240), url: `/demands/${item.id}`, cover: item.imageUrls[0] ?? null, source: item.author.displayName, industry: item.industries[0]?.name ?? null, publishedAt: item.createdAt, ownerId: item.author.id, keywordMatch: /OPC|一人公司|超级个体/.test(`${item.title}${item.content}`) ? 1 : 0, trust: item.author.roles.length ? 0.65 : 0.5, externalViews: 0, externalLikes: 0, normalizationGroup: `demand:${item.industries[0]?.name ?? "综合"}:${item.createdAt.toISOString().slice(0, 7)}`, fixedHeat: Number(item.heatScore) }));
    return [...articleItems, ...videoItems, ...postItems, ...demandItems];
  }

  private async score(item: Candidate, input: FeedQueryDto, user: User | null, candidates: Candidate[]): Promise<FeedItem> {
    const metricType = item.type === "policy" ? MetricContentType.POLICY : item.type as MetricContentType;
    const metric = await this.metrics.findOne({ where: { contentType: metricType, contentId: item.id }, order: { syncedAt: "DESC" } });
    const industryMatch = Boolean(input.industry && item.industry?.includes(input.industry)) || Boolean(user?.industry && item.industry?.includes(user.industry));
    const externalViews = metric?.externalViewCount ?? item.externalViews;
    const externalLikes = metric?.externalLikeCount ?? item.externalLikes;
    const peers = candidates.filter((candidate) => candidate.normalizationGroup === item.normalizationGroup);
    const heat = item.type === "demand" ? item.fixedHeat ?? 0 : calculateHeat({
      likes: metric?.likeCount ?? 0,
      comments: metric?.commentCount ?? 0,
      favorites: metric?.favoriteCount ?? 0,
      shares: metric?.shareCount ?? 0,
      reads: metric?.readCount ?? 0,
      externalViews,
      externalLikes,
      externalViewPercentile: percentile(externalViews, peers.map((peer) => peer.externalViews)),
      externalLikePercentile: percentile(externalLikes, peers.map((peer) => peer.externalLikes)),
      ageHours: Math.max(0, (Date.now() - item.publishedAt.getTime()) / 3_600_000),
      keywordMatch: Math.max(item.keywordMatch, industryMatch ? 1 : 0),
      sourceTrust: Number(metric?.sourceTrust ?? item.trust),
      editorScore: Number(metric?.editorScore ?? 0),
      contentType: item.type,
    });
    const reason = input.mode === FeedMode.LATEST ? "最新发布" : input.mode === FeedMode.FOLLOWING ? "来自你的关注" : industryMatch ? `与你关注的${item.industry}相关` : item.type === "demand" ? "供需对接热度较高" : item.keywordMatch > 0 ? "命中 OPC 重点主题" : "全站热度较高";
    return { id: item.id, contentType: item.type, title: item.title, excerpt: item.excerpt, url: item.url, coverImageUrl: item.cover, source: item.source, industry: item.industry, publishedAt: item.publishedAt, heat, reason, metrics: { likes: metric?.likeCount ?? 0, comments: metric?.commentCount ?? 0, favorites: metric?.favoriteCount ?? 0, shares: metric?.shareCount ?? 0, reads: metric?.readCount ?? 0 } };
  }
}
