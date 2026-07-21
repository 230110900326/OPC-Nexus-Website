import { Repository } from "typeorm";
import { CrawlAuthorizationStatus, CrawlSource, CrawlSourceType } from "../database/entities/crawl-source.entity";
import { CrawlJob } from "../database/entities/crawl-job.entity";
import { CrawlLog } from "../database/entities/crawl-log.entity";
import { CrawlProcessingService } from "./crawl-processing.service";
import { CrawlerRuntimeService } from "./crawler-runtime.service";

describe("CrawlerRuntimeService", () => {
  const source = { id: "source-1", name: "测试来源", isEnabled: true, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED, type: CrawlSourceType.NEWS, lastCrawledAt: null } as CrawlSource;
  const sources = { findOneBy: jest.fn(), save: jest.fn() } as unknown as Repository<CrawlSource>;
  const jobs = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: "job-1", ...value })) } as unknown as Repository<CrawlJob>;
  const logs = { create: jest.fn((value) => value), save: jest.fn() } as unknown as Repository<CrawlLog>;
  const processing = { saveDiscoveries: jest.fn(), ingest: jest.fn(), ingestVideo: jest.fn() };
  const service = new CrawlerRuntimeService(sources, jobs, logs, processing as unknown as CrawlProcessingService);

  beforeEach(() => jest.clearAllMocks());

  it("routes policy and news records as article content", async () => {
    (sources.findOneBy as jest.Mock).mockResolvedValue(source);
    processing.ingest.mockResolvedValue({ duplicateOf: null });
    const result = await service.recordRun({ sourceId: source.id, startedAt: "2026-07-20T00:00:00.000Z", finishedAt: "2026-07-20T00:00:01.000Z", durationMs: 1000, discoveredUrls: ["https://news.example.test/article"], articles: [{ title: "测试文章", content: "正文", originalUrl: "https://news.example.test/article" }], videos: [] });
    expect(result).toEqual(expect.objectContaining({ articles: 1, videos: 0, status: "succeeded" }));
    expect(processing.ingest).toHaveBeenCalledWith(expect.objectContaining({ sourceId: source.id, type: "news" }));
  });

  it("does not import articles after the crawler reports a fetch error", async () => {
    (sources.findOneBy as jest.Mock).mockResolvedValue(source);
    const result = await service.recordRun({ sourceId: source.id, startedAt: "2026-07-20T00:00:00.000Z", finishedAt: "2026-07-20T00:00:01.000Z", durationMs: 1000, discoveredUrls: [], articles: [], videos: [], errorMessage: "source timed out" });
    expect(result).toEqual(expect.objectContaining({ articles: 0, status: "failed" }));
    expect(processing.saveDiscoveries).not.toHaveBeenCalled();
  });

  it("reports znt filtering and in-batch duplicate counts", async () => {
    (sources.findOneBy as jest.Mock).mockResolvedValue(source);
    const result = await service.recordRun({ sourceId: source.id, startedAt: "2026-07-20T00:00:00.000Z", finishedAt: "2026-07-20T00:00:01.000Z", durationMs: 1000, discoveredUrls: [], articles: [], videos: [], filteredCount: 3, batchDuplicateCount: 2, agentVersion: "2.0.1" });
    expect(result).toEqual(expect.objectContaining({ filtered: 3, duplicates: 2, agentVersion: "2.0.1" }));
    expect(logs.save).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ filtered: 3, duplicates: 2, agentVersion: "2.0.1" }) }));
  });
});
