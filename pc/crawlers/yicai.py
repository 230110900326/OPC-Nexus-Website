"""
第一财经 - HTML 爬虫
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class YiCaiCrawler(BaseCrawler):
    """第一财经爬虫 - HTML解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "第一财经"
        self.base_url = "https://www.yicai.com"

        # 主要频道
        self.channels = [
            ("https://www.yicai.com/", "首页"),
            ("https://www.yicai.com/news/", "新闻"),
            ("https://www.yicai.com/brief/", "快讯"),
        ]

    async def _parse_channel(self, url: str, channel_name: str) -> List[NewsItem]:
        """解析频道页面"""
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")

            # 尝试多种选择器
            selectors = [
                ".news-list a",
                ".article-list a",
                ".list-content a",
                ".m-list a",
                "a[href*='/news/']",
                "a[href*='/brief/']",
                "a[href*='/video/']",
            ]

            seen_urls = set()
            for selector in selectors:
                elements = soup.select(selector)
                for el in elements:
                    href = el.get("href", "")
                    title = el.get_text(strip=True) or el.get("title", "")

                    if not href or not title:
                        continue
                    if len(title) < 8:
                        continue

                    full_url = urljoin(self.base_url, href)

                    # 过滤非本站链接和非新闻链接
                    if "yicai.com" not in full_url:
                        continue

                    if full_url in seen_urls:
                        continue
                    seen_urls.add(full_url)

                    # 尝试提取时间
                    publish_time = None
                    time_el = el.find_previous("time") or el.find_next("time")
                    if time_el:
                        publish_time = time_el.get("datetime") or time_el.get_text(strip=True)
                    if not publish_time:
                        time_el = el.parent.find("time") if el.parent else None
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

            # 如果上面的选择器都没匹配到，尝试从全局找
            if not items:
                for el in soup.select("a[href]"):
                    href = el.get("href", "")
                    if "/news/" in href or "/brief/" in href:
                        title = el.get_text(strip=True)
                        if title and len(title) >= 10 and len(title) <= 200:
                            full_url = urljoin(self.base_url, href)
                            if full_url not in seen_urls and "yicai.com" in full_url:
                                seen_urls.add(full_url)
                                items.append(NewsItem(
                                    title=title,
                                    url=full_url,
                                    source=self.source_name,
                                ))

        except Exception as e:
            logger.error(f"[{self.source_name}] 频道解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取第一财经"""
        logger.info(f"[{self.source_name}] 开始爬取 {len(self.channels)} 个频道...")

        tasks = [self._parse_channel(url, name) for url, name in self.channels]
        all_items = []
        for task in tasks:
            try:
                result = await task
                all_items.extend(result)
            except Exception as e:
                logger.error(f"[{self.source_name}] 频道爬取异常: {e}")

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
