import { BadRequestException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { MoreThanOrEqual, Repository } from "typeorm";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { DemandContactMethod, DemandContactType, OpcDemand } from "../database/entities/opc-demand.entity";
import { OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { DemandContactDto } from "./dto/create-demand.dto";

export const DEFAULT_DEMAND_CONFIG = {
  id: "00000000-0000-4000-8000-000000000010",
  bannerTitle: "把具体需求，交给可信的同行。",
  bannerSubtitle: "面向 OPC 从业者的免费供需撮合板块。",
  rulesText: "请写明真实需求、交付标准、时间与预算；不得发布荐股、代客理财、承诺收益、内幕交易、募资或骚扰引流信息。",
  disclaimer: "本板块仅为信息交流，所有供需双方自行对接交易，平台不承担任何资金、服务纠纷责任；禁止荐股、代理财、承诺收益、内幕交易相关需求。",
  prohibitedKeywords: ["荐股", "带单", "代客理财", "代理财", "保本", "保证收益", "稳赚", "内幕消息", "内幕交易", "资金募集", "募资", "开户返佣", "高收益无风险", "证券账户代操作"],
  normalDailyLimit: 3,
  verifiedDailyLimit: 10,
  connectDailyLimit: 20,
  maxPinned: 10,
  allowPhone: true,
} as const;

@Injectable()
export class DemandComplianceService {
  constructor(
    @InjectRepository(DemandBoardConfig) private readonly configs: Repository<DemandBoardConfig>,
    @InjectRepository(OpcDemand) private readonly demands: Repository<OpcDemand>,
    @InjectRepository(OpcDemandConnect) private readonly connects: Repository<OpcDemandConnect>,
  ) {}

  async config() { return await this.configs.findOne({ where: { id: DEFAULT_DEMAND_CONFIG.id } }) ?? DEFAULT_DEMAND_CONFIG as unknown as DemandBoardConfig; }

  async assertCanCreate(user: User, now = new Date()) {
    const config = await this.config();
    const verified = isVerifiedDemandAuthor(user);
    const limit = verified ? config.verifiedDailyLimit : config.normalDailyLimit;
    const count = await this.demands.count({ where: { author: { id: user.id }, createdAt: MoreThanOrEqual(chinaDayStart(now)) } });
    if (count >= limit) throw new HttpException(`今日需求发布已达上限（${limit} 条）`, HttpStatus.TOO_MANY_REQUESTS);
  }

  async assertCanConnect(userId: string, now = new Date()) {
    const config = await this.config();
    const count = await this.connects.count({ where: { applyUser: { id: userId }, createdAt: MoreThanOrEqual(chinaDayStart(now)) } });
    if (count >= config.connectDailyLimit) throw new HttpException(`今日意向对接已达上限（${config.connectDailyLimit} 次）`, HttpStatus.TOO_MANY_REQUESTS);
  }

  async normalizeContacts(input: DemandContactDto[]) {
    const config = await this.config();
    const values = [...new Map(input.map((item) => [`${item.type}:${item.value.trim().toLowerCase()}`, { type: item.type, value: item.value.trim() }])).values()];
    for (const item of values) {
      if (item.type === DemandContactType.PHONE && !config.allowPhone) throw new BadRequestException("当前板块不允许展示手机号");
      if (item.type === DemandContactType.QQ && !/^[1-9]\d{4,11}$/.test(item.value)) throw new BadRequestException("QQ 号格式不正确，应为 5–12 位数字");
      if (item.type === DemandContactType.WECHAT && !/^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/.test(item.value)) throw new BadRequestException("微信号格式不正确，应为字母开头的 6–20 位字符");
      if (item.type === DemandContactType.PHONE && !/^1[3-9]\d{9}$/.test(item.value.replaceAll(" ", ""))) throw new BadRequestException("请输入有效的中国大陆手机号");
      if (item.type === DemandContactType.ENTERPRISE_WECHAT && !/^[\p{L}\p{N}_@.+-]{3,40}$/u.test(item.value)) throw new BadRequestException("企业微信联系方式格式不正确");
    }
    return values as DemandContactMethod[];
  }

  contactHash(contacts: DemandContactMethod[]) { return createHash("sha256").update(contacts.map((item) => `${item.type}:${item.value.toLowerCase()}`).sort().join("|")).digest("hex"); }

  async scan(text: string) {
    const config = await this.config();
    const normalized = text.toLowerCase();
    return config.prohibitedKeywords.filter((keyword) => keyword.trim() && normalized.includes(keyword.trim().toLowerCase()));
  }

  async submissionRisk(demand: OpcDemand, user: User) {
    const matches = await this.scan(`${demand.title}\n${demand.content}\n${demand.contactInfo.map((item) => item.value).join(" ")}`);
    const flags = matches.map((keyword) => `违规关键词：${keyword}`);
    if (Date.now() - user.createdAt.getTime() < 24 * 3_600_000) flags.push("新账号发布");
    const recentSameContact = await this.demands.createQueryBuilder("demand").where("demand.contact_hash = :hash", { hash: demand.contactHash }).andWhere("demand.id != :id", { id: demand.id }).andWhere("demand.created_at >= :since", { since: new Date(Date.now() - 7 * 86_400_000) }).getCount();
    if (recentSameContact >= 3) flags.push("同一联系方式七日内高频发布");
    return [...new Set(flags)];
  }

  validateDeadline(deadline: Date | null) { if (deadline && deadline.getTime() <= Date.now()) throw new BadRequestException("需求截止时间必须晚于当前时间"); }
  validateImages(urls: string[]) { for (const url of urls) if (!(url.startsWith("/uploads/") || /^https:\/\//i.test(url))) throw new BadRequestException("需求配图必须使用 HTTPS 或站内上传地址"); }
}

export function isVerifiedDemandAuthor(user: Pick<User, "roles">) { return user.roles?.some((role) => [SystemRole.EDITOR, SystemRole.OPERATOR, SystemRole.ADMIN].includes(role.name)) ?? false; }
export function demandCertification(user: Pick<User, "roles">) { if (user.roles?.some((role) => [SystemRole.OPERATOR, SystemRole.ADMIN].includes(role.name))) return "institution" as const; if (user.roles?.some((role) => role.name === SystemRole.EDITOR)) return "author" as const; return null; }
export function chinaDayStart(now = new Date()) { const offset = 8 * 3_600_000; return new Date(Math.floor((now.getTime() + offset) / 86_400_000) * 86_400_000 - offset); }
