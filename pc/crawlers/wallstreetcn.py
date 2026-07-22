"""
华尔街见闻 - HTTP API 爬虫
"""

import time
from typing import List

from loguru import logger

from .base import BaseCrawler, NewsItem


class WallStreetCNCrawler(BaseCrawler):
    """华尔街见闻爬虫 - 通过内部API获取"""

    def __init__(self):
        super().__init__()
        self.source_name = "华尔街见闻"
        self.base_url = "https://wallstreetcn.com"

        # 华尔街见闻的API端点
        self.api_urls = [
            # 最新文章
            f"https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all&limit=50",
            # 实时快讯
            f"https://api-one.wallstcn.com/apiv1/content/lives?limit=30",
        ]

        self.api_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://wallstreetcn.com/",
            "Origin": "https://wallstreetcn.com",
        }

    async def _fetch_articles(self) -> List[NewsItem]:
        """从API获取文章列表"""
        items = []
        try:
            data = await self.fetch_json(
                self.api_urls[0],
                headers=self.api_headers,
            )
            if not data:
                return items

            articles = data.get("data", {}).get("day_items", [])
            if not articles:
                articles = data.get("data", {}).get("items", [])

            for art in articles:
                title = art.get("title", "") or art.get("content_text", "")
                if not title:
                    continue

                article_id = art.get("id", "")
                url = f"https://wallstreetcn.com/articles/{article_id}"

                # 摘要
                summary = art.get("content_text", "") or art.get("content_short", "")
                if not summary:
                    summary = art.get("title", "")

                # 发布时间（通常为Unix时间戳）
                publish_time = None
                ts = art.get("display_time") or art.get("published_at")
                if ts:
                    try:
                        from datetime import datetime

                        if isinstance(ts, (int, float)):
                            if ts > 1e12:
                                ts = ts / 1000
                            publish_time = datetime.fromtimestamp(ts).strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )
                    except Exception:
                        pass

                item = NewsItem(
                    title=title,
                    url=url,
                    source=self.source_name,
                    publish_time=publish_time,
                    summary=summary,
                )
                items.append(item)

        except Exception as e:
            logger.error(f"[{self.source_name}] API文章解析错误: {e}")

        return items

    async def _fetch_lives(self) -> List[NewsItem]:
        """获取实时快讯"""
        items = []
        try:
            data = await self.fetch_json(
                self.api_urls[1],
                headers=self.api_headers,
            )
            if not data:
                return items

            lives = data.get("data", {}).get("items", [])
            for live in lives:
                title = live.get("content_text", "")
                if not title:
                    continue

                live_id = live.get("id", "")
                url = f"https://wallstreetcn.com/livenews/{live_id}"

                publish_time = None
                ts = live.get("display_time") or live.get("created_at")
                if ts:
                    try:
                        from datetime import datetime

                        if isinstance(ts, (int, float)):
                            if ts > 1e12:
                                ts = ts / 1000
                            publish_time = datetime.fromtimestamp(ts).strftime(
                                "%Y-%m-%d %H:%M:%S"
                            )
                    except Exception:
                        pass

                item = NewsItem(
                    title=title[:200],  # 快讯可能很长，截取前200字符作标题
                    url=url,
                    source=self.source_name,
                    publish_time=publish_time,
                    summary=title[:500],
                )
                items.append(item)

        except Exception as e:
            logger.error(f"[{self.source_name}] API快讯解析错误: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取华尔街见闻"""
        logger.info(f"[{self.source_name}] 开始爬取...")

        articles, lives = await self._fetch_articles(), await self._fetch_lives()
        all_items = articles + lives

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
