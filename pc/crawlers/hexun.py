"""
和讯网 - HTML 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class HexunCrawler(BaseCrawler):
    """和讯网爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "和讯网"
        self.base_url = "https://www.hexun.com"

        self.channels = [
            ("https://news.hexun.com/", "新闻"),
            ("https://stock.hexun.com/", "股票"),
            ("https://funds.hexun.com/", "基金"),
            ("https://futures.hexun.com/", "期货"),
            ("https://bank.hexun.com/", "银行"),
        ]

    async def _parse_channel(self, url: str, channel_name: str) -> List[NewsItem]:
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")
            seen_urls = set()

            selectors = [
                "a[href*='/news/']",
                "a[href*='/stock/']",
                "a[href*='/funds/']",
                "a[href*='/futures/']",
                "a[href*='/bank/']",
                ".news-list a",
                ".article-list a",
                "h3 a", "h2 a",
                ".list-left a",
                ".temp01 a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title or len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)
                    if "hexun.com" not in full_url:
                        continue
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    items.append(NewsItem(
                        title=title,
                        url=full_url,
                        source=self.source_name,
                    ))
                if items:
                    break

        except Exception as e:
            logger.error(f"[{self.source_name}] 频道解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        logger.info(f"[{self.source_name}] 开始爬取 {len(self.channels)} 个频道...")

        all_items = []
        for url, name in self.channels:
            try:
                items = await self._parse_channel(url, name)
                all_items.extend(items)
            except Exception as e:
                logger.error(f"[{self.source_name}] 频道爬取异常 {name}: {e}")

        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
