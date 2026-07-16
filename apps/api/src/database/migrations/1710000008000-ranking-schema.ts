import { MigrationInterface, QueryRunner } from "typeorm";

export class RankingSchema1710000008000 implements MigrationInterface {
  name = "RankingSchema1710000008000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "content_metrics" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "content_type" varchar(20) NOT NULL CHECK ("content_type" IN ('article','policy','video','post')),
      "content_id" uuid NOT NULL, "source" varchar(20) NOT NULL DEFAULT 'internal',
      "read_count" integer NOT NULL DEFAULT 0, "like_count" integer NOT NULL DEFAULT 0,
      "comment_count" integer NOT NULL DEFAULT 0, "favorite_count" integer NOT NULL DEFAULT 0,
      "share_count" integer NOT NULL DEFAULT 0, "external_view_count" integer NOT NULL DEFAULT 0,
      "external_like_count" integer NOT NULL DEFAULT 0, "editor_score" numeric NOT NULL DEFAULT 0,
      "source_trust" numeric NOT NULL DEFAULT 0.5, "synced_at" timestamptz NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_content_metrics_history" ON "content_metrics" ("content_type", "content_id", "synced_at" DESC)`);
    await q.query(`CREATE TABLE "interaction_audits" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "target_type" varchar(20) NOT NULL, "target_id" uuid NOT NULL, "action" varchar(30) NOT NULL,
      "ip_hash" varchar(64), "device_hash" varchar(64), "is_anomalous" boolean NOT NULL DEFAULT false,
      "anomaly_reason" varchar(160), "counts_toward_metrics" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_interaction_audits_user_time" ON "interaction_audits" ("user_id", "created_at" DESC)`);
    await q.query(`CREATE INDEX "IDX_interaction_audits_ip_time" ON "interaction_audits" ("ip_hash", "created_at" DESC) WHERE "ip_hash" IS NOT NULL`);
    await q.query(`CREATE INDEX "IDX_interaction_audits_device_time" ON "interaction_audits" ("device_hash", "created_at" DESC) WHERE "device_hash" IS NOT NULL`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP TABLE IF EXISTS "interaction_audits"`); await q.query(`DROP TABLE IF EXISTS "content_metrics"`); }
}
