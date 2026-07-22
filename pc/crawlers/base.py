"""
爬虫基类：提供异步HTTP请求、重试、限速、UA轮换等基础设施
"""

import asyncio
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from urllib.parse import urlparse

import httpx
from loguru import logger

from config import (
    USER_AGENTS,
    REQUEST_TIMEOUT,
    MAX_RETRIES,
    RATE_LIMIT_PER_DOMAIN,
    MAX_ARTICLES_PER_SOURCE,
)
from utils.helpers import (
    filter_finance_keywords,
    normalize_url,
    truncate_text,
)


@dataclass
class NewsItem:
    """新闻条目数据结构"""

    title: str
    url: str
    source: str
    publish_time: Optional[str] = None  # 原始时间字符串，存储时再解析
    summary: Optional[str] = None
    content: Optional[str] = None
    keywords: List[str] = field(default_factory=list)

    def __post_init__(self):
        """初始化后处理"""
        self.title = self.title.strip() if self.title else ""
        self.url = normalize_url(self.url) if self.url else ""
        self.summary = truncate_text(self.summary.strip(), 500) if self.summary else None
        self.content = truncate_text(self.content.strip(), 5000) if self.content else None
        # 自动提取关键词
        if not self.keywords:
            text = f"{self.title} {self.summary or ''}"
            self.keywords = filter_finance_keywords(text)


class RateLimiter:
    """域名级速率限制器"""

    def __init__(self):
        self._last_request: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def acquire(self, domain: str):
        """获取请求许可，必要时等待"""
        async with self._lock:
            now = time.monotonic()
            if domain in self._last_request:
                elapsed = now - self._last_request[domain]
                min_interval = 1.0 / RATE_LIMIT_PER_DOMAIN
                if elapsed < min_interval:
                    await asyncio.sleep(min_interval - elapsed)
            self._last_request[domain] = time.monotonic()


class BaseCrawler(ABC):
    """
    爬虫基类

    每个站点爬虫继承此类，实现 crawl() 方法即可。
    """

    # 全局速率限制器（所有爬虫共享）
    _rate_limiter = RateLimiter()

    # 全局 HTTP 客户端（连接池复用）
    _client: Optional[httpx.AsyncClient] = None
    _client_lock = asyncio.Lock()

    def __init__(self):
        self.source_name: str = self.__class__.__name__
        self.base_url: str = ""

    @classmethod
    async def get_client(cls) -> httpx.AsyncClient:
        """获取或创建共享的 HTTP 客户端"""
        if cls._client is None:
            async with cls._client_lock:
                if cls._client is None:
                    cls._client = httpx.AsyncClient(
                        timeout=httpx.Timeout(REQUEST_TIMEOUT),
                        limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
                        headers={
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                            "Accept-Encoding": "gzip, deflate, br",
                            "Connection": "keep-alive",
                        },
                        follow_redirects=True,
                    )
        return cls._client

    @classmethod
    async def close_client(cls):
        """关闭 HTTP 客户端"""
        if cls._client is not None:
            await cls._client.aclose()
            cls._client = None

    def _random_ua(self) -> str:
        """随机获取 User-Agent"""
        return random.choice(USER_AGENTS)

    def _extract_domain(self, url: str) -> str:
        """从 URL 提取域名"""
        return urlparse(url).netloc

    async def fetch(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict] = None,
    ) -> Optional[str]:
        """
        发送 GET 请求并返回响应文本

        特性：
        - 自动重试（指数退避）
        - User-Agent 轮换
        - 域名级限速
        - 超时控制
        """
        domain = self._extract_domain(url)
        client = await self.get_client()

        req_headers = {"User-Agent": self._random_ua()}
        if headers:
            req_headers.update(headers)

        last_error = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                # 限速等待
                await self._rate_limiter.acquire(domain)

                logger.debug(f"[{self.source_name}] 请求: {url} (第{attempt}次)")
                response = await client.get(url, headers=req_headers, params=params)
                response.raise_for_status()

                # 检测编码
                if response.encoding and response.encoding.lower() != "utf-8":
                    response.encoding = response.apparent_encoding or "utf-8"

                return response.text

            except httpx.HTTPStatusError as e:
                last_error = e
                logger.warning(
                    f"[{self.source_name}] HTTP {e.response.status_code}: {url} (第{attempt}次)"
                )
                # 4xx 错误不重试
                if 400 <= e.response.status_code < 500:
                    break
            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(f"[{self.source_name}] 请求超时: {url} (第{attempt}次)")
            except httpx.RequestError as e:
                last_error = e
                logger.warning(f"[{self.source_name}] 请求错误: {url} - {e} (第{attempt}次)")
            except Exception as e:
                last_error = e
                logger.error(f"[{self.source_name}] 未知错误: {url} - {e} (第{attempt}次)")
                break

            # 指数退避
            if attempt < MAX_RETRIES:
                sleep_time = 2 ** attempt + random.uniform(0, 1)
                logger.debug(f"[{self.source_name}] 等待 {sleep_time:.1f}s 后重试...")
                await asyncio.sleep(sleep_time)

        logger.error(f"[{self.source_name}] 请求失败（重试{MAX_RETRIES}次后）: {url} - {last_error}")
        return None

    async def fetch_json(
        self,
        url: str,
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict] = None,
    ) -> Optional[dict]:
        """发送 GET 请求并返回 JSON 数据"""
        client = await self.get_client()
        domain = self._extract_domain(url)

        req_headers = {"User-Agent": self._random_ua()}
        if headers:
            req_headers.update(headers)

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                await self._rate_limiter.acquire(domain)

                logger.debug(f"[{self.source_name}] JSON请求: {url} (第{attempt}次)")
                response = await client.get(url, headers=req_headers, params=params)
                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                logger.warning(f"[{self.source_name}] HTTP {e.response.status_code}: {url}")
                if 400 <= e.response.status_code < 500:
                    break
            except Exception as e:
                logger.warning(f"[{self.source_name}] JSON请求错误: {url} - {e} (第{attempt}次)")

            if attempt < MAX_RETRIES:
                await asyncio.sleep(2**attempt + random.uniform(0, 1))

        return None

    @abstractmethod
    async def crawl(self) -> List[NewsItem]:
        """
        执行爬取，返回新闻列表

        子类必须实现此方法
        """
        ...

    def filter_finance(self, items: List[NewsItem]) -> List[NewsItem]:
        """
        过滤：只保留财经相关的新闻

        如果新闻在关键词提取阶段已经有匹配，直接保留；
        否则再次检查标题+摘要是否包含关键词。
        """
        result = []
        for item in items:
            if item.keywords:
                result.append(item)
            else:
                # 再次尝试匹配
                text = f"{item.title} {item.summary or ''}"
                kw = filter_finance_keywords(text)
                if kw:
                    item.keywords = kw
                    result.append(item)

        # 限制数量
        return result[:MAX_ARTICLES_PER_SOURCE]
