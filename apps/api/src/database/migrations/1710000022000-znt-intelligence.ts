import { MigrationInterface, QueryRunner } from "typeorm";

export class ZntIntelligence1710000022000 implements MigrationInterface {
  name = "ZntIntelligence1710000022000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" ADD COLUMN "agent_analysis" jsonb NOT NULL DEFAULT '{}'::jsonb`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "agent_analysis"`);
  }
}
