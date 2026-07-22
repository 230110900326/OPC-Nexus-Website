import { Repository } from "typeorm";
import { Article, ArticleStatus, ArticleType } from "../database/entities/article.entity";
import { ArticleSource } from "../database/entities/article-source.entity";
import { ContentKeyword } from "../database/entities/content-keyword.entity";
import { CrawlDiscovery } from "../database/entities/crawl-discovery.entity";
import { CrawlAuthorizationStatus, CrawlSource, CrawlSourceType } from "../database/entities/crawl-source.entity";
import { LinkCheck } from "../database/entities/link-check.entity";
import { Creator } from "../database/entities/creator.entity";
import { CreatorAccount } from "../database/entities/creator-account.entity";
import { Video } from "../database/entities/video.entity";
import { CrawlProcessingService } from "./crawl-processing.service";

describe("CrawlProcessingService znt integration", () => {
  const source = { id: "source-1", name: "测试来源", isEnabled: true, autoPublish: true, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED, type: CrawlSourceType.NEWS } as CrawlSource;
  const query = { where: jest.fn().mockReturnThis(), getOne: jest.fn() };
  const articles = { createQueryBuilder: jest.fn(() => query), create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: "article-1", ...value })) } as unknown as Repository<Article>;
  const articleSources = { create: jest.fn((value) => value) } as unknown as Repository<ArticleSource>;
  const sources = { findOneBy: jest.fn() } as unknown as Repository<CrawlSource>;
  const keywords = { find: jest.fn() } as unknown as Repository<ContentKeyword>;
  const empty = {} as Repository<never>;
  const service = new CrawlProcessingService(articles, articleSources, sources, empty as Repository<CrawlDiscovery>, keywords, empty as Repository<LinkCheck>, empty as Repository<Creator>, empty as Repository<CreatorAccount>, empty as Repository<Video>);

  beforeEach(() => {
    jest.clearAllMocks();
    (sources.findOneBy as jest.Mock).mockResolvedValue(source);
    (keywords.find as jest.Mock).mockResolvedValue([]);
    query.where.mockReturnThis();
    query.getOne.mockResolvedValue(null);
  });

  const input = (decision: "relevant" | "review" | "irrelevant") => ({
    sourceId: source.id,
    title: "AI 智能体帮助一人公司经营",
    content: "这是足够长的采集正文，用于验证智能体摘要和入库决策。",
    originalUrl: "https://example.test/article",
    type: ArticleType.NEWS,
    agentAnalysis: { decision, core_summary: "智能体生成的摘要", heat_score: 42, matched_terms: ["一人公司", "智能体"], agent_version: "2.0.1" },
  });

  it("uses znt summary and heat for relevant auto-published content", async () => {
    const result = await service.ingest(input("relevant"));
    expect(result.article).toEqual(expect.objectContaining({ summary: "智能体生成的摘要", heatScore: 42, status: ArticleStatus.PUBLISHED, summaryModelVersion: "znt-2.0.1" }));
  });

  it("keeps review decisions out of automatic publishing", async () => {
    const result = await service.ingest(input("review"));
    expect(result.article).toEqual(expect.objectContaining({ status: ArticleStatus.REVIEW }));
  });

  it("does not persist irrelevant content", async () => {
    const result = await service.ingest(input("irrelevant"));
    expect(result).toEqual(expect.objectContaining({ filtered: true, article: null }));
    expect(articles.save).not.toHaveBeenCalled();
  });
});
