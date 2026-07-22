"""
彭博商业周刊 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class BloombergChineseSpider(scrapy.Spider):
    name = "bbg_chinese"
    source_name = "彭博商业周刊"
    base_url = "https://www.bloomberg.com"

    start_urls = [
        "https://www.bloomberg.com/markets",
        "https://www.bloomberg.com/economics",
        "https://www.bloomberg.com/asia",
        "https://www.bloombergchina.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/news/articles/']", "a[href*='/news/']",
            "a[href*='/markets/']", "a[href*='/economics/']",
            "a[href*='/features/']", "h3 a", "h2 a",
            "[class*='headline'] a", "[class*='story'] a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "bloomberg" not in full_url.lower() or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
