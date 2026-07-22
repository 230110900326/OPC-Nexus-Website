"""
路透社中文 - RSS 爬虫
"""

from datetime import datetime
from typing import List

import feedparser
from loguru import logger

from .base import BaseCrawler, NewsItem


class ReutersCrawler(BaseCrawler):
    """路透社中文爬虫 - RSS解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "路透社"
        self.base_url = "https://www.reuters.com"

        # 路透社中文 RSS / 新闻页面
        self.urls = [
            "https://www.reuters.com/arc/json/finance/",
        ]
        # 使用网页直接解析更可靠
        self.html_urls = [
            "https://www.reuters.com/markets/",
            "https://www.reuters.com/business/finance/",
            "https://cn.reuters.com/",  # 路透中文网
        ]

    async def _parse_html(self, url: str) -> List[NewsItem]:
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, "lxml")
            seen_urls = set()

            selectors = [
                "a[href*='/markets/']",
                "a[href*='/business/']",
                "a[href*='/finance/']",
                "a[href*='/article/']",
                "a[data-testid='Heading']",
                "[class*='story'] a",
                "h3 a", "h2 a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title or len(title) < 8:
                        continue

                    from urllib.parse import urljoin
                    full_url = urljoin(self.base_url, href)
                    if "reuters.com" not in full_url:
                        continue
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    # 解析时间
                    publish_time = None
                    time_el = el.find("time") if hasattr(el, "find") else None
                    if time_el:
                        publish_time = time_el.get("datetime") or time_el.get_text(strip=True)

                    items.append(NewsItem(
                        title=title,
                        url=full_url,
                        source=self.source_name,
                        publish_time=publish_time,
                    ))
                if items:
                    break

        except Exception as e:
            logger.error(f"[{self.source_name}] 页面解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        logger.info(f"[{self.source_name}] 开始爬取 {len(self.html_urls)} 个页面...")

        all_items = []
        for url in self.html_urls:
            try:
                items = await self._parse_html(url)
                all_items.extend(items)
            except Exception as e:
                logger.error(f"[{self.source_name}] 页面爬取异常 {url}: {e}")

        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
