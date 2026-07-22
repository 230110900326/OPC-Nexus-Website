import { MigrationInterface, QueryRunner } from "typeorm";

export class StageLContentSafety1710000030000 implements MigrationInterface {
  name = "StageLContentSafety1710000030000";

  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_status_check"`);
    await q.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_status_check" CHECK ("status" IN ('draft','review','published','hidden'))`);
    await q.query(`ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_status_check"`);
    await q.query(`ALTER TABLE "comments" ADD CONSTRAINT "comments_status_check" CHECK ("status" IN ('review','published','hidden','deleted'))`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_posts_review_queue" ON "posts" ("updated_at" ASC) WHERE "status" = 'review' AND "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX IF NOT EXISTS "IDX_comments_review_queue" ON "comments" ("updated_at" ASC) WHERE "status" = 'review'`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`UPDATE "posts" SET "status" = 'hidden' WHERE "status" = 'review'`);
    await q.query(`UPDATE "comments" SET "status" = 'hidden' WHERE "status" = 'review'`);
    await q.query(`DROP INDEX IF EXISTS "IDX_comments_review_queue"`);
    await q.query(`DROP INDEX IF EXISTS "IDX_posts_review_queue"`);
    await q.query(`ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_status_check"`);
    await q.query(`ALTER TABLE "comments" ADD CONSTRAINT "comments_status_check" CHECK ("status" IN ('published','hidden','deleted'))`);
    await q.query(`ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_status_check"`);
    await q.query(`ALTER TABLE "posts" ADD CONSTRAINT "posts_status_check" CHECK ("status" IN ('draft','published','hidden'))`);
  }
}
