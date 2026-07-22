import { QueryRunner } from "typeorm";
import { CrawlerRuntime1710000021000 } from "./1710000021000-crawler-runtime";

describe("CrawlerRuntime migration", () => {
  it("adds automatic publishing and the video source type without rebuilding crawl history", async () => {
    const statements: string[] = [];
    const runner = { query: jest.fn(async (sql: string) => { statements.push(sql); }) } as unknown as QueryRunner;
    await new CrawlerRuntime1710000021000().up(runner);
    const sql = statements.join("\n");
    expect(sql).toContain('ADD COLUMN "auto_publish" boolean NOT NULL DEFAULT false');
    expect(sql).toContain("'news','policy','video','rss','sitemap'");
    expect(sql).toContain('ALTER COLUMN "schedule_minutes" SET DEFAULT 1440');
  });
});
