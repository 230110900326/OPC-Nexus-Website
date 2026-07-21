from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

import httpx

from .api_client import ApiClient
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

    def run(self, source_id: str | None = None) -> dict[str, Any]:
        sources = self.api.sources()
        selected = [source for source in sources if source_id is None or source.get("id") == source_id]
        if source_id and not selected:
            raise ValueError("requested crawl source is not enabled and authorized")
        results: list[dict[str, Any]] = []
        for source in selected:
            results.append(self._run_source(source))
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
            urls = self._discover_urls(entry_url, domain, str(source.get("fetchMethod") or "html"))
            discovered = urls[: self.settings.max_items_per_source]
            if source.get("type") == "video":
                videos = [self._video_candidate(url, domain) for url in discovered]
                videos = [item for item in videos if item]
            else:
                articles = [self._article_candidate(url, domain) for url in discovered]
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
        result = self.api.report_run(payload)
        logger.info("crawl_source_completed source_id=%s result=%s", source_id, result)
        return result

    def _discover_urls(self, entry_url: str, domain: str, fetch_method: str) -> list[str]:
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
        return list(dict.fromkeys(normalized))

    def _article_candidate(self, url: str, domain: str) -> dict[str, Any] | None:
        html, response_url = self._fetch(url, domain)
        article: ParsedArticle = parse_article(html, response_url)
        page = self.intelligence.parse_page(html, response_url)
        title = str(page.get("title") or article.title).strip()
        body = str(page.get("content") or article.body).strip()
        if not title or len(body) < 80:
            return None
        return {"title": title[:240], "content": body, "originalUrl": response_url, "canonicalUrl": article.canonical_url, "coverImageUrl": article.image_url, "publishedAt": page.get("published_time") or article.published_at, "_page": page}

    def _video_candidate(self, url: str, domain: str) -> dict[str, Any] | None:
        html, response_url = self._fetch(url, domain)
        article = parse_article(html, response_url)
        if not article.title:
            return None
        return {"title": article.title[:240], "originalUrl": response_url, "canonicalUrl": article.canonical_url, "coverUrl": article.image_url, "publishedAt": article.published_at, "description": article.body[:2000]}

    def _fetch(self, url: str, domain: str) -> tuple[str, str]:
        if not is_allowed_url(url, {domain}):
            raise ValueError("attempted to fetch a URL outside the source domain")
        response = self.http.get(url)
        response.raise_for_status()
        final_url = str(response.url)
        if not is_allowed_url(final_url, {domain}):
            raise ValueError("redirected outside the source domain")
        return response.text, final_url
