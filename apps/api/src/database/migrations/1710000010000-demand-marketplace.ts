import { MigrationInterface, QueryRunner } from "typeorm";

export class DemandMarketplace1710000010000 implements MigrationInterface {
  name = "DemandMarketplace1710000010000";

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "opc_demands" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "title" varchar(60) NOT NULL CHECK (char_length("title") BETWEEN 1 AND 30), "content" text NOT NULL,
      "image_urls" jsonb NOT NULL DEFAULT '[]'::jsonb, "contact_info" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "demand_type" varchar(40) NOT NULL CHECK ("demand_type" IN ('research_collection','report_writing','field_visit','data_organization','policy_analysis','project_consulting','other')),
      "budget_range" varchar(30) NOT NULL CHECK ("budget_range" IN ('volunteer','under_500','500_2000','2000_10000','over_10000')),
      "deadline" timestamptz, "status" varchar(30) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','pending_review','published','completed','offline','blocked')),
      "top_weight" integer NOT NULL DEFAULT 0 CHECK ("top_weight" >= 0), "view_count" integer NOT NULL DEFAULT 0 CHECK ("view_count" >= 0),
      "connect_count" integer NOT NULL DEFAULT 0 CHECK ("connect_count" >= 0), "heat_score" numeric NOT NULL DEFAULT 0,
      "risk_flags" jsonb NOT NULL DEFAULT '[]'::jsonb, "contact_hash" varchar(64) NOT NULL,
      "review_reason" varchar(1000), "rules_accepted_at" timestamptz, "reviewed_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL, "reviewed_at" timestamptz,
      "deadline_reminder_sent_at" timestamptz,
      "search_document" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A') || setweight(to_tsvector('simple', coalesce("content", '')), 'B')) STORED,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz
    )`);
    await q.query(`CREATE INDEX "IDX_opc_demands_public" ON "opc_demands" ("status", "top_weight" DESC, "heat_score" DESC, "created_at" DESC) WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_opc_demands_author_status" ON "opc_demands" ("user_id", "status", "created_at" DESC) WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_opc_demands_deadline" ON "opc_demands" ("deadline") WHERE "status" = 'published' AND "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_opc_demands_contact_time" ON "opc_demands" ("contact_hash", "created_at" DESC) WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_opc_demands_search" ON "opc_demands" USING GIN ("search_document")`);

    await q.query(`CREATE TABLE "opc_demand_industries" (
      "demand_id" uuid NOT NULL REFERENCES "opc_demands"("id") ON DELETE CASCADE,
      "section_id" uuid NOT NULL REFERENCES "forum_sections"("id") ON DELETE CASCADE,
      PRIMARY KEY ("demand_id", "section_id")
    )`);
    await q.query(`CREATE INDEX "IDX_opc_demand_industries_section" ON "opc_demand_industries" ("section_id", "demand_id")`);

    await q.query(`CREATE TABLE "opc_demand_connect" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "demand_id" uuid NOT NULL REFERENCES "opc_demands"("id") ON DELETE CASCADE,
      "apply_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "apply_msg" varchar(1000) NOT NULL,
      "contact_status" varchar(30) NOT NULL DEFAULT 'pending_view' CHECK ("contact_status" IN ('pending_view','viewed','communicated','completed','cancelled')),
      "is_anomalous" boolean NOT NULL DEFAULT false, "risk_reason" varchar(240), "counts_toward_heat" boolean NOT NULL DEFAULT true,
      "viewed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_opc_demand_connect_demand_user" UNIQUE ("demand_id", "apply_user_id")
    )`);
    await q.query(`CREATE INDEX "IDX_opc_demand_connect_demand_status" ON "opc_demand_connect" ("demand_id", "contact_status", "created_at" DESC)`);
    await q.query(`CREATE INDEX "IDX_opc_demand_connect_user_time" ON "opc_demand_connect" ("apply_user_id", "created_at" DESC)`);

    await q.query(`CREATE TABLE "demand_board_configs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "banner_title" varchar(180) NOT NULL, "banner_subtitle" varchar(600) NOT NULL,
      "rules_text" text NOT NULL, "disclaimer" text NOT NULL, "prohibited_keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "normal_daily_limit" integer NOT NULL DEFAULT 3 CHECK ("normal_daily_limit" BETWEEN 1 AND 100),
      "verified_daily_limit" integer NOT NULL DEFAULT 10 CHECK ("verified_daily_limit" BETWEEN 1 AND 100),
      "connect_daily_limit" integer NOT NULL DEFAULT 20 CHECK ("connect_daily_limit" BETWEEN 1 AND 200),
      "max_pinned" integer NOT NULL DEFAULT 10 CHECK ("max_pinned" BETWEEN 0 AND 100), "allow_phone" boolean NOT NULL DEFAULT true,
      "updated_by_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`INSERT INTO "demand_board_configs" ("id","banner_title","banner_subtitle","rules_text","disclaimer","prohibited_keywords") VALUES (
      '00000000-0000-4000-8000-000000000010', '把具体需求，交给可信的同行。',
      '面向 OPC 从业者的免费供需撮合板块：发布调研、报告、数据、走访、政策解读与项目咨询需求。',
      '请写明真实需求、交付标准、时间与预算；不得发布荐股、代客理财、承诺收益、内幕交易、募资或骚扰引流信息。',
      '本板块仅为信息交流，所有供需双方自行对接交易，平台不承担任何资金、服务纠纷责任；禁止荐股、代理财、承诺收益、内幕交易相关需求。',
      '["荐股","带单","代客理财","代理财","保本","保证收益","稳赚","内幕消息","内幕交易","资金募集","募资","开户返佣","高收益无风险","证券账户代操作"]'::jsonb
    )`);

    await q.query(`ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_target_type_check"`);
    await q.query(`ALTER TABLE "reports" ADD CONSTRAINT "reports_target_type_check" CHECK ("target_type" IN ('post','comment','article','user','demand'))`);
    await q.query(`ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_target_type_check"`);
    await q.query(`ALTER TABLE "favorites" ADD CONSTRAINT "favorites_target_type_check" CHECK ("target_type" IN ('article','video','post','demand'))`);
    await q.query(`ALTER TABLE "content_metrics" DROP CONSTRAINT IF EXISTS "content_metrics_content_type_check"`);
    await q.query(`ALTER TABLE "content_metrics" ADD CONSTRAINT "content_metrics_content_type_check" CHECK ("content_type" IN ('article','policy','video','post','demand'))`);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "content_metrics" DROP CONSTRAINT IF EXISTS "content_metrics_content_type_check"`);
    await q.query(`ALTER TABLE "content_metrics" ADD CONSTRAINT "content_metrics_content_type_check" CHECK ("content_type" IN ('article','policy','video','post'))`);
    await q.query(`ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_target_type_check"`);
    await q.query(`ALTER TABLE "favorites" ADD CONSTRAINT "favorites_target_type_check" CHECK ("target_type" IN ('article','video','post'))`);
    await q.query(`ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "reports_target_type_check"`);
    await q.query(`ALTER TABLE "reports" ADD CONSTRAINT "reports_target_type_check" CHECK ("target_type" IN ('post','comment','article','user'))`);
    await q.query(`DROP TABLE IF EXISTS "demand_board_configs"`);
    await q.query(`DROP TABLE IF EXISTS "opc_demand_connect"`);
    await q.query(`DROP TABLE IF EXISTS "opc_demand_industries"`);
    await q.query(`DROP TABLE IF EXISTS "opc_demands"`);
  }
}
