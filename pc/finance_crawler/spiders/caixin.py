"""
财新网 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class CaixinSpider(scrapy.Spider):
    name = "caixin"
    source_name = "财新网"
    base_url = "https://www.caixin.com"

    start_urls = [
        "https://www.caixin.com/",
        "https://economy.caixin.com/",
        "https://finance.caixin.com/",
        "https://companies.caixin.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/news/']", "a[href*='/article/']",
            ".news-list a", ".article-list a", "h3 a", "h2 a", "h4 a",
            ".listCon a", ".txtCon a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "caixin.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
