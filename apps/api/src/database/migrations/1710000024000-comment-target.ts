import { MigrationInterface, QueryRunner } from "typeorm";

/** 评论多态化：文章/视频也能评论。post_id 改为可空，新增 target_type/target_id 定位内容。
    存量帖子评论回填 target_type='post'，与新增的帖子评论保持一致，便于“我的评论”统一查询。 */
export class CommentTarget1710000024000 implements MigrationInterface {
  name = "CommentTarget1710000024000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "comments" ALTER COLUMN "post_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN "target_type" varchar(20)`);
    await queryRunner.query(`ALTER TABLE "comments" ADD COLUMN "target_id" uuid`);
    await queryRunner.query(`UPDATE "comments" SET "target_type" = 'post', "target_id" = "post_id" WHERE "post_id" IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_target" ON "comments" ("target_type", "target_id") WHERE "target_id" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_comments_target"`);
    await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN IF EXISTS "target_id"`);
    await queryRunner.query(`ALTER TABLE "comments" DROP COLUMN IF EXISTS "target_type"`);
    await queryRunner.query(`ALTER TABLE "comments" ALTER COLUMN "post_id" SET NOT NULL`);
  }
}
