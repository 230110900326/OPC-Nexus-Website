"""
FT中文网 - HTML 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class FTChineseCrawler(BaseCrawler):
    """FT中文网爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "FT中文网"
        self.base_url = "https://www.ftchinese.com"

        self.channels = [
            ("https://www.ftchinese.com/", "首页"),
            ("https://www.ftchinese.com/channel/economy.html", "经济"),
            ("https://www.ftchinese.com/channel/markets.html", "市场"),
            ("https://www.ftchinese.com/channel/finance.html", "金融"),
            ("https://www.ftchinese.com/channel/companies.html", "商业"),
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
                "a[href*='/story/']",
                "a[href*='/interactive/']",
                ".item-headline a",
                ".headline a",
                ".items a",
                "h2 a", "h3 a",
                ".story-headline a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title or len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)
                    if "ftchinese.com" not in full_url:
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
