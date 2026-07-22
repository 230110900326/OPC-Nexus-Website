"""
东方财富网 - RSS + HTML 爬虫
"""

import asyncio
from datetime import datetime
from typing import List
from urllib.parse import urljoin

import feedparser
from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class EastMoneyCrawler(BaseCrawler):
    """东方财富网爬虫 - 通过RSS + HTML补充"""

    def __init__(self):
        super().__init__()
        self.source_name = "东方财富"
        self.base_url = "https://finance.eastmoney.com"
        # 东方财富 RSS 源
        self.rss_feeds = [
            "https://rss.eastmoney.com/yaowen.xml",
        ]
        # HTML 备用页面
        self.html_urls = [
            "https://finance.eastmoney.com/a/czqyw.html",   # 财经要闻
            "https://finance.eastmoney.com/a/cgsxw.html",   # 股市新闻
            "https://finance.eastmoney.com/a/cjdd.html",    # 财经导读
        ]

    async def _parse_rss(self, feed_url: str) -> List[NewsItem]:
        """解析单个RSS源"""
        items = []
        try:
            content = await self.fetch(feed_url)
            if not content:
                return items

            feed = feedparser.parse(content)
            for entry in feed.entries:
                publish_time = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    try:
                        publish_time = datetime(*entry.published_parsed[:6]).strftime(
                            "%Y-%m-%d %H:%M:%S"
                        )
                    except Exception:
                        pass

                summary = entry.get("summary", "")
                if summary:
                    summary = BeautifulSoup(summary, "lxml").get_text(strip=True)

                item = NewsItem(
                    title=entry.get("title", ""),
                    url=entry.get("link", ""),
                    source=self.source_name,
                    publish_time=publish_time,
                    summary=summary,
                )
                items.append(item)

        except Exception as e:
            logger.error(f"[{self.source_name}] RSS解析错误 {feed_url}: {e}")

        return items

    async def _parse_html(self, url: str) -> List[NewsItem]:
        """从HTML页面解析新闻列表"""
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")
            seen_urls = set()

            # 东方财富的新闻链接模式
            for el in soup.select("a[href]"):
                href = el.get("href", "")
                title = el.get_text(strip=True)

                if not href or not title or len(title) < 10:
                    continue

                # 过滤：只要新闻详情页链接
                if "/a/" not in href and "/news/" not in href:
                    continue

                full_url = urljoin(self.base_url, href)
                if "eastmoney.com" not in full_url:
                    continue
                if full_url in seen_urls:
                    continue
                seen_urls.add(full_url)

                item = NewsItem(
                    title=title,
                    url=full_url,
                    source=self.source_name,
                )
                items.append(item)

        except Exception as e:
            logger.error(f"[{self.source_name}] HTML解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取东方财富"""
        logger.info(f"[{self.source_name}] 开始爬取...")

        all_items = []

        # 1. RSS 源
        for feed_url in self.rss_feeds:
            items = await self._parse_rss(feed_url)
            all_items.extend(items)

        # 2. HTML 备用（如果 RSS 获取不足）
        if len(all_items) < 20:
            logger.info(f"[{self.source_name}] RSS获取较少，启用HTML补充")
            for html_url in self.html_urls:
                items = await self._parse_html(html_url)
                all_items.extend(items)

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
