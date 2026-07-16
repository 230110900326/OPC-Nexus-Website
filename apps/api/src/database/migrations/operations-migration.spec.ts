import { QueryRunner } from "typeorm";
import { OperationsSchema1710000009000 } from "./1710000009000-operations-schema";

describe("Stage I migration", () => {
  it("creates homepage scheduling, recommendation events and append-only admin audits", async () => {
    const statements: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => { statements.push(sql); }) } as unknown as QueryRunner;
    await new OperationsSchema1710000009000().up(runner);
    const sql = statements.join("\n");
    expect(sql).toContain('CREATE TABLE "homepage_configs"');
    expect(sql).toContain('CREATE TABLE "recommendation_events"');
    expect(sql).toContain('CREATE TABLE "audit_logs"');
    expect(sql).toContain("CHK_homepage_configs_schedule");
    expect(sql).toContain("IDX_audit_logs_action_time");
    expect(sql).toContain("'impression','click'");
  });
});
