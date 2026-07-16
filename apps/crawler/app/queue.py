from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from urllib.parse import urlparse
import httpx
from redis import Redis
from .parser import is_allowed_url, parse_article

@dataclass(frozen=True)
class CrawlResult: url: str; started_at: float; finished_at: float; duration_ms: int; status: str; error: str | None = None

class LocalOnlyQueue:
    queue_name = "opc:crawl:local-test"
    def __init__(self, redis_url: str, allowed_domains: set[str], timeout_seconds: float = 10) -> None: self.redis = Redis.from_url(redis_url, decode_responses=True); self.allowed_domains = allowed_domains; self.timeout_seconds = timeout_seconds
    def enqueue_local_page(self, url: str) -> None:
        if not is_allowed_url(url, self.allowed_domains): raise ValueError("only allowlisted local test pages can be queued")
        self.redis.lpush(self.queue_name, url)
    def run_once(self) -> CrawlResult | None:
        url = self.redis.rpop(self.queue_name)
        if not url: return None
        started = time.time()
        try:
            response = httpx.get(url, timeout=self.timeout_seconds); response.raise_for_status(); parse_article(response.text, url)
            finished = time.time(); return CrawlResult(url, started, finished, int((finished - started) * 1000), "succeeded")
        except Exception as error:
            finished = time.time(); return CrawlResult(url, started, finished, int((finished - started) * 1000), "failed", str(error))
