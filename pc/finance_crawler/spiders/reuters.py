"""
路透社 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class ReutersSpider(scrapy.Spider):
    name = "reuters"
    source_name = "路透社"
    base_url = "https://www.reuters.com"

    start_urls = [
        "https://www.reuters.com/markets/",
        "https://www.reuters.com/business/finance/",
        "https://cn.reuters.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/markets/']", "a[href*='/business/']",
            "a[href*='/finance/']", "a[href*='/article/']",
            "a[data-testid='Heading']", "[class*='story'] a", "h3 a", "h2 a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "reuters.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
