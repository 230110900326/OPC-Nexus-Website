import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CrawlAuthorizationStatus, CrawlSource, CrawlSourceType } from "../database/entities/crawl-source.entity";
import { CrawlJob, CrawlJobStatus } from "../database/entities/crawl-job.entity";
import { CrawlLog } from "../database/entities/crawl-log.entity";
import { ArticleType } from "../database/entities/article.entity";
import { CrawlerRunDto } from "./dto/crawler-run.dto";
import { CrawlProcessingService } from "./crawl-processing.service";

@Injectable()
export class CrawlerRuntimeService {
  constructor(
    @InjectRepository(CrawlSource) private readonly sources: Repository<CrawlSource>,
    @InjectRepository(CrawlJob) private readonly jobs: Repository<CrawlJob>,
    @InjectRepository(CrawlLog) private readonly logs: Repository<CrawlLog>,
    private readonly processing: CrawlProcessingService,
  ) {}

  readySources() {
    return this.sources.find({
      where: { isEnabled: true, authorizationStatus: CrawlAuthorizationStatus.AUTHORIZED },
      order: { trustLevel: "DESC", name: "ASC" },
    });
  }

  async recordRun(input: CrawlerRunDto) {
    const source = await this.sources.findOneBy({ id: input.sourceId });
    if (!source) throw new NotFoundException("采集来源不存在");
    if (!source.isEnabled || source.authorizationStatus !== CrawlAuthorizationStatus.AUTHORIZED) throw new BadRequestException("采集来源未授权或未启用");
    const startedAt = new Date(input.startedAt);
    const finishedAt = new Date(input.finishedAt);
    const job = await this.jobs.save(this.jobs.create({ source, status: CrawlJobStatus.RUNNING, queueKey: `crawler:${source.id}`, startedAt, finishedAt: null, durationMs: null, discoveredCount: 0, errorMessage: null }));
    let articleCount = 0;
    let videoCount = 0;
    let duplicateCount = 0;
    let filteredCount = input.filteredCount ?? 0;
    const warnings: string[] = [];
    let errorMessage = input.errorMessage?.trim() || null;

    try {
      if (!errorMessage) {
        await this.processing.saveDiscoveries(source.id, input.discoveredUrls);
        if (source.type === CrawlSourceType.VIDEO) {
          for (const item of input.videos) {
            try {
              const result = await this.processing.ingestVideo({ ...item, sourceId: source.id });
              if (result.duplicateOf) duplicateCount++;
              else videoCount++;
            } catch (error) { warnings.push(error instanceof Error ? error.message : "视频入库失败"); }
          }
        } else {
          if (input.videos.length) warnings.push("非视频来源提交的视频条目已忽略");
          const type = source.type === CrawlSourceType.POLICY ? ArticleType.POLICY : ArticleType.NEWS;
          for (const item of input.articles) {
            try {
              const result = await this.processing.ingest({ ...item, sourceId: source.id, type });
              if (result.filtered) filteredCount++;
              else if (result.duplicateOf) duplicateCount++;
              else articleCount++;
            } catch (error) { warnings.push(error instanceof Error ? error.message : "文章入库失败"); }
          }
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "采集结果处理失败";
    }

    Object.assign(job, { status: errorMessage ? CrawlJobStatus.FAILED : CrawlJobStatus.SUCCEEDED, finishedAt, durationMs: input.durationMs, discoveredCount: input.discoveredUrls.length, errorMessage });
    await this.jobs.save(job);
    source.lastCrawledAt = finishedAt;
    await this.sources.save(source);
    const details = { discovered: input.discoveredUrls.length, articles: articleCount, videos: videoCount, duplicates: duplicateCount + (input.batchDuplicateCount ?? 0), filtered: filteredCount, warnings: warnings.length, agentVersion: input.agentVersion ?? null };
    await this.logs.save(this.logs.create({ job, level: errorMessage ? "error" : warnings.length ? "warning" : "info", message: errorMessage ?? "采集结果已入库", metadata: { ...details, warnings } }));
    return { jobId: job.id, ...details, status: job.status };
  }
}
