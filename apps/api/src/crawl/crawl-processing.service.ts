import { BadRequestException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "crypto";
import { Repository } from "typeorm";
import { Article, ArticleStatus, ArticleType } from "../database/entities/article.entity";
import { ArticleSource } from "../database/entities/article-source.entity";
import { ContentKeyword } from "../database/entities/content-keyword.entity";
import { CrawlDiscovery } from "../database/entities/crawl-discovery.entity";
import { CrawlAuthorizationStatus, CrawlSource } from "../database/entities/crawl-source.entity";
import { LinkCheck } from "../database/entities/link-check.entity";
import { AuthorizationStatus, Creator } from "../database/entities/creator.entity";
import { CreatorAccount, VideoPlatform } from "../database/entities/creator-account.entity";
import { Video } from "../database/entities/video.entity";
import { ContentFormattingService } from "../content-formatting/content-formatting.service";
import { IngestCrawlArticleDto } from "./dto/ingest-crawl-article.dto";
import { IngestCrawlVideoDto } from "./dto/ingest-crawl-video.dto";

@Injectable()
export class CrawlProcessingService {
  private readonly logger = new Logger(CrawlProcessingService.name);

  constructor(
    @InjectRepository(Article) private readonly articles: Repository<Article>,
    @InjectRepository(ArticleSource) private readonly articleSources: Repository<ArticleSource>,
    @InjectRepository(CrawlSource) private readonly sources: Repository<CrawlSource>,
    @InjectRepository(CrawlDiscovery) private readonly discoveries: Repository<CrawlDiscovery>,
    @InjectRepository(ContentKeyword) private readonly keywords: Repository<ContentKeyword>,
    @InjectRepository(LinkCheck) private readonly linkChecks: Repository<LinkCheck>,
    @InjectRepository(Creator) private readonly creators: Repository<Creator>,
    @InjectRepository(CreatorAccount) private readonly creatorAccounts: Repository<CreatorAccount>,
    @InjectRepository(Video) private readonly videos: Repository<Video>,
    @Optional() private readonly formatter?: ContentFormattingService,
  ) {}
  async saveDiscoveries(sourceId: string, urls: string[]) { const source = await this.sources.findOneBy({ id: sourceId }); if (!source) throw new NotFoundException("采集来源不存在"); const created: CrawlDiscovery[] = []; for (const url of [...new Set(urls)]) { if (!url.startsWith("http")) continue; const existing = await this.discoveries.findOne({ where: { source: { id: sourceId }, url } }); if (!existing) created.push(this.discoveries.create({ source, url, queuedAt: null })); } return this.discoveries.save(created); }
  async ingest(input: IngestCrawlArticleDto) { const source = await this.sources.findOneBy({ id: input.sourceId }); if (!source?.isEnabled || source.authorizationStatus !== CrawlAuthorizationStatus.AUTHORIZED) throw new BadRequestException("采集来源不存在、未授权或未启用"); if (source.type === "video") throw new BadRequestException("视频来源不能写入文章频道"); const canonicalUrl = input.canonicalUrl ?? input.originalUrl; const fingerprint = this.fingerprint(input.content); const duplicate = await this.articles.createQueryBuilder("article").where("article.canonical_url = :canonicalUrl OR article.content_fingerprint = :fingerprint", { canonicalUrl, fingerprint }).getOne(); if (duplicate) { await this.appendSource(duplicate.id, source.name, input.originalUrl); return { article: duplicate, duplicateOf: duplicate.id }; }
    const agentAnalysis = input.agentAnalysis ?? {}; const decision = typeof agentAnalysis.decision === "string" ? agentAnalysis.decision : null; if (decision === "irrelevant") return { article: null, duplicateOf: null, filtered: true };
    const classification = await this.classify(`${input.title}\n${input.content}`); const fallbackSummary = this.summary(input.content); const agentSummary = typeof agentAnalysis.core_summary === "string" ? agentAnalysis.core_summary.trim().slice(0, 800) : ""; const matchedTerms = Array.isArray(agentAnalysis.matched_terms) ? agentAnalysis.matched_terms.filter((value): value is string => typeof value === "string").slice(0, 30) : []; const affectedEntities = Array.isArray(agentAnalysis.affected_entities) ? agentAnalysis.affected_entities.filter((value): value is string => typeof value === "string").slice(0, 30) : []; const heatScore = typeof agentAnalysis.heat_score === "number" ? Math.max(0, Math.min(100, agentAnalysis.heat_score)) : 0; const agentVersion = typeof agentAnalysis.agent_version === "string" ? agentAnalysis.agent_version.slice(0, 40) : null; const slug = `crawl-${createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 16)}`; const isPublished = source.autoPublish && decision !== "review";
    // 政策自动归类：优先采纳智能体的 policy / policy_interpretation 分类，而不只依赖采集源类型
    const requestedType = input.type ?? ArticleType.NEWS; const agentCategory = typeof agentAnalysis.category === "string" ? agentAnalysis.category : ""; const type = requestedType === ArticleType.POLICY || agentCategory === "policy" || agentCategory === "policy_interpretation" ? ArticleType.POLICY : requestedType;
    const policyIssuer = type === ArticleType.POLICY && typeof agentAnalysis.issuing_authority === "string" && agentAnalysis.issuing_authority.trim() ? agentAnalysis.issuing_authority.trim().slice(0, 160) : null; const applicableRegion = type === ArticleType.POLICY && typeof agentAnalysis.jurisdiction === "string" && agentAnalysis.jurisdiction.trim() ? agentAnalysis.jurisdiction.trim().slice(0, 100) : null; const effectiveDate = type === ArticleType.POLICY && typeof agentAnalysis.effective_date === "string" ? parseDateOnly(agentAnalysis.effective_date) : null;
    const article = await this.articles.save(this.articles.create({ slug, title: input.title.trim(), content: input.content.trim(), summary: agentSummary || fallbackSummary.text, summaryKeywords: matchedTerms.length ? matchedTerms : fallbackSummary.keywords, summaryEntities: affectedEntities.length ? affectedEntities : fallbackSummary.entities, summaryModelVersion: agentVersion ? `znt-${agentVersion}` : "rule-based-v1", summaryGeneratedAt: new Date(), summaryReviewed: false, agentAnalysis, heatScore, type, status: isPublished ? ArticleStatus.PUBLISHED : ArticleStatus.REVIEW, originalUrl: input.originalUrl, canonicalUrl, contentFingerprint: fingerprint, coverImageUrl: input.coverImageUrl ?? `/api/covers/${slug}`, publishedAt: isPublished ? (input.publishedAt ? new Date(input.publishedAt) : new Date()) : (input.publishedAt ? new Date(input.publishedAt) : null), classification, policyIssuer, applicableRegion, effectiveDate, sources: [this.articleSources.create({ name: source.name, url: input.originalUrl, isPrimary: true })] }));

    // Auto-format content with rule-based engine (no AI key required)
    if (this.formatter && input.content.trim().length > 100) {
      try {
        const formatted = this.formatter.formatArticleRuleBased(input.content.trim());
        await this.articles.update(article.id, { content: formatted });
        article.content = formatted;
        this.logger.log("Auto-formatted article " + article.id.slice(0, 8));
      } catch (err: any) { this.logger.warn("Format skip: " + (err?.message || String(err))); }
    }

    return { article, duplicateOf: null, filtered: false }; }
  async ingestVideo(input: IngestCrawlVideoDto) { const source = await this.sources.findOneBy({ id: input.sourceId }); if (!source?.isEnabled || source.authorizationStatus !== CrawlAuthorizationStatus.AUTHORIZED || source.type !== "video") throw new BadRequestException("视频来源不存在、未授权、未启用或类型不匹配"); const canonicalUrl = input.canonicalUrl ?? input.originalUrl; const platform = this.videoPlatform(canonicalUrl); const platformVideoId = createHash("sha256").update(canonicalUrl).digest("hex").slice(0, 40); const duplicate = await this.videos.findOne({ where: { platform, platformVideoId } }); if (duplicate) return { video: duplicate, duplicateOf: duplicate.id };
    let account = await this.creatorAccounts.findOne({ where: { platform, platformAccountId: `crawl:${source.id}` }, relations: { creator: true } });
    if (!account) { const creator = await this.creators.save(this.creators.create({ name: source.name, avatarUrl: null, industries: ["OPC与个体经济"], trustLevel: source.trustLevel, authorizationStatus: AuthorizationStatus.AUTHORIZED, isEnabled: true })); account = await this.creatorAccounts.save(this.creatorAccounts.create({ creator, platform, platformAccountId: `crawl:${source.id}`, displayName: source.name, profileUrl: source.entryUrl ?? source.domain, isEnabled: true })); }
    const text = input.description?.replace(/\s+/g, " ").trim() ?? ""; const video = await this.videos.save(this.videos.create({ platform, platformVideoId, title: input.title.trim(), coverUrl: input.coverUrl ?? null, originalUrl: input.originalUrl, creatorAccount: account, publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(), durationSeconds: 0, platformMetrics: {}, platformDescription: text.slice(0, 1000), contentSummary: text ? text.slice(0, 180) : null, keyPoints: text ? [text.slice(0, 120)] : [], industryTags: ["OPC与个体经济"], chapters: [], isPublished: true })); return { video, duplicateOf: null }; }
  async reviewQueue() { return this.articles.find({ where: { status: ArticleStatus.REVIEW }, relations: { sources: true, category: true, tags: true }, order: { updatedAt: "ASC" }, take: 100 }); }
  async publishAll() { const result = await this.articles.update({ status: ArticleStatus.REVIEW }, { status: ArticleStatus.PUBLISHED, publishedAt: () => "COALESCE(published_at, NOW())" } as any); return { published: result.affected ?? 0 }; }
  async reject(id: string) { const article = await this.article(id); article.status = ArticleStatus.OFFLINE; return this.articles.save(article); }
  async merge(id: string, targetId: string) { if (id === targetId) throw new BadRequestException("不能合并到自身"); const [source, target] = await Promise.all([this.article(id), this.article(targetId)]); const sources = await this.articleSources.find({ where: { article: { id: source.id } } }); for (const item of sources) await this.appendSource(target.id, item.name, item.url); source.status = ArticleStatus.OFFLINE; await this.articles.save(source); return this.articles.findOneOrFail({ where: { id: target.id }, relations: { sources: true } }); }
  async recordLinkCheck(articleId: string, statusCode: number | null, redirectUrl?: string, errorMessage?: string) { await this.article(articleId); const healthy = Boolean(statusCode && statusCode >= 200 && statusCode < 400); return this.linkChecks.save(this.linkChecks.create({ article: { id: articleId } as Article, statusCode, redirectUrl: redirectUrl ?? null, errorMessage: errorMessage ?? null, isHealthy: healthy })); }
  private async article(id: string) { const article = await this.articles.findOneBy({ id }); if (!article) throw new NotFoundException("文章不存在"); return article; }
  private fingerprint(content: string) { return createHash("sha256").update(content.replace(/\s+/g, "").toLowerCase()).digest("hex"); }
  private async appendSource(articleId: string, name: string, url: string) { const exists = await this.articleSources.exists({ where: { article: { id: articleId }, url } }); if (!exists) await this.articleSources.save(this.articleSources.create({ article: { id: articleId } as Article, name, url, isPrimary: false })); }
  private videoPlatform(url: string): VideoPlatform { const host = new URL(url).hostname.toLowerCase(); if (host === "youtu.be" || host.endsWith("youtube.com")) return VideoPlatform.YOUTUBE; if (host.endsWith("bilibili.com")) return VideoPlatform.BILIBILI; if (host.endsWith("douyin.com")) return VideoPlatform.DOUYIN; throw new BadRequestException("视频来源仅支持哔哩哔哩、YouTube 和抖音链接"); }
  private async classify(text: string) { const terms = await this.keywords.find({ where: { isActive: true } }); const result: Record<string, number> = {}; for (const term of terms) if (text.includes(term.keyword)) result[term.industry] = (result[term.industry] ?? 0) + Number(term.weight); const total = Object.values(result).reduce((sum, value) => sum + value, 0); return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, Math.round((value / total) * 100) / 100])); }
  private summary(content: string) { const text = content.replace(/\s+/g, " ").trim().slice(0, 160); const keywords = [...new Set(content.match(/[\u4e00-\u9fa5]{2,8}/g) ?? [])].slice(0, 5); const entities = [...new Set(content.match(/[A-Z][A-Za-z0-9& -]{2,30}/g) ?? [])].slice(0, 5); return { text, keywords, entities }; }
}

/** \u4ece\u667a\u80fd\u4f53\u8fd4\u56de\u7684\u6709\u6548\u65e5\u671f\u6587\u672c\u4e2d\u63d0\u53d6 YYYY-MM-DD\uff0c\u65e0\u6cd5\u89e3\u6790\u65f6\u8fd4\u56de null\uff08\u907f\u514d\u5199\u5165\u975e\u6cd5 date \u503c\uff09\u3002 */
function parseDateOnly(value: string): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const year = match[1]; const month = Number(match[2]); const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
