import { MigrationInterface, QueryRunner } from "typeorm";

export class CommunitySchema1710000003000 implements MigrationInterface {
  name = "CommunitySchema1710000003000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "users" ADD COLUMN "ban_reason" varchar(500), ADD COLUMN "banned_at" timestamptz`);
    await q.query(`CREATE TABLE "forum_sections" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "slug" varchar(80) NOT NULL UNIQUE,
      "name" varchar(80) NOT NULL, "description" varchar(280) NOT NULL,
      "sort_order" integer NOT NULL DEFAULT 0, "is_active" boolean NOT NULL DEFAULT true,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE TABLE "posts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(180) NOT NULL, "body" text NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'published' CHECK ("status" IN ('draft','published','hidden')),
      "is_locked" boolean NOT NULL DEFAULT false, "is_pinned" boolean NOT NULL DEFAULT false,
      "is_featured" boolean NOT NULL DEFAULT false, "view_count" integer NOT NULL DEFAULT 0,
      "comment_count" integer NOT NULL DEFAULT 0, "heat_score" numeric NOT NULL DEFAULT 0,
      "section_id" uuid NOT NULL REFERENCES "forum_sections"("id"), "author_id" uuid NOT NULL REFERENCES "users"("id"),
      "search_document" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce("title", '')), 'A') || setweight(to_tsvector('simple', coalesce("body", '')), 'B')) STORED,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "deleted_at" timestamptz
    )`);
    await q.query(`CREATE INDEX "IDX_posts_feed" ON "posts" ("status", "is_pinned" DESC, "created_at" DESC) WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_posts_section" ON "posts" ("section_id") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_posts_author" ON "posts" ("author_id") WHERE "deleted_at" IS NULL`);
    await q.query(`CREATE INDEX "IDX_posts_search" ON "posts" USING GIN ("search_document")`);
    await q.query(`CREATE TABLE "comments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "body" text NOT NULL,
      "status" varchar(20) NOT NULL DEFAULT 'published' CHECK ("status" IN ('published','hidden','deleted')),
      "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
      "author_id" uuid NOT NULL REFERENCES "users"("id"), "parent_id" uuid REFERENCES "comments"("id") ON DELETE CASCADE,
      "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_comments_post" ON "comments" ("post_id", "created_at")`);
    await q.query(`CREATE INDEX "IDX_comments_parent" ON "comments" ("parent_id")`);
    await q.query(`CREATE TABLE "likes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('article','video','post','comment')), "target_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_likes_user_target" UNIQUE ("user_id","target_type","target_id")
    )`);
    await q.query(`CREATE INDEX "IDX_likes_target" ON "likes" ("target_type","target_id")`);
    await q.query(`CREATE TABLE "favorites" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('article','video','post')), "target_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_favorites_user_target" UNIQUE ("user_id","target_type","target_id")
    )`);
    await q.query(`CREATE INDEX "IDX_favorites_target" ON "favorites" ("target_type","target_id")`);
    await q.query(`CREATE TABLE "follows" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "follower_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('user','creator')), "target_id" uuid NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_follows_follower_target" UNIQUE ("follower_id","target_type","target_id")
    )`);
    await q.query(`CREATE INDEX "IDX_follows_target" ON "follows" ("target_type","target_id")`);
    await q.query(`CREATE TABLE "reports" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "reporter_id" uuid NOT NULL REFERENCES "users"("id"),
      "target_type" varchar(20) NOT NULL CHECK ("target_type" IN ('post','comment','article','user')), "target_id" uuid NOT NULL,
      "reason" varchar(80) NOT NULL, "details" varchar(1000),
      "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','resolved','rejected')),
      "handled_by_id" uuid REFERENCES "users"("id"), "resolution" varchar(1000), "handled_at" timestamptz,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_reports_queue" ON "reports" ("status", "created_at" DESC)`);
    await q.query(`CREATE INDEX "IDX_reports_target" ON "reports" ("target_type", "target_id")`);
    await q.query(`CREATE TABLE "moderation_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "operator_id" uuid NOT NULL REFERENCES "users"("id"),
      "target_type" varchar(20) NOT NULL, "target_id" uuid NOT NULL, "action" varchar(40) NOT NULL,
      "reason" varchar(500) NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX "IDX_moderation_logs_target" ON "moderation_logs" ("target_type", "target_id", "created_at" DESC)`);
    await q.query(`INSERT INTO "forum_sections" ("slug","name","description","sort_order") VALUES
      ('macro-policy','宏观与政策','讨论宏观数据、监管变化与政策影响。',10),
      ('capital-markets','资本市场','跟踪权益、固收与市场结构。',20),
      ('technology-industry','科技与产业','关注技术商业化与产业链变化。',30),
      ('startups-investment','创业与投融资','交流融资、创业实践与投资观察。',40),
      ('wealth-management','财富管理','讨论资产配置、产品与客户服务。',50),
      ('global-markets','出海与全球市场','连接跨境经营与全球市场机会。',60),
      ('research-qa','行业研究与专业问答','发布研究问题，邀请同行共同验证。',70),
      ('community-events','社群活动与公告','查看社区活动、规则与平台公告。',80)`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "moderation_logs"`); await q.query(`DROP TABLE IF EXISTS "reports"`);
    await q.query(`DROP TABLE IF EXISTS "follows"`); await q.query(`DROP TABLE IF EXISTS "favorites"`); await q.query(`DROP TABLE IF EXISTS "likes"`);
    await q.query(`DROP TABLE IF EXISTS "comments"`); await q.query(`DROP TABLE IF EXISTS "posts"`); await q.query(`DROP TABLE IF EXISTS "forum_sections"`);
    await q.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "banned_at", DROP COLUMN IF EXISTS "ban_reason"`);
  }
}
