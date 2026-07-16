import { BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { OperationsDashboardService, resolveDashboardRange } from "./operations-dashboard.service";

describe("Stage I operations dashboard", () => {
  it("normalizes PostgreSQL numeric values and preserves date filtering", async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ newUsers: "3", activeUsers: "9", reads: "1200", posts: "4", interactions: "33", eventRegistrations: "6", crawlSuccessRate: "87.50", recommendationImpressions: "200", recommendationClicks: "18", recommendationCtr: "9.00" }])
      .mockResolvedValueOnce([{ contentType: "article", contentId: "11111111-1111-4111-8111-111111111111", title: "OPC 财经", url: "/articles/opc", reads: "800", interactions: "80", score: "1330" }])
      .mockResolvedValueOnce([{ date: "2026-07-16", newUsers: "1", posts: "2", interactions: "3", eventRegistrations: "4", recommendationClicks: "5" }]);
    const service = new OperationsDashboardService({ query } as unknown as DataSource);
    const result = await service.dashboard({ from: "2026-07-01", to: "2026-07-16" });
    expect(result.summary).toEqual(expect.objectContaining({ newUsers: 3, reads: 1200, crawlSuccessRate: 87.5, recommendationCtr: 9 }));
    expect(result.popularContent[0].score).toBe(1330);
    expect(result.series[0].interactions).toBe(3);
    expect(query).toHaveBeenCalledTimes(3);
    expect((query.mock.calls[0][1][0] as Date).toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect((query.mock.calls[0][1][1] as Date).toISOString()).toBe("2026-07-16T23:59:59.999Z");
  });

  it("rejects reversed and excessive ranges", () => {
    expect(() => resolveDashboardRange({ from: "2026-07-17", to: "2026-07-16" })).toThrow(BadRequestException);
    expect(() => resolveDashboardRange({ from: "2024-01-01", to: "2026-07-16" })).toThrow(BadRequestException);
  });
});
