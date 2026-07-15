import { MigrationInterface, QueryRunner } from "typeorm";
export class EventsNotifications1710000004000 implements MigrationInterface {
  name = "EventsNotifications1710000004000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(160) NOT NULL, "description" text NOT NULL, "cover_url" varchar(500), "location_name" varchar(160) NOT NULL, "location_address" varchar(280), "starts_at" timestamptz NOT NULL, "ends_at" timestamptz NOT NULL, "registration_deadline" timestamptz, "capacity" integer, "registration_fields" jsonb NOT NULL DEFAULT '[]'::jsonb, "status" varchar(20) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','published','cancelled','completed')), "organizer_id" uuid NOT NULL REFERENCES "users"("id"), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CHECK ("ends_at" > "starts_at"), CHECK ("capacity" IS NULL OR "capacity" > 0))`);
    await q.query(`CREATE INDEX "IDX_events_public" ON "events" ("status", "starts_at")`);
    await q.query(`CREATE TABLE "event_registrations" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE, "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "status" varchar(20) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','confirmed','cancelled')), "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb, "checked_in_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "UQ_event_registrations_event_user" UNIQUE ("event_id", "user_id"))`);
    await q.query(`CREATE INDEX "IDX_event_registrations_event" ON "event_registrations" ("event_id", "status")`);
    await q.query(`CREATE TABLE "notifications" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "type" varchar(40) NOT NULL, "title" varchar(160) NOT NULL, "body" text NOT NULL, "target_type" varchar(40), "target_id" uuid, "is_read" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now())`);
    await q.query(`CREATE INDEX "IDX_notifications_user_feed" ON "notifications" ("user_id", "is_read", "created_at" DESC)`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP TABLE IF EXISTS "notifications"`); await q.query(`DROP TABLE IF EXISTS "event_registrations"`); await q.query(`DROP TABLE IF EXISTS "events"`); }
}
