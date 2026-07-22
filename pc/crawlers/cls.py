"""
财联社 - HTML + API 爬虫
"""

import json
from typing import List

from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseCrawler, NewsItem


class ClsCrawler(BaseCrawler):
    """财联社爬虫 - HTML 解析 + API"""

    def __init__(self):
        super().__init__()
        self.source_name = "财联社"
        self.base_url = "https://www.cls.cn"

        self.api_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.cls.cn/",
        }

    async def _fetch_telegraph(self) -> List[NewsItem]:
        """获取财联社电报（实时快讯）- 使用HTML页面解析"""
        items = []
        try:
            # 财联社电报页面
            html = await self.fetch(
                "https://www.cls.cn/telegraph",
                headers=self.api_headers,
            )
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")

            # 尝试从页面中的 JSON 数据提取
            for script in soup.select("script"):
                text = script.get_text(strip=True)
                if not text:
                    continue

                # 查找 telegraph 数据
                for keyword in ["telegraph_list", "roll_data", "telegraphData"]:
                    if keyword in text:
                        try:
                            # 尝试提取 JSON
                            start = text.find('{"')
                            if start >= 0:
                                depth = 0
                                end = start
                                for i, ch in enumerate(text[start:], start):
                                    if ch == '{':
                                        depth += 1
                                    elif ch == '}':
                                        depth -= 1
                                        if depth == 0:
                                            end = i + 1
                                            break
                                json_str = text[start:end]
                                data = json.loads(json_str)

                                entries = (
                                    data.get("data", {}).get("roll_data", [])
                                    or data.get("data", [])
                                    or data.get("roll_data", [])
                                )
                                if isinstance(entries, list):
                                    for entry in entries:
                                        title = entry.get("title", "") or entry.get("content", "")
                                        if not title:
                                            continue

                                        aid = entry.get("id", "") or entry.get("article_id", "")
                                        url = f"https://www.cls.cn/detail/{aid}" if aid else ""

                                        from datetime import datetime
                                        publish_time = None
                                        ts = entry.get("ctime") or entry.get("modified_on")
                                        if ts and isinstance(ts, (int, float)):
                                            publish_time = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")

                                        item = NewsItem(
                                            title=title[:300],
                                            url=url,
                                            source=self.source_name,
                                            publish_time=publish_time,
                                            summary=title[:500],
                                        )
                                        items.append(item)
                                    break  # 找到数据就跳出script循环
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

            # 如果JSON提取失败，直接从HTML中找链接
            if not items:
                for el in soup.select("a[href*='/detail/'], a[href*='/telegraph/']"):
                    href = el.get("href", "")
                    title = el.get_text(strip=True)
                    if title and len(title) >= 5:
                        full_url = href if href.startswith("http") else f"https://www.cls.cn{href}"
                        items.append(NewsItem(
                            title=title[:300],
                            url=full_url,
                            source=self.source_name,
                        ))

        except Exception as e:
            logger.error(f"[{self.source_name}] 电报解析错误: {e}")

        return items

    async def _fetch_depth_articles(self) -> List[NewsItem]:
        """获取深度文章"""
        items = []
        try:
            html = await self.fetch("https://www.cls.cn/depth", headers=self.api_headers)
            if not html:
                return items

            soup = BeautifulSoup(html, "lxml")
            seen = set()

            for el in soup.select("a[href]"):
                href = el.get("href", "")
                title = el.get_text(strip=True)

                if not title or len(title) < 10:
                    continue

                if "/detail/" not in href and "/article/" not in href and "/depth/" not in href:
                    continue

                full_url = href if href.startswith("http") else f"https://www.cls.cn{href}"
                if full_url in seen:
                    continue
                seen.add(full_url)

                items.append(NewsItem(
                    title=title,
                    url=full_url,
                    source=self.source_name,
                ))

        except Exception as e:
            logger.error(f"[{self.source_name}] 深度文章解析错误: {e}")

        return items

    async def crawl(self) -> List[NewsItem]:
        """爬取财联社"""
        logger.info(f"[{self.source_name}] 开始爬取...")

        telegraph_items = await self._fetch_telegraph()
        article_items = await self._fetch_depth_articles()
        all_items = telegraph_items + article_items

        # 去重
        seen = set()
        unique_items = []
        for item in all_items:
            if item.url and item.url not in seen:
                seen.add(item.url)
                unique_items.append(item)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(unique_items)} 条")
        return self.filter_finance(unique_items)
