import { MigrationInterface, QueryRunner } from "typeorm";

export class CrawlerRuntime1710000021000 implements MigrationInterface {
  name = "CrawlerRuntime1710000021000";

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "crawl_sources" ADD COLUMN "auto_publish" boolean NOT NULL DEFAULT false`);
    await q.query(`ALTER TABLE "crawl_sources" ALTER COLUMN "schedule_minutes" SET DEFAULT 1440`);
    await q.query(`ALTER TABLE "crawl_sources" DROP CONSTRAINT IF EXISTS "crawl_sources_type_check"`);
    await q.query(`ALTER TABLE "crawl_sources" ADD CONSTRAINT "crawl_sources_type_check" CHECK ("type" IN ('news','policy','video','rss','sitemap'))`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "crawl_sources" DROP CONSTRAINT IF EXISTS "crawl_sources_type_check"`);
    await q.query(`ALTER TABLE "crawl_sources" ADD CONSTRAINT "crawl_sources_type_check" CHECK ("type" IN ('news','policy','rss','sitemap'))`);
    await q.query(`ALTER TABLE "crawl_sources" ALTER COLUMN "schedule_minutes" SET DEFAULT 360`);
    await q.query(`ALTER TABLE "crawl_sources" DROP COLUMN "auto_publish"`);
  }
}
