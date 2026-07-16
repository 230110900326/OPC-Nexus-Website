import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { In, Repository } from "typeorm";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../auth/auth-user.interface";
import { AuditAction } from "../database/entities/audit-log.entity";
import { HomepageConfig, HomepageConfigKind } from "../database/entities/homepage-config.entity";
import { RecommendationEvent } from "../database/entities/recommendation-event.entity";
import { User } from "../database/entities/user.entity";
import { CreateHomepageConfigDto } from "./dto/create-homepage-config.dto";
import { TrackRecommendationDto } from "./dto/track-recommendation.dto";
import { UpdateHomepageConfigDto } from "./dto/update-homepage-config.dto";
import { isHomepageConfigActive } from "./homepage.service";

@Injectable()
export class HomepageConfigService {
  constructor(
    @InjectRepository(HomepageConfig) private readonly configs: Repository<HomepageConfig>,
    @InjectRepository(RecommendationEvent) private readonly events: Repository<RecommendationEvent>,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.configs.find({ relations: { createdBy: true, updatedBy: true }, order: { kind: "ASC", moduleKey: "ASC", sortOrder: "ASC", updatedAt: "DESC" } });
  }

  async create(input: CreateHomepageConfigDto, actor: AuthUser) {
    const config = this.configs.create({
      kind: input.kind,
      moduleKey: input.moduleKey,
      title: input.title.trim(),
      subtitle: cleanOptional(input.subtitle),
      targetUrl: cleanOptional(input.targetUrl),
      imageUrl: cleanOptional(input.imageUrl),
      displayPosition: input.displayPosition?.trim() || "main",
      sortOrder: input.sortOrder ?? 0,
      contentType: input.contentType ?? null,
      contentId: input.contentId ?? null,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      isOnline: input.isOnline ?? false,
      config: input.config ?? {},
      createdBy: { id: actor.id } as User,
      updatedBy: { id: actor.id } as User,
    });
    this.validate(config);
    const saved = await this.configs.save(config);
    await this.audit.record({ actor, action: AuditAction.HOMEPAGE_CONFIG_CREATE, targetType: "homepage_config", targetId: saved.id, metadata: { kind: saved.kind, moduleKey: saved.moduleKey, isOnline: saved.isOnline } });
    return saved;
  }

  async update(id: string, input: UpdateHomepageConfigDto, actor: AuthUser) {
    const config = await this.configs.findOneBy({ id });
    if (!config) throw new NotFoundException("首页配置不存在");
    if (input.kind !== undefined) config.kind = input.kind;
    if (input.moduleKey !== undefined) config.moduleKey = input.moduleKey;
    if (input.title !== undefined) config.title = input.title.trim();
    if (input.subtitle !== undefined) config.subtitle = cleanOptional(input.subtitle);
    if (input.targetUrl !== undefined) config.targetUrl = cleanOptional(input.targetUrl);
    if (input.imageUrl !== undefined) config.imageUrl = cleanOptional(input.imageUrl);
    if (input.displayPosition !== undefined) config.displayPosition = input.displayPosition.trim() || "main";
    if (input.sortOrder !== undefined) config.sortOrder = input.sortOrder;
    if (input.contentType !== undefined) config.contentType = input.contentType;
    if (input.contentId !== undefined) config.contentId = input.contentId;
    if (input.effectiveFrom !== undefined) config.effectiveFrom = input.effectiveFrom ? new Date(input.effectiveFrom) : null;
    if (input.effectiveTo !== undefined) config.effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;
    if (input.isOnline !== undefined) config.isOnline = input.isOnline;
    if (input.config !== undefined) config.config = input.config;
    config.updatedBy = { id: actor.id } as User;
    this.validate(config);
    const saved = await this.configs.save(config);
    await this.audit.record({ actor, action: AuditAction.HOMEPAGE_CONFIG_UPDATE, targetType: "homepage_config", targetId: saved.id, metadata: { fields: Object.keys(input), kind: saved.kind, moduleKey: saved.moduleKey, isOnline: saved.isOnline } });
    return saved;
  }

  async remove(id: string, actor: AuthUser) {
    const config = await this.configs.findOneBy({ id });
    if (!config) throw new NotFoundException("首页配置不存在");
    await this.configs.remove(config);
    await this.audit.record({ actor, action: AuditAction.HOMEPAGE_CONFIG_DELETE, targetType: "homepage_config", targetId: id, metadata: { title: config.title, kind: config.kind, moduleKey: config.moduleKey } });
    return { deleted: true };
  }

  async track(input: TrackRecommendationDto, fingerprint?: string) {
    const ids = [...new Set(input.configIds)];
    const configs = await this.configs.find({ where: { id: In(ids) } });
    const now = new Date();
    const trackable = configs.filter((config) => [HomepageConfigKind.BANNER, HomepageConfigKind.RECOMMENDATION].includes(config.kind) && isHomepageConfigActive(config, now));
    if (!trackable.length) return { recorded: 0 };
    const sessionHash = fingerprint ? createHash("sha256").update(fingerprint).digest("hex") : null;
    await this.events.save(trackable.map((config) => this.events.create({ homepageConfig: config, eventType: input.eventType, sessionHash, pagePath: input.pagePath })));
    return { recorded: trackable.length };
  }

  private validate(config: HomepageConfig) {
    if (!config.title) throw new BadRequestException("配置标题不能为空");
    if (config.effectiveFrom && config.effectiveTo && config.effectiveTo <= config.effectiveFrom) throw new BadRequestException("失效时间必须晚于生效时间");
    if (Boolean(config.contentType) !== Boolean(config.contentId)) throw new BadRequestException("关联内容类型和内容 ID 必须同时填写");
  }
}

function cleanOptional(value: string | null | undefined) { return value?.trim() || null; }
