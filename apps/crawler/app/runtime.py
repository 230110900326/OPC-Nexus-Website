from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx

from .api_client import ApiClient
from .bilibili_adapter import discover_bilibili_videos
from .browser_adapter import BrowserSearcher
from .douyin_adapter import discover_douyin_videos
from .tencent_video_adapter import discover_tencent_videos
from .youtube_adapter import discover_youtube_videos
from .config import Settings
from .discovery import discover_feed_urls, discover_html_urls
from .intelligence import NewsIntelligence
from .parser import ParsedArticle, is_allowed_url, parse_article

logger = logging.getLogger(__name__)


class CrawlRunner:
    def __init__(self, settings: Settings, api: ApiClient) -> None:
        self.settings = settings
        self.api = api
        self.http = httpx.Client(timeout=settings.request_timeout_seconds, follow_redirects=True, headers={"User-Agent": settings.user_agent, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"})
        self.intelligence = NewsIntelligence(settings)
        self.browser = BrowserSearcher()

    def run(self, source_id: str | None = None) -> dict[str, Any]:
        sources = self.api.sources()
        selected = [source for source in sources if source_id is None or source.get("id") == source_id]
        if source_id and not selected:
            raise ValueError("requested crawl source is not enabled and authorized")
        results: list[dict[str, Any]] = []
        for source in selected:
            try:
                results.append(self._run_source(source))
            except Exception as error:
                logger.exception("crawl_source_fatal source_id=%s error=%s", source.get("id"), str(error)[:500])
                results.append({"sourceId": source.get("id"), "status": "fatal", "error": str(error)[:500]})
        return {"sourceCount": len(selected), "runs": results}

    def _run_source(self, source: dict[str, Any]) -> dict[str, Any]:
        started_at = datetime.now(timezone.utc)
        started = time.perf_counter()
        source_id = str(source["id"])
        discovered: list[str] = []
        articles: list[dict[str, Any]] = []
        videos: list[dict[str, Any]] = []
        intelligence_stats: dict[str, int | str] = {"filtered": 0, "duplicates": 0, "agentVersion": "disabled"}
        error_message: str | None = None
        try:
            entry_url = source.get("entryUrl")
            domain = str(source.get("domain") or "").lower()
            if not isinstance(entry_url, str) or not entry_url or not domain:
                raise ValueError("source requires an entry URL and domain")
            if not is_allowed_url(entry_url, {domain}):
                raise ValueError("source entry URL is outside its allowlisted domain")
            items = self._discover_items(entry_url, domain, str(source.get("fetchMethod") or "html"))
            items = items[: self.settings.max_items_per_source]
            # Collect raw URLs for the run report
            discovered = [item if isinstance(item, str) else item.get("url", "") for item in items]
            if source.get("type") == "video":
                videos = [self._video_candidate(item, domain) for item in items]
                videos = [item for item in videos if item]
            else:
                # Article sources: items are strings (URLs)
                urls = [item if isinstance(item, str) else item.get("url", "") for item in items]
                urls = [u for u in urls if u]
                articles = [self._article_candidate(url, domain) for url in urls]
                articles = [item for item in articles if item]
                articles, intelligence_stats = self.intelligence.process(articles, str(source.get("name") or domain))
        except Exception as error:
            error_message = str(error)[:2000]
            logger.warning("crawl_source_failed source_id=%s error=%s", source_id, error_message)
        finished_at = datetime.now(timezone.utc)
        payload = {
            "sourceId": source_id,
            "startedAt": started_at.isoformat(),
            "finishedAt": finished_at.isoformat(),
            "durationMs": int((time.perf_counter() - started) * 1000),
            "discoveredUrls": discovered,
            "articles": articles,
            "videos": videos,
            "filteredCount": intelligence_stats["filtered"],
            "batchDuplicateCount": intelligence_stats["duplicates"],
            "agentVersion": intelligence_stats["agentVersion"],
            "errorMessage": error_message,
        }
        result = None
        try:
            result = self.api.report_run(payload)
            logger.info("crawl_source_completed source_id=%s result=%s", source_id, result)
        except Exception as api_error:
            logger.warning("crawl_source_api_failed source_id=%s error=%s", source_id, str(api_error)[:500])
            result = {"sourceId": source_id, "status": "api_error", "error": str(api_error)[:500]}
        return result

    def _discover_items(self, entry_url: str, domain: str, fetch_method: str) -> list[Any]:
        """返回 list[str] (URLs，文章来源) 或 list[dict] (结构化元数据，视频来源)。"""
        # Platform adapters — return structured video metadata
        if fetch_method == "adapter" and "bilibili" in domain:
            items = discover_bilibili_videos(entry_url, self.settings.request_timeout_seconds)
            return items  # list[dict] with keys: url, title, coverUrl, views, etc.
        if fetch_method == "adapter" and "qq.com" in domain:
            items = discover_tencent_videos(entry_url, self.settings.request_timeout_seconds, self.browser)
            return items
        if fetch_method == "adapter" and "douyin.com" in domain:
            items = discover_douyin_videos(entry_url, self.settings.request_timeout_seconds, self.browser)
            return items
        if fetch_method == "adapter" and ("youtube.com" in domain or "youtu.be" in domain):
            items = discover_youtube_videos(entry_url, self.settings.request_timeout_seconds, self.browser)
            return items
        # Generic article sources — return list of URL strings
        document, response_url = self._fetch(entry_url, domain)
        allowed = {domain}
        if fetch_method in {"rss", "sitemap"}:
            urls = discover_feed_urls(document)
        else:
            links = discover_html_urls(document, response_url, allowed)
            urls = links or [response_url]
        normalized = [url for url in urls if is_allowed_url(url, allowed)]
        if fetch_method == "html" and len(normalized) > 1:
            entry_path = urlparse(response_url).path.rstrip("/")
            article_like = [url for url in normalized if urlparse(url).path.rstrip("/") != entry_path]
            normalized = article_like or [response_url]
        return list(dict.fromkeys(normalized))  # list[str]

    def _article_candidate(self, url: str, domain: str) -> dict[str, Any] | None:
        html, response_url = self._fetch(url, domain)
        article: ParsedArticle = parse_article(html, response_url)
        page = self.intelligence.parse_page(html, response_url)
        title = str(page.get("title") or article.title).strip()
        body = str(page.get("content") or article.body).strip()
        if not title or len(body) < 80:
            return None
        return {"title": title[:240], "content": body, "originalUrl": response_url, "canonicalUrl": article.canonical_url, "coverImageUrl": article.image_url, "publishedAt": page.get("published_time") or article.published_at, "_page": page}

    def _video_candidate(self, item: Any, domain: str) -> dict[str, Any] | None:
        """从 adapter 元数据或 HTTP 抓取创建视频候选项。item 可以是 str (URL) 或 dict (adapter 元数据)。"""
        if isinstance(item, dict):
            # Adapter-provided metadata — use directly
            url = item.get("url", "")
            if not url:
                return None
            title = item.get("title", "")
            if not title:
                # Try to fetch the page for title if not in metadata
                try:
                    html, response_url = self._fetch(url, domain)
                    article = parse_article(html, response_url)
                    title = article.title
                except Exception:
                    pass
            if not title:
                return None
            # Build platform_metrics
            platform_metrics: dict[str, int] = {}
            if item.get("views"):
                platform_metrics["views"] = int(item["views"])
            if item.get("likes"):
                platform_metrics["likes"] = int(item["likes"])
            if item.get("comments"):
                platform_metrics["comments"] = int(item["comments"])

            # Parse publishedAt
            published_at = item.get("publishedAt", "")
            if isinstance(published_at, (int, float)) and published_at > 0:
                # Unix timestamp
                published_at = datetime.fromtimestamp(published_at, tz=timezone.utc).isoformat()
            elif not published_at:
                published_at = None

            cover_url = item.get("coverUrl", "") or None  # empty str → null
            if cover_url and cover_url.startswith("//"):
                cover_url = f"https:{cover_url}"
            return {
                "title": title[:240],
                "originalUrl": url,
                "canonicalUrl": url,
                "coverUrl": cover_url,
                "publishedAt": published_at or None,
                "description": (item.get("description", "") or "")[:2000] or None,
                "durationSeconds": int(item.get("durationSeconds", 0)),
                "platformMetrics": platform_metrics,
            }

        # Legacy: string URL — fetch HTTP page
        url = str(item)
        html, response_url = self._fetch(url, domain)
        article = parse_article(html, response_url)
        if not article.title:
            return None
        return {
            "title": article.title[:240],
            "originalUrl": response_url,
            "canonicalUrl": article.canonical_url or response_url,
            "coverUrl": article.image_url or None,
            "publishedAt": article.published_at or None,
            "description": article.body[:2000] or None,
            "durationSeconds": 0,
            "platformMetrics": {},
        }

    def _fetch(self, url: str, domain: str) -> tuple[str, str]:
        if not is_allowed_url(url, {domain}):
            raise ValueError("attempted to fetch a URL outside the source domain")
        response = self.http.get(url)
        response.raise_for_status()
        final_url = str(response.url)
        if not is_allowed_url(final_url, {domain}):
            raise ValueError("redirected outside the source domain")
        return response.text, final_url

    def close(self) -> None:
        self.browser.close()
