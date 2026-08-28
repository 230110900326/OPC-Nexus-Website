#!/usr/bin/env node

/**
 * Restores the published legacy video feed from pc/news.db into PostgreSQL.
 *
 * The legacy crawler stored one video per `video_creators` row.  The current
 * application uses creators -> creator_accounts -> videos, so this importer
 * translates that shape without touching articles or raw crawler caches.
 *
 * Usage:
 *   node infra/scripts/restore-legacy-videos.mjs --dry-run
 *   node infra/scripts/restore-legacy-videos.mjs
 *   node infra/scripts/restore-legacy-videos.mjs --refresh-legacy
 *   node infra/scripts/restore-legacy-videos.mjs --legacy-db pc/news.db
 *
 * It is intentionally idempotent: a later run only re-enables an already
 * restored video instead of replacing its title, metadata, or manual edits.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const workspaceRoot = resolve(import.meta.dirname, "../..");
// This script lives outside the API workspace, so resolve its runtime driver
// from the API package rather than relying on npm hoisting it to the root.
const requireFromApi = createRequire(resolve(workspaceRoot, "apps/api/package.json"));
const { Client } = requireFromApi("pg");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const refreshLegacy = args.includes("--refresh-legacy");
const legacyDbFlag = args.indexOf("--legacy-db");
const legacyDb = resolve(workspaceRoot, legacyDbFlag >= 0 ? args[legacyDbFlag + 1] : "pc/news.db");

function readEnvFile() {
  const envPath = resolve(workspaceRoot, ".env");
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");
        return [key, value];
      }),
  );
}

function legacyRows(databasePath) {
  if (!existsSync(databasePath)) throw new Error(`找不到旧视频库：${databasePath}`);
  const script = String.raw`
import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")
connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row
rows = connection.execute("""
  SELECT id, platform, creator_name, creator_id, homepage_url, video_title,
         video_url, description, keywords, created_at
  FROM video_creators
  WHERE video_url IS NOT NULL AND trim(video_url) <> ''
  ORDER BY id ASC
""").fetchall()
print(json.dumps([dict(row) for row in rows], ensure_ascii=False))
`;
  const result = spawnSync("python", ["-c", script, databasePath], {
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (result.error) throw new Error(`无法读取旧视频库：${result.error.message}`);
  if (result.status !== 0) throw new Error(`无法读取旧视频库：${result.stderr.trim() || "Python 执行失败"}`);
  const rows = JSON.parse(result.stdout);
  if (!Array.isArray(rows)) throw new Error("旧视频库返回的数据格式不正确");
  return rows;
}

function asTags(raw) {
  return [...new Set(String(raw ?? "").split(/[,，、/]/).map((value) => value.trim()).filter(Boolean))].slice(0, 12);
}

function legacyDate(value) {
  const normalized = String(value ?? "").trim().replace(" ", "T");
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)
    ? `${normalized}+08:00`
    : new Date().toISOString();
}

function normalizeRow(row) {
  const platform = String(row.platform ?? "").trim().toLowerCase();
  const originalUrl = String(row.video_url ?? "").trim();
  const bvid = originalUrl.match(/\/video\/(BV[A-Za-z0-9]+)/)?.[1];
  if (platform !== "bilibili" || !bvid || !/^https:\/\/(www\.)?bilibili\.com\/video\//i.test(originalUrl)) return null;
  const title = String(row.video_title ?? "").trim();
  const creatorName = String(row.creator_name ?? "").trim();
  const accountId = String(row.creator_id ?? "").trim();
  const profileUrl = String(row.homepage_url ?? "").trim();
  if (!title || !creatorName || !accountId || !profileUrl) return null;
  const description = String(row.description ?? "").trim();
  return {
    platform,
    bvid,
    title: title.slice(0, 240),
    creatorName: creatorName.slice(0, 120),
    accountId: accountId.slice(0, 160),
    profileUrl: profileUrl.slice(0, 1000),
    originalUrl: originalUrl.slice(0, 1000),
    description,
    tags: asTags(row.keywords),
    publishedAt: legacyDate(row.created_at),
  };
}

async function restore(rows, connection) {
  const summary = { restored: 0, refreshed: 0, reenabled: 0, alreadyPresent: 0, skipped: 0 };
  await connection.query("BEGIN");
  try {
    for (const raw of rows) {
      const row = normalizeRow(raw);
      if (!row) {
        summary.skipped++;
        continue;
      }

      const existingVideo = await connection.query(
        "SELECT id, creator_account_id, is_published, subtitle_source FROM videos WHERE platform = $1 AND platform_video_id = $2",
        [row.platform, row.bvid],
      );
      if (existingVideo.rowCount) {
        const existing = existingVideo.rows[0];
        if (refreshLegacy && existing.subtitle_source === "legacy-pc-news-db") {
          await connection.query(
            `UPDATE videos
             SET title = $1, original_url = $2, published_at = $3::timestamptz,
                 platform_description = $4, content_summary = $5, key_points = $6::jsonb,
                 industry_tags = $7::jsonb, is_published = true, updated_at = NOW()
             WHERE id = $8`,
            [
              row.title,
              row.originalUrl,
              row.publishedAt,
              row.description,
              row.description ? row.description.slice(0, 180) : null,
              JSON.stringify(row.description ? [row.description.slice(0, 120)] : []),
              JSON.stringify(row.tags),
              existing.id,
            ],
          );
          await connection.query(
            `UPDATE creator_accounts
             SET display_name = $1, profile_url = $2, updated_at = NOW()
             WHERE id = $3`,
            [row.creatorName, row.profileUrl, existing.creator_account_id],
          );
          await connection.query(
            `UPDATE creators
             SET name = $1, industries = $2::jsonb, updated_at = NOW()
             WHERE id = (SELECT creator_id FROM creator_accounts WHERE id = $3)`,
            [row.creatorName, JSON.stringify(row.tags), existing.creator_account_id],
          );
          summary.refreshed++;
        } else if (!existing.is_published) {
          await connection.query("UPDATE videos SET is_published = true, updated_at = NOW() WHERE id = $1", [existingVideo.rows[0].id]);
          summary.reenabled++;
        } else {
          summary.alreadyPresent++;
        }
        continue;
      }

      const existingAccount = await connection.query(
        "SELECT id FROM creator_accounts WHERE platform = $1 AND platform_account_id = $2",
        [row.platform, row.accountId],
      );
      let creatorAccountId = existingAccount.rows[0]?.id;
      if (!creatorAccountId) {
        // The old SQLite schema carries no proof of creator authorization.
        // Keep the recovered, previously published video visible, while leaving
        // the new creator account disabled until it is reviewed in the admin UI.
        const creator = await connection.query(
          "INSERT INTO creators (name, avatar_url, industries, trust_level, authorization_status, is_enabled) VALUES ($1, NULL, $2::jsonb, 3, 'pending', false) RETURNING id",
          [row.creatorName, JSON.stringify(row.tags)],
        );
        const account = await connection.query(
          "INSERT INTO creator_accounts (creator_id, platform, platform_account_id, display_name, profile_url, is_enabled) VALUES ($1, $2, $3, $4, $5, false) RETURNING id",
          [creator.rows[0].id, row.platform, row.accountId, row.creatorName, row.profileUrl],
        );
        creatorAccountId = account.rows[0].id;
      }

      await connection.query(
        `INSERT INTO videos (
          platform, platform_video_id, title, cover_url, original_url, creator_account_id,
          published_at, duration_seconds, platform_metrics, platform_description,
          content_summary, key_points, industry_tags, chapters, subtitle_status,
          subtitle_source, transcript, summary_model_version, is_published, created_at, updated_at
        ) VALUES (
          $1, $2, $3, NULL, $4, $5,
          $6::timestamptz, 0, '{}'::jsonb, $7,
          $8, $9::jsonb, $10::jsonb, '[]'::jsonb, 'not_fetched',
          'legacy-pc-news-db', NULL, 'legacy-restore-v1', true, $6::timestamptz, $6::timestamptz
        )`,
        [
          row.platform,
          row.bvid,
          row.title,
          row.originalUrl,
          creatorAccountId,
          row.publishedAt,
          row.description,
          row.description ? row.description.slice(0, 180) : null,
          JSON.stringify(row.description ? [row.description.slice(0, 120)] : []),
          JSON.stringify(row.tags),
        ],
      );
      summary.restored++;
    }
    if (dryRun) await connection.query("ROLLBACK");
    else await connection.query("COMMIT");
    return summary;
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  const env = readEnvFile();
  const rows = legacyRows(legacyDb);
  const validRows = rows.map(normalizeRow).filter(Boolean);
  if (!validRows.length) throw new Error("旧视频库中没有可恢复的哔哩哔哩视频记录");
  console.log(`legacy_rows=${rows.length} valid_videos=${validRows.length} mode=${dryRun ? "dry-run" : refreshLegacy ? "refresh-legacy" : "restore"}`);

  const connection = new Client({
    host: process.env.DB_HOST ?? env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? env.DB_USER ?? "opc",
    password: process.env.DB_PASSWORD ?? env.DB_PASSWORD,
    database: process.env.DB_NAME ?? env.DB_NAME ?? "opc_nexus",
    ssl: process.env.DB_SSL === "true" || env.DB_SSL === "true" ? { rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? env.DB_SSL_REJECT_UNAUTHORIZED) !== "false" } : undefined,
  });
  await connection.connect();
  try {
    const summary = await restore(rows, connection);
    console.log(JSON.stringify(summary));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
