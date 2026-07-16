import { QueryRunner } from "typeorm";
import { DemandMarketplace1710000010000 } from "./1710000010000-demand-marketplace";

describe("Stage J demand marketplace migration", () => {
  it("creates demand, matching and board configuration structures with searchable indexes", async () => {
    const statements: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => { statements.push(sql); }) } as unknown as QueryRunner;
    await new DemandMarketplace1710000010000().up(runner);
    const sql = statements.join("\n");
    expect(sql).toContain('CREATE TABLE "opc_demands"');
    expect(sql).toContain('CREATE TABLE "opc_demand_industries"');
    expect(sql).toContain('CREATE TABLE "opc_demand_connect"');
    expect(sql).toContain('CREATE TABLE "demand_board_configs"');
    expect(sql).toContain('IDX_opc_demands_search');
    expect(sql).toContain('UQ_opc_demand_connect_demand_user');
    expect(sql).toContain("'demand'" );
    expect(sql).toContain("normal_daily_limit");
    expect(sql).toContain("禁止荐股");
  });
});
