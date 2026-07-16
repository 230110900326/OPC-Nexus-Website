import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditAction, AuditLog } from "../database/entities/audit-log.entity";
import { User } from "../database/entities/user.entity";
import { ListAuditLogsDto } from "./dto/list-audit-logs.dto";

export type AuditActor = { id: string; email: string; displayName?: string };

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  async record(input: { actor: AuditActor; action: AuditAction; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }) {
    return this.logs.save(this.logs.create({
      actor: { id: input.actor.id } as User,
      actorName: input.actor.displayName?.trim() || input.actor.email,
      actorEmail: input.actor.email,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? {},
    }));
  }

  async list(input: ListAuditLogsDto) {
    const query = this.logs.createQueryBuilder("audit").leftJoinAndSelect("audit.actor", "actor");
    if (input.actor?.trim()) {
      query.andWhere("(audit.actor_name ILIKE :actor OR audit.actor_email ILIKE :actor OR CAST(audit.actor_id AS text) = :actorId)", { actor: `%${input.actor.trim()}%`, actorId: input.actor.trim() });
    }
    if (input.action) query.andWhere("audit.action = :action", { action: input.action });
    if (input.from) query.andWhere("audit.created_at >= :from", { from: startDate(input.from) });
    if (input.to) query.andWhere("audit.created_at <= :to", { to: endDate(input.to) });
    const [items, total] = await query.orderBy("audit.created_at", "DESC").addOrderBy("audit.id", "DESC").skip((input.page - 1) * input.limit).take(input.limit).getManyAndCount();
    return { items, pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) } };
  }
}

function startDate(value: string) { return value.length === 10 ? `${value}T00:00:00.000Z` : value; }
function endDate(value: string) { return value.length === 10 ? `${value}T23:59:59.999Z` : value; }
