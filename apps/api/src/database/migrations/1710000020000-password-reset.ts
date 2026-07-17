import { MigrationInterface, QueryRunner } from "typeorm";

export class PasswordReset1710000020000 implements MigrationInterface {
  name = "PasswordReset1710000020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password_reset_token" varchar(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "password_reset_expires" timestamptz`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_expires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_token"`);
  }
}
