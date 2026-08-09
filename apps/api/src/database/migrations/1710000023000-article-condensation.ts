import { MigrationInterface, QueryRunner } from "typeorm";

/** 长文 AI 精简：新增 original_content 列保存精简前的原文，content 存 ~800 字浓缩版。 */
export class ArticleCondensation1710000023000 implements MigrationInterface {
  name = "ArticleCondensation1710000023000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // 注意：不给 original_content 建 B-tree 索引——该列存整篇长文，行大小超过 Postgres 索引上限(1/3 页)会报 54000。
    await queryRunner.query(`ALTER TABLE "articles" ADD COLUMN "original_content" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "original_content"`);
  }
}
