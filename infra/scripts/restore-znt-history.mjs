#!/usr/bin/env node

/**
 * Applies the structured ZNT history cache to legacy articles already imported
 * into PostgreSQL. It restores safe plain-text cached bodies, generated
 * summaries, actual historical publication times, and the historical channel
 * classification (news / policy / case study).
 *
 * Only entries marked as legacy imports are updated. Manually authored CMS
 * articles with the same original URL are never changed.
 *
 * Usage:
 *   node infra/scripts/restore-znt-history.mjs --dry-run
 *   node infra/scripts/restore-znt-history.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const requireFromApi = createRequire(resolve(workspaceRoot, "apps/api/package.json"));
const { Client } = requireFromApi("pg");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const resultsRoot = resolve(workspaceRoot, "znt/results");
const pageCacheRoot = resolve(workspaceRoot, "znt/page_cache");
const legacyImportSources = ["legacy-finance-cache", "legacy-news-cache", "legacy-opc-cache"];
const batchSize = 100;

const categories = {
  news: { slug: "historical-cache", name: "历史缓存", sortOrder: 999 },
  policy: { slug: "historical-policy", name: "历史政策", sortOrder: 997 },
  insight: { slug: "historical-insight", name: "历史案例", sortOrder: 998 },
};

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

function cleanText(value, maxLength = 100000) {
  return Array.from(String(value ?? "").replace(/\0/g, "").replace(/\r\n?/g, "\n").trim()).slice(0, maxLength).join("");
}

function safePlainText(value) {
  return cleanText(String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n"), 60000);
}

function safeDate(value) {
  const raw = cleanText(value, 80);
  if (!raw) return null;
  const normalized = raw.replace(" ", "T");
  const candidate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(normalized)
    ? `${normalized}+08:00`
    : normalized;
  return Number.isFinite(Date.parse(candidate)) ? candidate : null;
}

function asKeywords(...values) {
  return [...new Set(values.flatMap((value) => String(value ?? "")
    .split(/[,，、/|\n\r]+/)
    .map((item) => cleanText(item, 80))
    .filter(Boolean)))].slice(0, 16);
}

function urlKeys(value) {
  const raw = cleanText(value, 1000);
  if (!raw) return [];
  const keys = new Set([raw]);
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    keys.add(parsed.toString());
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
      keys.add(parsed.toString());
    }
  } catch {
    // The current article can still match the exact stored URL.
  }
  return [...keys];
}

function cacheByUrl() {
  const pages = new Map();
  if (!existsSync(pageCacheRoot)) return pages;
  for (const name of readdirSync(pageCacheRoot)) {
    if (!name.endsWith(".json")) continue;
    try {
      const page = JSON.parse(readFileSync(resolve(pageCacheRoot, name), "utf8"));
      if (!page || page.ok !== true || !page.final_url) continue;
      const item = {
        content: safePlainText(page.content),
        summary: cleanText(page.summary, 800),
        publishedAt: safeDate(page.published_time),
      };
      for (const key of urlKeys(page.final_url)) if (!pages.has(key)) pages.set(key, item);
    } catch {
      // A corrupt cache file must not prevent other historical records loading.
    }
  }
  return pages;
}

function latestAnalysisRows() {
  if (!existsSync(resultsRoot)) throw new Error(`找不到 ZNT 结果目录：${resultsRoot}`);
  const latest = new Map();
  for (const entry of readdirSync(resultsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = resolve(resultsRoot, entry.name);
    const metadataPath = resolve(directory, "run_metadata.json");
    const resultsPath = resolve(directory, "all_results.jsonl");
    if (!existsSync(metadataPath) || !existsSync(resultsPath)) continue;
    let generatedAt = "";
    try { generatedAt = String(JSON.parse(readFileSync(metadataPath, "utf8")).generated_at ?? ""); } catch { continue; }
    for (const line of readFileSync(resultsPath, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const url = cleanText(row.url, 1000);
        if (!url) continue;
        const previous = latest.get(url);
        if (!previous || generatedAt > previous.generatedAt) latest.set(url, { generatedAt, row });
      } catch {
        // Keep processing the remaining JSONL lines.
      }
    }
  }
  return [...latest.values()];
}

function normalizeAnalysis({ generatedAt, row }, pages) {
  const analysis = row.analysis && typeof row.analysis === "object" ? row.analysis : {};
  const category = analysis.category === "policy" || analysis.category === "policy_interpretation"
    ? "policy"
    : analysis.category === "case_study"
      ? "insight"
      : "news";
  const page = [...urlKeys(row.web_enrichment?.final_url), ...urlKeys(row.url)]
    .map((key) => pages.get(key))
    .find(Boolean) ?? null;
  const summary = cleanText(analysis.core_summary || page?.summary || row.title, 800);
  const relationPaths = Array.isArray(analysis.relation_paths) ? analysis.relation_paths : [];
  const classification = Object.fromEntries(relationPaths
    .filter((item) => item && typeof item.id === "string")
    .map((item) => [item.id, Number.isFinite(Number(item.score)) ? Number(item.score) : 1]));
  if (category === "policy") classification.historical_policy = 1;
  if (category === "insight") classification.historical_case_study = 1;
  const agentAnalysis = {
    legacy_znt_generated_at: generatedAt,
    decision: analysis.decision ?? null,
    relevance_score: analysis.relevance_score ?? null,
    confidence: analysis.confidence ?? null,
    category: analysis.category ?? "news",
    importance_score: analysis.importance_score ?? null,
    relation_level: analysis.relation_level ?? null,
    reason: analysis.reason ?? null,
    matched_terms: Array.isArray(analysis.matched_terms) ? analysis.matched_terms.slice(0, 24) : [],
    policy_terms: Array.isArray(analysis.policy_terms) ? analysis.policy_terms.slice(0, 24) : [],
    jurisdiction: analysis.jurisdiction ?? null,
    issuing_authority: analysis.issuing_authority ?? null,
    effective_date: analysis.effective_date ?? null,
    affected_entities: Array.isArray(analysis.affected_entities) ? analysis.affected_entities.slice(0, 24) : [],
    policy_implications: Array.isArray(analysis.policy_implications) ? analysis.policy_implications.slice(0, 24) : [],
    action_items: Array.isArray(analysis.action_items) ? analysis.action_items.slice(0, 24) : [],
    analysis_mode: analysis.analysis_mode ?? "legacy-znt",
    agent_version: analysis.agent_version ?? "2.0.1",
  };
  return {
    originalUrl: cleanText(row.url, 1000),
    articleType: category,
    categorySlug: categories[category].slug,
    summary,
    content: page?.content ?? "",
    publishedAt: safeDate(row.publish_time) ?? page?.publishedAt ?? null,
    summaryKeywords: asKeywords(row.keywords, ...(analysis.matched_terms ?? []), ...(analysis.policy_terms ?? [])),
    classification,
    agentAnalysis,
  };
}

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function ensureCategories(connection) {
  for (const category of Object.values(categories)) {
    await connection.query(
      `INSERT INTO categories (slug, name, sort_order, is_active, parent_id)
       VALUES ($1, $2, $3, true, NULL)
       ON CONFLICT (slug) DO UPDATE SET is_active = true`,
      [category.slug, category.name, category.sortOrder],
    );
  }
}

function payload(rows) {
  return JSON.stringify(rows.map((row) => ({
    original_url: row.originalUrl,
    article_type: row.articleType,
    category_slug: row.categorySlug,
    summary: row.summary,
    content: row.content,
    published_at: row.publishedAt,
    summary_keywords: row.summaryKeywords,
    classification: row.classification,
    agent_analysis: row.agentAnalysis,
  })));
}

async function targetCount(connection, rows) {
  const result = await connection.query(
    `SELECT count(*)::int AS count
     FROM articles
     WHERE original_url = ANY($1::text[])
       AND agent_analysis->>'import_source' = ANY($2::text[])`,
    [rows.map((row) => row.originalUrl), legacyImportSources],
  );
  return result.rows[0].count;
}

async function restore(connection, rows) {
  await ensureCategories(connection);
  let enriched = 0;
  for (const batch of chunks(rows, batchSize)) {
    const result = await connection.query(
      `WITH data AS (
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS row(
           original_url text, article_type text, category_slug text, summary text,
           content text, published_at timestamptz, summary_keywords jsonb,
           classification jsonb, agent_analysis jsonb
         )
       )
       UPDATE articles article
       SET
         type = data.article_type,
         category_id = category.id,
         summary = CASE WHEN data.summary <> '' THEN data.summary ELSE article.summary END,
         content = CASE WHEN data.content <> '' THEN data.content ELSE article.content END,
         published_at = COALESCE(data.published_at, article.published_at),
         classification = article.classification || data.classification,
         summary_keywords = CASE WHEN jsonb_array_length(data.summary_keywords) > 0 THEN data.summary_keywords ELSE article.summary_keywords END,
         summary_model_version = 'legacy-znt-history-v1',
         summary_generated_at = NOW(),
         summary_reviewed = false,
         agent_analysis = article.agent_analysis || data.agent_analysis,
         updated_at = NOW()
       FROM data
       JOIN categories category ON category.slug = data.category_slug
       WHERE article.original_url = data.original_url
         AND article.agent_analysis->>'import_source' = ANY($2::text[])
       RETURNING article.id`,
      [payload(batch), legacyImportSources],
    );
    enriched += result.rowCount ?? 0;
  }
  return enriched;
}

async function main() {
  const env = readEnvFile();
  const pages = cacheByUrl();
  const rows = latestAnalysisRows().map((row) => normalizeAnalysis(row, pages)).filter((row) => row.originalUrl);
  if (!rows.length) throw new Error("没有可恢复的 ZNT 历史分析记录");
  const byType = Object.fromEntries(["news", "policy", "insight"].map((type) => [type, rows.filter((row) => row.articleType === type).length]));
  const withContent = rows.filter((row) => row.content).length;
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
    const targets = await targetCount(connection, rows);
    const summary = { historicalRows: rows.length, cachedBodies: withContent, byType, targetLegacyArticles: targets };
    if (dryRun) {
      console.log(JSON.stringify(summary));
      return;
    }
    await connection.query("BEGIN");
    try {
      const enriched = await restore(connection, rows);
      await connection.query("COMMIT");
      console.log(JSON.stringify({ ...summary, enriched }));
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
