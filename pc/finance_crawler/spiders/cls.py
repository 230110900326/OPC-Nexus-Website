"""
财联社 - Scrapy Spider (HTML + JSON)
"""
import json
from datetime import datetime

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class ClsSpider(scrapy.Spider):
    name = "cls"
    source_name = "财联社"
    base_url = "https://www.cls.cn"

    def start_requests(self):
        yield scrapy.Request("https://www.cls.cn/telegraph", callback=self.parse_telegraph)
        yield scrapy.Request("https://www.cls.cn/depth", callback=self.parse_depth)

    def parse_telegraph(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        items_found = False

        for script in soup.select("script"):
            text = script.get_text(strip=True)
            if not text:
                continue
            for keyword in ["telegraph_list", "roll_data", "telegraphData"]:
                if keyword not in text:
                    continue
                try:
                    start = text.find('{"')
                    if start < 0:
                        continue
                    depth, end = 0, start
                    for i, ch in enumerate(text[start:], start):
                        if ch == '{': depth += 1
                        elif ch == '}':
                            depth -= 1
                            if depth == 0:
                                end = i + 1
                                break
                    data = json.loads(text[start:end])
                    entries = (data.get("data", {}).get("roll_data", [])
                               or data.get("data", [])
                               or data.get("roll_data", []))
                    if isinstance(entries, list):
                        for entry in entries:
                            title = entry.get("title") or entry.get("content", "")
                            if not title:
                                continue
                            aid = entry.get("id") or entry.get("article_id", "")
                            pub_time = None
                            ts = entry.get("ctime") or entry.get("modified_on")
                            if ts and isinstance(ts, (int, float)):
                                pub_time = datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")

                            yield NewsItem(
                                title=title[:300],
                                url=f"https://www.cls.cn/detail/{aid}" if aid else "",
                                source=self.source_name,
                                publish_time=pub_time,
                                summary=title[:500],
                            )
                        items_found = True
                        break
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue

        if not items_found:
            for el in soup.select("a[href*='/detail/'], a[href*='/telegraph/']"):
                href = el.get("href", "")
                title = el.get_text(strip=True)
                if title and len(title) >= 5:
                    full_url = href if href.startswith("http") else f"https://www.cls.cn{href}"
                    yield NewsItem(title=title[:300], url=full_url, source=self.source_name)

    def parse_depth(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href]"):
            href = el.get("href", "")
            title = el.get_text(strip=True)
            if not title or len(title) < 10:
                continue
            if not any(x in href for x in ["/detail/", "/article/", "/depth/"]):
                continue
            full_url = href if href.startswith("http") else f"https://www.cls.cn{href}"
            if full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
