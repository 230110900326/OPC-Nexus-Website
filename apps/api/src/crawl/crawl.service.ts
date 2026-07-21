import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { CrawlAuthorizationStatus, CrawlSource } from "../database/entities/crawl-source.entity";
import { CrawlJob } from "../database/entities/crawl-job.entity";
import { CrawlLog } from "../database/entities/crawl-log.entity";
import { CreateCrawlSourceDto } from "./dto/create-crawl-source.dto";
import { ListCrawlSourcesDto } from "./dto/list-crawl-sources.dto";
import { UpdateCrawlSourceDto } from "./dto/update-crawl-source.dto";

export const OPC_PRIORITY_KEYWORDS = ["OPC 一人公司", "OPC财经", "OPC超级个体", "一人公司", "超级个体", "个体创业", "个人品牌", "灵活就业", "小微企业", "创业扶持", "专精特新", "数字经济", "人工智能", "科技创新", "普惠金融", "减税降费", "营商环境"];
@Injectable()
export class CrawlService {
  constructor(@InjectRepository(CrawlSource) private readonly sources: Repository<CrawlSource>, @InjectRepository(CrawlJob) private readonly jobs: Repository<CrawlJob>, @InjectRepository(CrawlLog) private readonly logs: Repository<CrawlLog>) {}
  async list(input: ListCrawlSourcesDto) { const where: Record<string, unknown> = {}; if (input.type) where.type = input.type; if (input.authorizationStatus) where.authorizationStatus = input.authorizationStatus; if (input.keyword) where.name = ILike(`%${input.keyword.trim()}%`); return this.sources.find({ where, order: { trustLevel: "DESC", name: "ASC" } }); }
  async create(input: CreateCrawlSourceDto) { const domain = this.normalizeDomain(input.domain); const authorizationStatus = input.authorizationStatus ?? CrawlAuthorizationStatus.PENDING; const isEnabled = input.isEnabled ?? false; if (isEnabled && authorizationStatus !== CrawlAuthorizationStatus.AUTHORIZED) throw new BadRequestException("只有已授权来源可以启用采集"); const entryUrl = this.entryUrl(input.entryUrl, domain, isEnabled); return this.sources.save(this.sources.create({ ...input, domain, name: input.name.trim(), keywords: this.keywords(input.keywords), authorizationStatus, isEnabled, autoPublish: input.autoPublish ?? false, scheduleMinutes: input.scheduleMinutes ?? 1440, entryUrl })); }
  async update(id: string, input: UpdateCrawlSourceDto) { const source = await this.sources.findOneBy({ id }); if (!source) throw new NotFoundException("采集来源不存在"); const authorizationStatus = input.authorizationStatus ?? source.authorizationStatus; const isEnabled = input.isEnabled ?? source.isEnabled; if (isEnabled && authorizationStatus !== CrawlAuthorizationStatus.AUTHORIZED) throw new BadRequestException("只有已授权来源可以启用采集"); const domain = input.domain ? this.normalizeDomain(input.domain) : source.domain; const entryUrl = this.entryUrl(input.entryUrl === undefined ? source.entryUrl : input.entryUrl, domain, isEnabled); Object.assign(source, input, { domain, name: input.name?.trim() ?? source.name, keywords: input.keywords ? this.keywords(input.keywords) : source.keywords, authorizationStatus, isEnabled, autoPublish: input.autoPublish ?? source.autoPublish, entryUrl }); return this.sources.save(source); }
  async listJobs(sourceId?: string) { return this.jobs.find({ where: sourceId ? { source: { id: sourceId } } : {}, relations: { source: true }, order: { createdAt: "DESC" }, take: 100 }); }
  async listLogs(jobId: string) { const job = await this.jobs.findOneBy({ id: jobId }); if (!job) throw new NotFoundException("采集任务不存在"); return this.logs.find({ where: { job: { id: jobId } }, order: { createdAt: "ASC" } }); }
  private normalizeDomain(input: string) { const domain = input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase(); if (!/^[a-z0-9.-]+$/.test(domain)) throw new BadRequestException("来源域名格式不正确"); return domain; }
  private entryUrl(input: string | null | undefined, domain: string, required: boolean) { const value = input?.trim() || null; if (!value) { if (required) throw new BadRequestException("启用采集前必须填写入口地址"); return null; } try { const url = new URL(value); const host = url.hostname.toLowerCase(); if (!/^https?:$/.test(url.protocol) || !(host === domain || host.endsWith(`.${domain}`))) throw new Error(); return value; } catch { throw new BadRequestException("入口地址必须是该来源域名下的 HTTP(S) 地址"); } }
  private keywords(values?: string[]) { return [...new Set([...(values ?? []), ...OPC_PRIORITY_KEYWORDS].map((value) => value.trim()).filter(Boolean))]; }
}
