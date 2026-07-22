"""
新浪财经 - HTML 爬虫（RSS已失效，改用页面解析）
"""

from typing import List
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class SinaFinanceCrawler(BaseCrawler):
    """新浪财经爬虫 - HTML 页面解析"""

    def __init__(self):
        super().__init__()
        self.source_name = "新浪财经"
        self.base_url = "https://finance.sina.com.cn"

        # 新浪财经各频道页面
        self.channel_urls = [
            "https://finance.sina.com.cn/",              # 首页
            "https://finance.sina.com.cn/stock/",        # 股票
            "https://finance.sina.com.cn/china/",        # 国内财经
            "https://finance.sina.com.cn/world/",        # 国际财经
            "https://finance.sina.com.cn/money/fund/",   # 基金
        ]

    async def _parse_channel(self, url: str) -> List[NewsItem]:
        """解析频道页面"""
        items = []
        try:
            html = await self.fetch(url)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")
            seen_urls = set()

            for el in soup.select("a[href]"):
                href = el.get("href", "")
                title = el.get_text(strip=True)

                if not href or not title or len(title) < 10:
                    continue

                # 只保留新浪财经的新闻链接
                if "finance.sina.com.cn" not in href:
                    if href.startswith("/"):
                        href = f"https://finance.sina.com.cn{href}"
                    else:
                        continue

                full_url = urljoin(self.base_url, href)
                if full_url in seen_urls:
                    continue

                # 过滤非新闻页面（如广告、导航）
                skip_patterns = ["#", "javascript:", "mailto:", "login", "registe"]
                if any(p in full_url.lower() for p in skip_patterns):
                    continue

                seen_urls.add(full_url)

                item = NewsItem(
                    title=title,
                    url=full_url,
                    source=self.source_name,
                )
                items.append(item)

        except Exception as e:
            logger.error(f"[{self.source_name}] 频道解析错误 {url}: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取新浪财经"""
        logger.info(f"[{self.source_name}] 开始爬取 {len(self.channel_urls)} 个频道...")

        all_items = []
        for url in self.channel_urls:
            try:
                items = await self._parse_channel(url)
                all_items.extend(items)
            except Exception as e:
                logger.error(f"[{self.source_name}] 频道爬取异常 {url}: {e}")

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
