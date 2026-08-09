import { MigrationInterface, QueryRunner } from "typeorm";

/** 长文 AI 精简：新增 original_content 列保存精简前的原文，content 存 ~800 字浓缩版。 */
export class ArticleCondensation1710000023000 implements MigrationInterface {
  name = "ArticleCondensation1710000023000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" ADD COLUMN "original_content" text`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_articles_original_content" ON "articles" ("original_content") WHERE "original_content" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_articles_original_content"`);
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "original_content"`);
  }
}
