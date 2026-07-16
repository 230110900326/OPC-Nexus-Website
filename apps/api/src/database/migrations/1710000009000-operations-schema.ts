import { MigrationInterface, QueryRunner } from "typeorm";

export class OperationsSchema1710000009000 implements MigrationInterface {
  name = "OperationsSchema1710000009000";

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "homepage_configs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "kind" varchar(24) NOT NULL CHECK ("kind" IN ('banner','module','recommendation')),
      "module_key" varchar(40) NOT NULL CHECK ("module_key" IN ('focus','recommendations','policies','videos','discussions','events','creators')),
      "title" varchar(180) NOT NULL, "subtitle" varchar(600), "target_url" varchar(1000), "image_url" varchar(1000),
      "display_position" varchar(60) NOT NULL DEFAULT 'main', "sort_order" integer NOT NULL DEFAULT 0,
      "content_type" varchar(24) CHECK ("content_type" IS NULL OR "content_type" IN ('article','policy','video','post','event','creator')),
      "content_id" uuid, "effective_from" timestamptz, "effective_to" timestamptz,
      "is_online" boolean NOT NULL DEFAULT false, "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "CHK_homepage_configs_schedule" CHECK ("effective_to" IS NULL OR "effective_from" IS NULL OR "effective_to" > "effective_from")
    )`);
    await q.query(`CREATE INDEX "IDX_homepage_configs_schedule" ON "homepage_configs" ("kind", "module_key", "is_online", "effective_from", "effective_to", "sort_order")`);

    await q.query(`CREATE TABLE "recommendation_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "homepage_config_id" uuid REFERENCES "homepage_configs"("id") ON DELETE SET NULL,
      "event_type" varchar(20) NOT NULL CHECK ("event_type" IN ('impression','click')),
      "session_hash" varchar(64), "page_path" varchar(240) NOT NULL DEFAULT '/',
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_recommendation_events_config_time" ON "recommendation_events" ("homepage_config_id", "created_at" DESC)`);
    await q.query(`CREATE INDEX "IDX_recommendation_events_type_time" ON "recommendation_events" ("event_type", "created_at" DESC)`);

    await q.query(`CREATE TABLE "audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "actor_name" varchar(80) NOT NULL, "actor_email" varchar(254) NOT NULL, "action" varchar(60) NOT NULL,
      "target_type" varchar(60), "target_id" varchar(120), "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_audit_logs_actor_time" ON "audit_logs" ("actor_id", "created_at" DESC)`);
    await q.query(`CREATE INDEX "IDX_audit_logs_action_time" ON "audit_logs" ("action", "created_at" DESC)`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await q.query(`DROP TABLE IF EXISTS "recommendation_events"`);
    await q.query(`DROP TABLE IF EXISTS "homepage_configs"`);
  }
}
