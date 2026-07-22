import { BadRequestException } from "@nestjs/common";
import { Repository } from "typeorm";
import { CrawlAuthorizationStatus, CrawlFetchMethod, CrawlSource, CrawlSourceType } from "../database/entities/crawl-source.entity";
import { CrawlJob } from "../database/entities/crawl-job.entity";
import { CrawlLog } from "../database/entities/crawl-log.entity";
import { CrawlService, OPC_PRIORITY_KEYWORDS } from "./crawl.service";

describe("Stage F - crawl source governance", () => {
  const sources = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) } as unknown as Repository<CrawlSource>;
  const service = new CrawlService(sources, {} as Repository<CrawlJob>, {} as Repository<CrawlLog>);

  beforeEach(() => jest.clearAllMocks());

  it("injects OPC priority keywords into a pending source", async () => {
    const result = await service.create({ name: "Test source", domain: "HTTPS://NEWS.TEST/path", type: CrawlSourceType.NEWS, fetchMethod: CrawlFetchMethod.HTML });
    expect(result.domain).toBe("news.test");
    expect(result.keywords).toEqual(expect.arrayContaining(OPC_PRIORITY_KEYWORDS.slice(0, 3)));
    expect(result.isEnabled).toBe(false);
    expect(result.scheduleMinutes).toBe(1440);
  });

  it("cannot enable a source before authorization", async () => {
    await expect(service.create({ name: "Pending source", domain: "pending.test", type: CrawlSourceType.NEWS, fetchMethod: CrawlFetchMethod.HTML, authorizationStatus: CrawlAuthorizationStatus.PENDING, isEnabled: true })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires a same-domain entry URL before an authorized source can run", async () => {
    await expect(service.create({ name: "Authorized source", domain: "news.test", type: CrawlSourceType.NEWS, fetchMethod: CrawlFetchMethod.RSS, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED, isEnabled: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ name: "Wrong domain", domain: "news.test", type: CrawlSourceType.NEWS, fetchMethod: CrawlFetchMethod.RSS, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED, isEnabled: true, entryUrl: "https://other.test/feed.xml" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ name: "Ready source", domain: "news.test", type: CrawlSourceType.NEWS, fetchMethod: CrawlFetchMethod.RSS, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED, isEnabled: true, entryUrl: "https://feeds.news.test/feed.xml" })).resolves.toEqual(expect.objectContaining({ entryUrl: "https://feeds.news.test/feed.xml", isEnabled: true }));
  });
});
