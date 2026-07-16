import { BadRequestException, Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

type SummaryRow = {
  newUsers: string | number; activeUsers: string | number; reads: string | number; posts: string | number;
  interactions: string | number; eventRegistrations: string | number; crawlSuccessRate: string | number;
  recommendationImpressions: string | number; recommendationClicks: string | number; recommendationCtr: string | number;
};

@Injectable()
export class OperationsDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async dashboard(input: DashboardQueryDto) {
    const range = resolveDashboardRange(input);
    const [summaryRows, popularRows, seriesRows] = await Promise.all([
      this.dataSource.query(summarySql, [range.from, range.to]) as Promise<SummaryRow[]>,
      this.dataSource.query(popularSql, [range.from, range.to]) as Promise<Record<string, unknown>[]>,
      this.dataSource.query(seriesSql, [range.from, range.to]) as Promise<Record<string, unknown>[]>,
    ]);
    const summary = summaryRows[0] ?? {} as SummaryRow;
    return {
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
      summary: {
        newUsers: number(summary.newUsers),
        activeUsers: number(summary.activeUsers),
        reads: number(summary.reads),
        posts: number(summary.posts),
        interactions: number(summary.interactions),
        eventRegistrations: number(summary.eventRegistrations),
        crawlSuccessRate: number(summary.crawlSuccessRate),
        recommendationImpressions: number(summary.recommendationImpressions),
        recommendationClicks: number(summary.recommendationClicks),
        recommendationCtr: number(summary.recommendationCtr),
      },
      popularContent: popularRows.map((row) => ({
        contentType: String(row.contentType), contentId: String(row.contentId), title: String(row.title), url: String(row.url),
        reads: number(row.reads), interactions: number(row.interactions), score: number(row.score),
      })),
      series: seriesRows.map((row) => ({
        date: String(row.date), newUsers: number(row.newUsers), posts: number(row.posts), interactions: number(row.interactions),
        eventRegistrations: number(row.eventRegistrations), recommendationClicks: number(row.recommendationClicks),
      })),
    };
  }
}

export function resolveDashboardRange(input: DashboardQueryDto, now = new Date()) {
  const to = input.to ? parseBoundary(input.to, true) : new Date(now);
  const from = input.from ? parseBoundary(input.from, false) : new Date(to.getTime() - 29 * 86_400_000);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) throw new BadRequestException("日期范围无效");
  if (from > to) throw new BadRequestException("开始日期不能晚于结束日期");
  if (to.getTime() - from.getTime() > 366 * 86_400_000) throw new BadRequestException("数据看板单次最多查询 366 天");
  return { from, to };
}

function parseBoundary(value: string, end: boolean) { return new Date(value.length === 10 ? `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z` : value); }
function number(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }

const summarySql = `
WITH latest_to AS (
  SELECT DISTINCT ON (content_type, content_id, source) content_type, content_id, source, read_count
  FROM content_metrics WHERE synced_at <= $2 ORDER BY content_type, content_id, source, synced_at DESC
), latest_before AS (
  SELECT DISTINCT ON (content_type, content_id, source) content_type, content_id, source, read_count
  FROM content_metrics WHERE synced_at < $1 ORDER BY content_type, content_id, source, synced_at DESC
), read_delta AS (
  SELECT COALESCE(SUM(GREATEST(current.read_count - COALESCE(previous.read_count, 0), 0)), 0) AS value
  FROM latest_to current LEFT JOIN latest_before previous USING (content_type, content_id, source)
), activity AS (
  SELECT author_id AS user_id FROM posts WHERE created_at BETWEEN $1 AND $2
  UNION SELECT author_id FROM comments WHERE created_at BETWEEN $1 AND $2
  UNION SELECT user_id FROM likes WHERE created_at BETWEEN $1 AND $2
  UNION SELECT user_id FROM favorites WHERE created_at BETWEEN $1 AND $2
  UNION SELECT follower_id FROM follows WHERE created_at BETWEEN $1 AND $2
  UNION SELECT user_id FROM event_registrations WHERE created_at BETWEEN $1 AND $2
)
SELECT
  (SELECT COUNT(*) FROM users WHERE created_at BETWEEN $1 AND $2) AS "newUsers",
  (SELECT COUNT(DISTINCT user_id) FROM activity WHERE user_id IS NOT NULL) AS "activeUsers",
  (SELECT value FROM read_delta) AS "reads",
  (SELECT COUNT(*) FROM posts WHERE created_at BETWEEN $1 AND $2) AS "posts",
  ((SELECT COUNT(*) FROM comments WHERE created_at BETWEEN $1 AND $2) +
   (SELECT COUNT(*) FROM likes WHERE created_at BETWEEN $1 AND $2) +
   (SELECT COUNT(*) FROM favorites WHERE created_at BETWEEN $1 AND $2) +
   (SELECT COUNT(*) FROM follows WHERE created_at BETWEEN $1 AND $2)) AS "interactions",
  (SELECT COUNT(*) FROM event_registrations WHERE created_at BETWEEN $1 AND $2) AS "eventRegistrations",
  COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'succeeded') / NULLIF(COUNT(*) FILTER (WHERE status IN ('succeeded','failed')), 0), 2) FROM crawl_jobs WHERE created_at BETWEEN $1 AND $2), 0) AS "crawlSuccessRate",
  (SELECT COUNT(*) FROM recommendation_events WHERE event_type = 'impression' AND created_at BETWEEN $1 AND $2) AS "recommendationImpressions",
  (SELECT COUNT(*) FROM recommendation_events WHERE event_type = 'click' AND created_at BETWEEN $1 AND $2) AS "recommendationClicks",
  COALESCE((SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'click') / NULLIF(COUNT(*) FILTER (WHERE event_type = 'impression'), 0), 2) FROM recommendation_events WHERE created_at BETWEEN $1 AND $2), 0) AS "recommendationCtr"`;

const popularSql = `
WITH latest AS (
  SELECT DISTINCT ON (content_type, content_id, source) content_type, content_id, source, read_count, like_count, comment_count, favorite_count, share_count, external_view_count, external_like_count
  FROM content_metrics WHERE synced_at BETWEEN $1 AND $2 ORDER BY content_type, content_id, source, synced_at DESC
), totals AS (
  SELECT content_type, content_id, SUM(read_count + external_view_count)::bigint AS reads,
    SUM(like_count + comment_count + favorite_count + share_count + external_like_count)::bigint AS interactions,
    SUM(read_count + external_view_count + 4 * like_count + 6 * comment_count + 5 * favorite_count + 5 * share_count + 4 * external_like_count)::numeric AS score
  FROM latest GROUP BY content_type, content_id
)
SELECT totals.content_type AS "contentType", totals.content_id AS "contentId",
  COALESCE(article.title, post.title, video.title) AS title,
  CASE WHEN article.id IS NOT NULL THEN '/articles/' || article.slug WHEN post.id IS NOT NULL THEN '/community/posts/' || post.id::text ELSE video.original_url END AS url,
  totals.reads, totals.interactions, totals.score
FROM totals
LEFT JOIN articles article ON totals.content_type IN ('article','policy') AND article.id = totals.content_id
LEFT JOIN posts post ON totals.content_type = 'post' AND post.id = totals.content_id
LEFT JOIN videos video ON totals.content_type = 'video' AND video.id = totals.content_id
WHERE COALESCE(article.title, post.title, video.title) IS NOT NULL
ORDER BY totals.score DESC LIMIT 10`;

const seriesSql = `
SELECT day::date::text AS date,
  (SELECT COUNT(*) FROM users WHERE created_at >= day AND created_at < day + interval '1 day') AS "newUsers",
  (SELECT COUNT(*) FROM posts WHERE created_at >= day AND created_at < day + interval '1 day') AS posts,
  ((SELECT COUNT(*) FROM comments WHERE created_at >= day AND created_at < day + interval '1 day') +
   (SELECT COUNT(*) FROM likes WHERE created_at >= day AND created_at < day + interval '1 day') +
   (SELECT COUNT(*) FROM favorites WHERE created_at >= day AND created_at < day + interval '1 day') +
   (SELECT COUNT(*) FROM follows WHERE created_at >= day AND created_at < day + interval '1 day')) AS interactions,
  (SELECT COUNT(*) FROM event_registrations WHERE created_at >= day AND created_at < day + interval '1 day') AS "eventRegistrations",
  (SELECT COUNT(*) FROM recommendation_events WHERE event_type = 'click' AND created_at >= day AND created_at < day + interval '1 day') AS "recommendationClicks"
FROM generate_series($1::timestamptz::date, $2::timestamptz::date, interval '1 day') AS day
ORDER BY day`;
