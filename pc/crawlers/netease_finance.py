"""
网易财经 - HTML 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class NeteaseFinanceCrawler(BaseCrawler):
    """网易财经爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "网易财经"
        self.base_url = "https://money.163.com"

        self.channels = [
            ("https://money.163.com/", "首页"),
            ("https://money.163.com/stock/", "股票"),
            ("https://money.163.com/fund/", "基金"),
            ("https://money.163.com/finance/", "财经"),
            ("https://money.163.com/special/", "专题"),
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
                "a[href*='money.163.com/']",
                ".news-list a",
                ".article-list a",
                ".list_item a",
                "h3 a", "h2 a", "h4 a",
                ".top-news a",
                ".col_l a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title or len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)
                    if "163.com" not in full_url:
                        continue
                    # 过滤非新闻链接
                    skip_patterns = ["#", "javascript:", "mailto:", "login", "registe", "photo", "sports"]
                    if any(p in full_url.lower() for p in skip_patterns):
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
