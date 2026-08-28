#!/usr/bin/env node

/**
 * Restores Bilibili records left in the legacy crawler logs.
 *
 * The old Scrapy pipeline raised an exception after it had already logged the
 * complete discovered item. That meant hundreds of valid video records never
 * reached pc/news.db. This script extracts those structured log entries and
 * imports them into the current video schema.
 *
 * Usage:
 *   node infra/scripts/restore-legacy-log-videos.mjs --dry-run
 *   node infra/scripts/restore-legacy-log-videos.mjs
 *   node infra/scripts/restore-legacy-log-videos.mjs --log-root pc
 *
 * It is idempotent: platform + BVID is the stable key and manually changed
 * videos are never overwritten on a later run.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const requireFromApi = createRequire(resolve(workspaceRoot, "apps/api/package.json"));
const { Client } = requireFromApi("pg");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const logRootFlag = args.indexOf("--log-root");
const logRoot = resolve(workspaceRoot, logRootFlag >= 0 ? args[logRootFlag + 1] : "pc");

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
        return [key, rawValue.replace(/^(["'])(.*)\1$/, "$2")];
      }),
  );
}

function legacyRows(root) {
  if (!existsSync(root)) throw new Error(`找不到旧视频日志目录：${root}`);
  const script = String.raw`
import ast
import glob
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
records = []
for file in glob.glob(os.path.join(sys.argv[1], "**", "*.log"), recursive=True):
    text = open(file, encoding="utf-8", errors="replace").read()
    position = 0
    while True:
        start = text.find("Error processing {", position)
        if start < 0:
            break
        object_start = text.find("{", start)
        object_end = text.find("\nTraceback", object_start)
        if object_end < 0:
            position = object_start + 1
            continue
        try:
            item = ast.literal_eval(text[object_start:object_end].strip())
        except Exception:
            position = object_end + 1
            continue
        match = re.search(r"bilibili\.com/video/(BV[A-Za-z0-9]+)", str(item.get("video_url") or ""), re.I)
        if match:
            item["bvid"] = match.group(1)
            item["log_file"] = os.path.basename(file)
            records.append(item)
        position = object_end + 1

# A BVID can recur in several log runs. Keep the record with the highest
# captured play count; it carries the richest observed historical metrics.
best = {}
for item in records:
    key = item["bvid"]
    previous = best.get(key)
    if previous is None or int(item.get("play_count") or 0) > int(previous.get("play_count") or 0):
        best[key] = item
print(json.dumps(list(best.values()), ensure_ascii=False))
`;
  const result = spawnSync("python", ["-c", script, root], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (result.error) throw new Error(`无法读取旧视频日志：${result.error.message}`);
  if (result.status !== 0) throw new Error(`无法读取旧视频日志：${result.stderr.trim() || "Python 执行失败"}`);
  const rows = JSON.parse(result.stdout);
  if (!Array.isArray(rows)) throw new Error("旧视频日志返回的数据格式不正确");
  return rows;
}

function cleanText(value, maxLength) {
  return Array.from(String(value ?? "").replace(/\0/g, "").replace(/\s+/g, " ").trim()).slice(0, maxLength).join("");
}

function asTags(value) {
  return [...new Set(
    String(value ?? "")
      .split(/[,，、/|\n\r]+/)
      .map((item) => cleanText(item, 80))
      .filter(Boolean),
  )].slice(0, 12);
}

function legacyDate(value) {
  const seconds = Number(value);
  const timestamp = Number.isFinite(seconds) && seconds > 946684800 && seconds < 2051222400
    ? new Date(seconds * 1000)
    : null;
  return timestamp && Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : new Date().toISOString();
}

function normalizeRow(raw) {
  const originalUrl = cleanText(raw.video_url, 1000);
  const bvid = String(raw.bvid ?? "").trim();
  const title = cleanText(raw.video_title, 240);
  const creatorName = cleanText(raw.creator_name, 120);
  const accountId = cleanText(raw.creator_id, 160);
  const profileUrl = cleanText(raw.homepage_url, 1000);
  if (!/^BV[A-Za-z0-9]+$/.test(bvid) || !/^https:\/\/(www\.)?bilibili\.com\/video\//i.test(originalUrl) || !title || !creatorName || !accountId || !profileUrl) return null;
  const description = cleanText(raw.description, 4000);
  const tags = asTags(raw.keywords);
  const metrics = {};
  const views = Number(raw.play_count);
  const likes = Number(raw.like_count);
  if (Number.isFinite(views) && views >= 0) metrics.views = Math.floor(views);
  if (Number.isFinite(likes) && likes >= 0) metrics.likes = Math.floor(likes);
  return {
    bvid,
    title,
    creatorName,
    accountId,
    profileUrl,
    originalUrl,
    description,
    tags: [...new Set(["历史视频缓存", ...tags])].slice(0, 12),
    keyPoints: tags.length ? tags.slice(0, 6) : [],
    publishedAt: legacyDate(raw.publish_date),
    metrics,
  };
}

async function restore(rows, connection) {
  const summary = { restored: 0, reenabled: 0, alreadyPresent: 0, skipped: 0 };
  await connection.query("BEGIN");
  try {
    for (const raw of rows) {
      const row = normalizeRow(raw);
      if (!row) {
        summary.skipped++;
        continue;
      }
      const existingVideo = await connection.query(
        "SELECT id, is_published FROM videos WHERE platform = 'bilibili' AND platform_video_id = $1",
        [row.bvid],
      );
      if (existingVideo.rowCount) {
        if (!existingVideo.rows[0].is_published) {
          await connection.query("UPDATE videos SET is_published = true, updated_at = NOW() WHERE id = $1", [existingVideo.rows[0].id]);
          summary.reenabled++;
        } else {
          summary.alreadyPresent++;
        }
        continue;
      }

      const existingAccount = await connection.query(
        "SELECT id FROM creator_accounts WHERE platform = 'bilibili' AND platform_account_id = $1",
        [row.accountId],
      );
      let creatorAccountId = existingAccount.rows[0]?.id;
      if (!creatorAccountId) {
        const creator = await connection.query(
          "INSERT INTO creators (name, avatar_url, industries, trust_level, authorization_status, is_enabled) VALUES ($1, NULL, $2::jsonb, 3, 'pending', false) RETURNING id",
          [row.creatorName, JSON.stringify(row.tags)],
        );
        const account = await connection.query(
          "INSERT INTO creator_accounts (creator_id, platform, platform_account_id, display_name, profile_url, is_enabled) VALUES ($1, 'bilibili', $2, $3, $4, false) RETURNING id",
          [creator.rows[0].id, row.accountId, row.creatorName, row.profileUrl],
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
          'bilibili', $1, $2, NULL, $3, $4,
          $5::timestamptz, 0, $6::jsonb, $7,
          $8, $9::jsonb, $10::jsonb, '[]'::jsonb, 'not_fetched',
          'legacy-pc-log', NULL, 'legacy-log-restore-v1', true, $5::timestamptz, NOW()
        )`,
        [
          row.bvid,
          row.title,
          row.originalUrl,
          creatorAccountId,
          row.publishedAt,
          JSON.stringify(row.metrics),
          row.description,
          row.description || null,
          JSON.stringify(row.keyPoints),
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
  const rows = legacyRows(logRoot);
  const validRows = rows.map(normalizeRow).filter(Boolean);
  if (!validRows.length) throw new Error("旧视频日志中没有可恢复的哔哩哔哩视频记录");
  console.log(`legacy_log_rows=${rows.length} valid_videos=${validRows.length} mode=${dryRun ? "dry-run" : "restore"}`);
  const connection = new Client({
    host: process.env.DB_HOST ?? env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? env.DB_USER ?? "opc",
    password: process.env.DB_PASSWORD ?? env.DB_PASSWORD,
    database: process.env.DB_NAME ?? env.DB_NAME ?? "opc_nexus",
    ssl: process.env.DB_SSL === "true" || env.DB_SSL === "true"
      ? { rejectUnauthorized: (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? env.DB_SSL_REJECT_UNAUTHORIZED) !== "false" }
      : undefined,
  });
  await connection.connect();
  try {
    console.log(JSON.stringify(await restore(rows, connection)));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
