import { MigrationInterface, QueryRunner } from "typeorm";

/** 头像列扩容：avatar_url 由 varchar(500) 改为 text，容纳 base64 数据 URI 头像。
    原 DTO 限制 50 万字符、列仅 500 字符，大图数据 URI 会被拒绝。 */
export class AvatarUrlText1710000025000 implements MigrationInterface {
  name = "AvatarUrlText1710000025000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "avatar_url" TYPE varchar(500)`);
  }
}
