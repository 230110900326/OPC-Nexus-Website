"""
网易财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class NeteaseFinanceSpider(scrapy.Spider):
    name = "netease_finance"
    source_name = "网易财经"
    base_url = "https://money.163.com"

    start_urls = [
        "https://money.163.com/",
        "https://money.163.com/stock/",
        "https://money.163.com/fund/",
        "https://money.163.com/finance/",
        "https://money.163.com/special/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='money.163.com/']", ".news-list a", ".article-list a",
            ".list_item a", "h3 a", "h2 a", "h4 a", ".top-news a", ".col_l a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "163.com" not in full_url or full_url in seen:
                    continue
                skip = ["#", "javascript:", "mailto:", "login", "photo", "sports"]
                if any(p in full_url.lower() for p in skip):
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
