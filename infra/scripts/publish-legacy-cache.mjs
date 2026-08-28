#!/usr/bin/env node

/**
 * Publishes the index-only historic crawler cache stored in pc/finance.db.
 *
 * The cache contains titles, sources, original links and collection times,
 * but generally does not contain article bodies. Imported entries therefore
 * remain link cards: they are clearly labelled as historical cache records
 * and send readers to the original source for the full text.
 *
 * Usage:
 *   node infra/scripts/publish-legacy-cache.mjs --dry-run
 *   node infra/scripts/publish-legacy-cache.mjs
 *   node infra/scripts/publish-legacy-cache.mjs --legacy-db pc/finance.db
 *
 * The importer is idempotent. It never overwrites an existing CMS article or
 * a manually edited prior import; records are matched by original URL,
 * canonical URL and a stable legacy import key.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const requireFromApi = createRequire(resolve(workspaceRoot, "apps/api/package.json"));
const { Client } = requireFromApi("pg");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const legacyDbFlag = args.indexOf("--legacy-db");
const legacyDb = resolve(workspaceRoot, legacyDbFlag >= 0 ? args[legacyDbFlag + 1] : "pc/finance.db");

const legacyDatabaseName = basename(legacyDb).toLowerCase();
const legacyDatabaseKey = (({ "finance.db": "finance", "news.db": "news", "opc.db": "opc" })[legacyDatabaseName]
  ?? legacyDatabaseName.replace(/\.db$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
  || "unknown";
const importSource = `legacy-${legacyDatabaseKey}-cache`;
const categorySlug = "historical-cache";
const categoryName = "历史缓存";
const tagSlug = "historical-cache";
const tagName = "历史缓存";
const importedBody = "此条目来自历史采集缓存，当前仅保留标题、来源和原文链接。请通过下方“阅读原文”查看完整内容。";
const batchSize = 250;

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

function legacyRows(databasePath) {
  if (!existsSync(databasePath)) throw new Error(`找不到历史缓存库：${databasePath}`);
  const script = String.raw`
import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8")
connection = sqlite3.connect(sys.argv[1])
connection.row_factory = sqlite3.Row
rows = connection.execute("""
  SELECT id, title, url, source, publish_time, summary, content, keywords,
         created_at, updated_at
  FROM news_articles
  ORDER BY id ASC
""").fetchall()
print(json.dumps([dict(row) for row in rows], ensure_ascii=False))
`;
  const result = spawnSync("python", ["-c", script, databasePath], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  if (result.error) throw new Error(`无法读取历史缓存库：${result.error.message}`);
  if (result.status !== 0) throw new Error(`无法读取历史缓存库：${result.stderr.trim() || "Python 执行失败"}`);
  const rows = JSON.parse(result.stdout);
  if (!Array.isArray(rows)) throw new Error("历史缓存库返回的数据格式不正确");
  return rows;
}

function cleanText(value, maxLength) {
  return Array.from(String(value ?? "").replace(/\0/g, "").trim()).slice(0, maxLength).join("");
}

function validHttpUrl(value) {
  const url = cleanText(value, 1000);
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

function legacyDate(...values) {
  for (const value of values) {
    const raw = cleanText(value, 80);
    if (!raw) continue;
    const normalized = raw.replace(" ", "T");
    const withTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)
      ? `${normalized}+08:00`
      : normalized;
    if (Number.isFinite(Date.parse(withTimezone))) return withTimezone;
  }
  return new Date().toISOString();
}

function keywords(value) {
  return [...new Set(
    String(value ?? "")
      .split(/[,，、/|\n\r]+/)
      .map((item) => cleanText(item, 80))
      .filter(Boolean),
  )].slice(0, 12);
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeRow(raw) {
  const legacyId = Number(raw.id);
  const originalUrl = validHttpUrl(raw.url);
  const title = cleanText(raw.title, 240);
  if (!Number.isInteger(legacyId) || legacyId <= 0 || !originalUrl || !title) return null;

  const sourceName = cleanText(raw.source, 160) || "历史采集来源";
  const rawSummary = cleanText(raw.summary, 800);
  const importedAt = legacyDate(raw.publish_time, raw.created_at, raw.updated_at);
  const importKey = `${importSource}:${legacyId}`;
  return {
    importKey,
    slug: `legacy-cache-${legacyDatabaseKey}-${legacyId}-${shortHash(originalUrl).slice(0, 12)}`,
    title,
    summary: rawSummary || cleanText(`历史采集条目 · ${sourceName}：${title}。正文未存档，请查看原文。`, 800),
    originalUrl,
    publishedAt: importedAt,
    sourceName,
    sourceUrl: originalUrl,
    canonicalUrl: originalUrl,
    contentFingerprint: shortHash(`${importSource}:${originalUrl}`),
    summaryKeywords: keywords(raw.keywords),
    classification: { legacy_cache: 1 },
    agentAnalysis: {
      import_source: importSource,
      import_key: importKey,
      legacy_cache_id: legacyId,
      provenance: "pc/finance.db",
    },
  };
}

function chunks(values, size) {
  const batches = [];
  for (let index = 0; index < values.length; index += size) batches.push(values.slice(index, index + size));
  return batches;
}

async function existingMatches(connection, rows) {
  if (!rows.length) return [];
  const originalUrls = rows.map((row) => row.originalUrl);
  const importKeys = rows.map((row) => row.importKey);
  const result = await connection.query(
    `SELECT original_url, canonical_url, agent_analysis->>'import_key' AS import_key
     FROM articles
     WHERE original_url = ANY($1::text[])
        OR canonical_url = ANY($1::text[])
        OR agent_analysis->>'import_key' = ANY($2::text[])`,
    [originalUrls, importKeys],
  );
  return result.rows;
}

function splitExisting(rows, matches) {
  const originalUrls = new Set(matches.map((row) => row.original_url).filter(Boolean));
  const canonicalUrls = new Set(matches.map((row) => row.canonical_url).filter(Boolean));
  const importKeys = new Set(matches.map((row) => row.import_key).filter(Boolean));
  const toPublish = [];
  let alreadyImported = 0;
  let duplicateExisting = 0;
  for (const row of rows) {
    if (importKeys.has(row.importKey)) {
      alreadyImported++;
    } else if (originalUrls.has(row.originalUrl) || canonicalUrls.has(row.canonicalUrl)) {
      duplicateExisting++;
    } else {
      toPublish.push(row);
    }
  }
  return { toPublish, alreadyImported, duplicateExisting };
}

async function ensureCategoryAndTag(connection) {
  const category = await connection.query(
    `INSERT INTO categories (slug, name, sort_order, is_active, parent_id)
     VALUES ($1, $2, 999, true, NULL)
     ON CONFLICT (slug) DO UPDATE SET is_active = true
     RETURNING id`,
    [categorySlug, categoryName],
  );
  const tag = await connection.query(
    `INSERT INTO tags (slug, name)
     VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [tagSlug, tagName],
  );
  return { categoryId: category.rows[0].id, tagId: tag.rows[0].id };
}

function asPayload(rows) {
  return JSON.stringify(rows.map((row) => ({
    import_key: row.importKey,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    original_url: row.originalUrl,
    published_at: row.publishedAt,
    source_name: row.sourceName,
    source_url: row.sourceUrl,
    canonical_url: row.canonicalUrl,
    content_fingerprint: row.contentFingerprint,
    summary_keywords: row.summaryKeywords,
    classification: row.classification,
    agent_analysis: row.agentAnalysis,
  })));
}

async function publish(connection, rows) {
  const { categoryId, tagId } = await ensureCategoryAndTag(connection);
  let inserted = 0;
  for (const batch of chunks(rows, batchSize)) {
    const payload = asPayload(batch);
    const result = await connection.query(
      `WITH data AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS row(
           import_key text, slug text, title text, summary text, original_url text,
           published_at timestamptz, source_name text, source_url text,
           canonical_url text, content_fingerprint text, summary_keywords jsonb,
           classification jsonb, agent_analysis jsonb
         )
       )
       INSERT INTO articles (
         slug, title, summary, cover_image_url, type, status, original_url, published_at,
         content, original_content, canonical_url, content_fingerprint, classification,
         summary_keywords, summary_entities, summary_model_version, summary_generated_at,
         summary_reviewed, agent_analysis, heat_score, category_id, operator_id,
         created_at, updated_at
       )
       SELECT
         data.slug, data.title, data.summary, NULL, 'news', 'published', data.original_url,
         data.published_at, $2, NULL, data.canonical_url, data.content_fingerprint,
         data.classification, data.summary_keywords, '[]'::jsonb,
         'legacy-cache-import-v1', NOW(), false, data.agent_analysis, 0, $3, NULL,
         NOW(), NOW()
       FROM data
       WHERE NOT EXISTS (
         SELECT 1 FROM articles existing
         WHERE existing.original_url = data.original_url
            OR existing.canonical_url = data.canonical_url
            OR existing.agent_analysis->>'import_key' = data.import_key
       )
       RETURNING id, agent_analysis->>'import_key' AS import_key`,
      [payload, importedBody, categoryId],
    );
    const insertedKeys = result.rows.map((row) => row.import_key);
    inserted += insertedKeys.length;
    if (!insertedKeys.length) continue;

    await connection.query(
      `WITH data AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS row(
           import_key text, source_name text, source_url text
         )
       )
       INSERT INTO article_sources (article_id, name, url, is_primary)
       SELECT article.id, data.source_name, data.source_url, true
       FROM data
       JOIN articles article ON article.agent_analysis->>'import_key' = data.import_key
       WHERE NOT EXISTS (
         SELECT 1 FROM article_sources existing
         WHERE existing.article_id = article.id AND existing.url = data.source_url
       )`,
      [asPayload(batch),],
    );
    await connection.query(
      `INSERT INTO content_tags (article_id, tag_id)
       SELECT article.id, $1
       FROM articles article
       WHERE article.agent_analysis->>'import_key' = ANY($2::text[])
       ON CONFLICT DO NOTHING`,
      [tagId, insertedKeys],
    );
  }
  return { inserted, categoryId, tagId };
}

async function main() {
  const env = readEnvFile();
  const rawRows = legacyRows(legacyDb);
  const normalized = rawRows.map(normalizeRow);
  const validRows = normalized.filter(Boolean);
  const skipped = rawRows.length - validRows.length;
  if (!validRows.length) throw new Error("历史缓存库中没有可公开的 HTTP 文章链接");

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
    const matches = await existingMatches(connection, validRows);
    const result = splitExisting(validRows, matches);
    const summary = {
      legacyRows: rawRows.length,
      validRows: validRows.length,
      skipped,
      alreadyImported: result.alreadyImported,
      duplicateExisting: result.duplicateExisting,
      [dryRun ? "wouldPublish" : "toPublish"]: result.toPublish.length,
    };
    if (dryRun) {
      console.log(JSON.stringify(summary));
      return;
    }

    await connection.query("BEGIN");
    try {
      const published = await publish(connection, result.toPublish);
      await connection.query("COMMIT");
      console.log(JSON.stringify({ ...summary, published: published.inserted, category: categoryName }));
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
