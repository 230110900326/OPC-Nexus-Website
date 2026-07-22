import { QueryRunner } from "typeorm";
import { ZntIntelligence1710000022000 } from "./1710000022000-znt-intelligence";

describe("ZntIntelligence migration", () => {
  it("stores the complete auditable analysis without replacing industry classification", async () => {
    const statements: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => { statements.push(sql); }) } as unknown as QueryRunner;
    await new ZntIntelligence1710000022000().up(runner);
    expect(statements.join("\n")).toContain('ADD COLUMN "agent_analysis" jsonb');
  });
});
