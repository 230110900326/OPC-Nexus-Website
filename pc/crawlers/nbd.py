"""
每经网 - HTML 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class NbdCrawler(BaseCrawler):
    """每经网爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "每经网"
        self.base_url = "https://www.nbd.com.cn"

        # 主要频道
        self.channels = [
            ("https://www.nbd.com.cn/", "首页"),
            ("https://www.nbd.com.cn/columns/3", "公司"),
            ("https://www.nbd.com.cn/columns/5", "金融"),
            ("https://www.nbd.com.cn/columns/2", "宏观"),
        ]

    async def _parse_channel(self, url: str, channel_name: str) -> List[NewsItem]:
        """解析频道页面"""
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")

            seen_urls = set()
            # 每经网的新闻链接模式
            selectors = [
                "a[href*='/articles/']",
                "a[href*='/news/']",
                ".article-item a",
                ".news-item a",
                ".m-news-list a",
                "h3 a",
                "h2 a",
                ".g-article-list a",
            ]

            for selector in selectors:
                for el in soup.select(selector):
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title:
                        continue
                    if len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)

                    if "nbd.com.cn" not in full_url:
                        continue
                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    # 提取时间
                    publish_time = None
                    time_el = soup.find("time") or soup.find("span", class_=lambda c: c and "time" in c.lower() if c else False)
                    if time_el:
                        publish_time = time_el.get("datetime") or time_el.get_text(strip=True)

                    item = NewsItem(
                        title=title,
                        url=full_url,
                        source=self.source_name,
                        publish_time=publish_time,
                    )
                    items.append(item)

                if items:
                    break

        except Exception as e:
            logger.error(f"[{self.source_name}] 频道解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取每经网"""
        logger.info(f"[{self.source_name}] 开始爬取 {len(self.channels)} 个频道...")

        all_items = []
        for url, name in self.channels:
            try:
                items = await self._parse_channel(url, name)
                all_items.extend(items)
            except Exception as e:
                logger.error(f"[{self.source_name}] 频道爬取异常 {name}: {e}")

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
