import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialAccountSchema1710000000000 implements MigrationInterface {
  name = "InitialAccountSchema1710000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" varchar(254) NOT NULL UNIQUE,
      "password_hash" varchar(255) NOT NULL, "display_name" varchar(60) NOT NULL,
      "avatar_url" varchar(500), "bio" varchar(280), "industry" varchar(80),
      "company" varchar(120), "job_title" varchar(80), "refresh_token_hash" varchar(255),
      "is_active" boolean NOT NULL DEFAULT true, "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`CREATE TABLE "roles" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(32) NOT NULL UNIQUE, "label" varchar(80) NOT NULL
    )`);
    await queryRunner.query(`CREATE TABLE "permissions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" varchar(80) NOT NULL UNIQUE, "description" varchar(160) NOT NULL
    )`);
    await queryRunner.query(`CREATE TABLE "user_roles" (
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE, PRIMARY KEY ("user_id", "role_id")
    )`);
    await queryRunner.query(`CREATE TABLE "role_permissions" (
      "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
      "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE, PRIMARY KEY ("role_id", "permission_id")
    )`);
    await queryRunner.query(`INSERT INTO "roles" ("name", "label") VALUES
      ('user', '注册用户'), ('editor', '内容编辑'), ('moderator', '版主'), ('operator', '运营管理员'), ('admin', '超级管理员')`);
    await queryRunner.query(`INSERT INTO "permissions" ("code", "description") VALUES
      ('profile:read:own', '查看本人资料'), ('profile:update:own', '修改本人资料'),
      ('content:manage', '管理内容'), ('forum:moderate', '管理社区'), ('operations:manage', '运营管理'), ('system:manage', '系统管理')`);
    await queryRunner.query(`INSERT INTO "role_permissions" ("role_id", "permission_id")
      SELECT r.id, p.id FROM roles r JOIN permissions p ON
      (r.name = 'user' AND p.code IN ('profile:read:own', 'profile:update:own')) OR
      (r.name = 'editor' AND p.code = 'content:manage') OR
      (r.name = 'moderator' AND p.code = 'forum:moderate') OR
      (r.name = 'operator' AND p.code = 'operations:manage') OR
      (r.name = 'admin')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "role_permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "user_roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "roles"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
