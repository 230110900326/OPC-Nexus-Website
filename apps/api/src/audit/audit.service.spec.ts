import { Repository } from "typeorm";
import { AuditAction, AuditLog } from "../database/entities/audit-log.entity";
import { AuditService } from "./audit.service";

describe("Stage I admin audit log", () => {
  const getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  const builder = { leftJoinAndSelect: jest.fn(), andWhere: jest.fn(), orderBy: jest.fn(), addOrderBy: jest.fn(), skip: jest.fn(), take: jest.fn(), getManyAndCount };
  Object.values(builder).forEach((value) => { if (typeof value === "function" && value !== getManyAndCount) value.mockReturnValue(builder); });
  const logs = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: "audit-1", ...value })), createQueryBuilder: jest.fn(() => builder) } as unknown as Repository<AuditLog>;
  const service = new AuditService(logs);
  beforeEach(() => { jest.clearAllMocks(); getManyAndCount.mockResolvedValue([[], 0]); Object.values(builder).forEach((value) => { if (typeof value === "function" && value !== getManyAndCount) value.mockReturnValue(builder); }); });

  it("persists actor snapshots with target context", async () => {
    const result = await service.record({ actor: { id: "11111111-1111-4111-8111-111111111111", email: "admin@opc.local", displayName: "OPC 管理员" }, action: AuditAction.CONTENT_PUBLISH, targetType: "article", targetId: "22222222-2222-4222-8222-222222222222" });
    expect(result).toEqual(expect.objectContaining({ actorName: "OPC 管理员", actorEmail: "admin@opc.local", action: AuditAction.CONTENT_PUBLISH }));
  });

  it("applies actor, action and inclusive day filters", async () => {
    await service.list({ actor: "admin", action: AuditAction.ADMIN_LOGIN, from: "2026-07-01", to: "2026-07-16", page: 2, limit: 20 });
    expect(builder.andWhere).toHaveBeenCalledWith(expect.stringContaining("actor_name"), expect.objectContaining({ actor: "%admin%" }));
    expect(builder.andWhere).toHaveBeenCalledWith("audit.action = :action", { action: AuditAction.ADMIN_LOGIN });
    expect(builder.andWhere).toHaveBeenCalledWith("audit.created_at >= :from", { from: "2026-07-01T00:00:00.000Z" });
    expect(builder.andWhere).toHaveBeenCalledWith("audit.created_at <= :to", { to: "2026-07-16T23:59:59.999Z" });
    expect(builder.skip).toHaveBeenCalledWith(20);
  });
});
