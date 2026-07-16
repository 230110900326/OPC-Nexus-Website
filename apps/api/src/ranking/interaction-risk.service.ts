import { createHash } from "crypto";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { InteractionAudit } from "../database/entities/interaction-audit.entity";
import { User } from "../database/entities/user.entity";

@Injectable()
export class InteractionRiskService {
  constructor(@InjectRepository(InteractionAudit) private readonly audits: Repository<InteractionAudit>) {}
  async inspect(input: { userId: string; targetType: string; targetId: string; action: string; ip?: string; device?: string; accountCreatedAt?: Date }) {
    const since = new Date(Date.now() - 60_000); const ipHash = this.hash(input.ip); const deviceHash = this.hash(input.device);
    const [duplicate, userBurst, ipBurst, deviceBurst] = await Promise.all([
      this.audits.exists({ where: { user: { id: input.userId }, targetType: input.targetType, targetId: input.targetId, action: input.action, createdAt: MoreThan(since) } }),
      this.audits.count({ where: { user: { id: input.userId }, createdAt: MoreThan(since) } }),
      ipHash ? this.audits.count({ where: { ipHash, createdAt: MoreThan(since) } }) : 0,
      deviceHash ? this.audits.count({ where: { deviceHash, createdAt: MoreThan(since) } }) : 0,
    ]);
    const newAccountBurst = Boolean(input.accountCreatedAt && Date.now() - input.accountCreatedAt.getTime() < 86_400_000 && userBurst >= 10);
    const reason = duplicate ? "一分钟内重复互动" : newAccountBurst ? "新账号短时密集互动" : ipBurst >= 60 ? "异常 IP 频率" : deviceBurst >= 40 ? "异常设备频率" : null;
    const audit = await this.audits.save(this.audits.create({ user: { id: input.userId } as User, targetType: input.targetType, targetId: input.targetId, action: input.action, ipHash, deviceHash, isAnomalous: Boolean(reason), anomalyReason: reason, countsTowardMetrics: !reason }));
    return { allowed: !reason, reason, auditId: audit.id };
  }
  private hash(value?: string) { return value ? createHash("sha256").update(value).digest("hex") : null; }
}
