import { DataSource } from "typeorm";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";

describe("health endpoints", () => {
  const dataSource = { query: jest.fn() } as unknown as DataSource;
  const controller = new HealthController(dataSource);

  beforeEach(() => jest.clearAllMocks());

  it("reports a healthy API using the unified envelope", () => {
    const result = controller.check();
    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({ service: "opc-api", status: "ok" }));
    expect(new Date(result.data.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("checks the database on the readiness endpoint", async () => {
    (dataSource.query as jest.Mock).mockResolvedValue([{ "?column?": 1 }]);
    await expect(controller.ready()).resolves.toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ database: "ok" }) }));
  });

  it("fails readiness when the database cannot be reached", async () => {
    (dataSource.query as jest.Mock).mockRejectedValue(new Error("offline"));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
