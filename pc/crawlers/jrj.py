"""
金融界 - HTML + RSS 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class JRJCrawler(BaseCrawler):
    """金融界爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "金融界"
        self.base_url = "https://www.jrj.com.cn"

        self.channels = [
            ("https://finance.jrj.com.cn/", "财经"),
            ("https://stock.jrj.com.cn/", "股票"),
            ("https://fund.jrj.com.cn/", "基金"),
            ("https://forex.jrj.com.cn/", "外汇"),
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
                "a[href*='/finance/']",
                "a[href*='/stock/']",
                "a[href*='/fund/']",
                "a[href*='/forex/']",
                ".news-list a",
                ".list-con a",
                ".article-list a",
                "h3 a", "h2 a",
                ".new-list li a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title or len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)
                    if "jrj.com.cn" not in full_url:
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
