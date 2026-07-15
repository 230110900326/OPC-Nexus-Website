import { MigrationInterface, QueryRunner } from "typeorm";

export class ContentCompletion1710000002000 implements MigrationInterface {
  name = "ContentCompletion1710000002000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles"
      ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN "search_document" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("summary", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("policy_highlights", '')), 'C')
      ) STORED`);
    await queryRunner.query(`CREATE INDEX "IDX_articles_public_feed" ON "articles" ("status", "published_at" DESC)`);
    await queryRunner.query(`CREATE INDEX "IDX_articles_category" ON "articles" ("category_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_articles_search" ON "articles" USING GIN ("search_document")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_article_sources_one_primary" ON "article_sources" ("article_id") WHERE "is_primary" = true`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_tags_name_unique" ON "tags" ("name")`);
    await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "CHK_articles_type" CHECK ("type" IN ('news','policy','insight')), ADD CONSTRAINT "CHK_articles_status" CHECK ("status" IN ('draft','review','published','offline'))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "CHK_articles_status", DROP CONSTRAINT IF EXISTS "CHK_articles_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tags_name_unique"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_article_sources_one_primary"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_articles_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_articles_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_articles_public_feed"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_document", DROP COLUMN IF EXISTS "updated_at", DROP COLUMN IF EXISTS "created_at"`);
  }
}
