import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcryptjs";

export class ResearcherCertification1710000040000 implements MigrationInterface {
  name = "ResearcherCertification1710000040000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // Add researcher role
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "label") VALUES ('researcher', '产业研究员') ON CONFLICT ("name") DO NOTHING`,
    );

    // Add certification_status column
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "certification_status" varchar(16)`,
    );

    // Seed operator account from environment variables
    const email = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
    const password = process.env.OPERATOR_PASSWORD;
    if (email && password) {
      const passwordHash = await bcrypt.hash(password, 12);
      const displayName = process.env.OPERATOR_DISPLAY_NAME || "OPC 运营管理员";
      // Use parameterized INSERT to avoid SQL injection
      const existing = await queryRunner.query(
        `SELECT id FROM "users" WHERE "email" = $1`,
        [email],
      );
      if (!existing.length) {
        const userResult = await queryRunner.query(
          `INSERT INTO "users" ("email", "password_hash", "display_name", "is_active")
           VALUES ($1, $2, $3, true) RETURNING "id"`,
          [email, passwordHash, displayName],
        );
        const userId = userResult[0].id;

        // Assign operator role
        const operatorRole = await queryRunner.query(
          `SELECT "id" FROM "roles" WHERE "name" = 'operator'`,
        );
        if (operatorRole.length) {
          await queryRunner.query(
            `INSERT INTO "user_roles" ("user_id", "role_id") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, operatorRole[0].id],
          );
        }
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "certification_status"`);
    await queryRunner.query(`DELETE FROM "roles" WHERE "name" = 'researcher'`);
  }
}
