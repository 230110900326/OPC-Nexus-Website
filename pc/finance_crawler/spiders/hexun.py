"""
和讯网 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class HexunSpider(scrapy.Spider):
    name = "hexun"
    source_name = "和讯网"
    base_url = "https://www.hexun.com"

    start_urls = [
        "https://news.hexun.com/",
        "https://stock.hexun.com/",
        "https://funds.hexun.com/",
        "https://futures.hexun.com/",
        "https://bank.hexun.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/news/']", "a[href*='/stock/']",
            "a[href*='/funds/']", "a[href*='/futures/']", "a[href*='/bank/']",
            ".news-list a", ".article-list a", "h3 a", "h2 a",
            ".list-left a", ".temp01 a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "hexun.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
