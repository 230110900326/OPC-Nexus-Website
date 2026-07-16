import { BadRequestException, HttpException } from "@nestjs/common";
import { Repository } from "typeorm";
import { DemandBoardConfig } from "../database/entities/demand-board-config.entity";
import { OpcDemand } from "../database/entities/opc-demand.entity";
import { OpcDemandConnect } from "../database/entities/opc-demand-connect.entity";
import { SystemRole } from "../database/entities/role.entity";
import { User } from "../database/entities/user.entity";
import { calculateDemandHeat } from "./demand-heat.service";
import { chinaDayStart, DemandComplianceService } from "./demand-compliance.service";

describe("Stage J demand compliance", () => {
  const config = { prohibitedKeywords: ["荐股", "保证收益"], normalDailyLimit: 3, verifiedDailyLimit: 10, connectDailyLimit: 20, maxPinned: 10, allowPhone: true } as DemandBoardConfig;
  const configs = { findOne: jest.fn().mockResolvedValue(config) } as unknown as Repository<DemandBoardConfig>;
  const demands = { count: jest.fn(), createQueryBuilder: jest.fn() } as unknown as Repository<OpcDemand>;
  const connects = { count: jest.fn() } as unknown as Repository<OpcDemandConnect>;
  const service = new DemandComplianceService(configs, demands, connects);
  const normalUser = { id: "10000000-0000-4000-8000-000000000001", createdAt: new Date("2025-01-01"), roles: [{ name: SystemRole.USER }] } as User;

  beforeEach(() => jest.clearAllMocks());

  it("enforces normal and verified daily publishing limits with HTTP 429", async () => {
    (demands.count as jest.Mock).mockResolvedValueOnce(3);
    await expect(service.assertCanCreate(normalUser)).rejects.toMatchObject({ status: 429 });
    const verified = { ...normalUser, roles: [{ name: SystemRole.EDITOR }] } as User;
    (demands.count as jest.Mock).mockResolvedValueOnce(9);
    await expect(service.assertCanCreate(verified)).resolves.toBeUndefined();
  });

  it("enforces the daily matching limit", async () => {
    (connects.count as jest.Mock).mockResolvedValue(20);
    await expect(service.assertCanConnect(normalUser.id)).rejects.toBeInstanceOf(HttpException);
  });

  it("normalizes supported contact methods and rejects malformed finance contact data", async () => {
    await expect(service.normalizeContacts([{ type: "qq" as never, value: "820260716" }, { type: "phone" as never, value: "13800138000" }])).resolves.toHaveLength(2);
    await expect(service.normalizeContacts([{ type: "wechat" as never, value: "中文昵称" }])).rejects.toBeInstanceOf(BadRequestException);
  });

  it("detects prohibited finance phrases", async () => {
    await expect(service.scan("可提供保证收益的荐股服务")).resolves.toEqual(["荐股", "保证收益"]);
    expect(configs.findOne).toHaveBeenCalledWith({ where: { id: "00000000-0000-4000-8000-000000000010" } });
  });

  it("uses the Asia/Shanghai day boundary", () => {
    expect(chinaDayStart(new Date("2026-07-16T15:59:00.000Z")).toISOString()).toBe("2026-07-15T16:00:00.000Z");
    expect(chinaDayStart(new Date("2026-07-16T16:01:00.000Z")).toISOString()).toBe("2026-07-16T16:00:00.000Z");
  });

  it("boosts verified demand slightly and lowers risky demand heat", () => {
    const now = new Date("2026-07-16T00:00:00.000Z");
    const base = { viewCount: 10, connectCount: 10, createdAt: now, riskFlags: [] };
    const peers = [{ viewCount: 0, connectCount: 0 }, { viewCount: 10, connectCount: 10 }];
    const regular = calculateDemandHeat(base, peers, now, false);
    const verified = calculateDemandHeat(base, peers, now, true);
    const risky = calculateDemandHeat({ ...base, riskFlags: ["高频"] }, peers, now, true);
    expect(verified).toBeGreaterThan(regular);
    expect(risky).toBeLessThan(regular);
  });
});
