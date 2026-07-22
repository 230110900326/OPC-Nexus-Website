"""
搜狐财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class SohuFinanceSpider(scrapy.Spider):
    name = "sohu_finance"
    source_name = "搜狐财经"
    base_url = "https://business.sohu.com"

    start_urls = [
        "https://business.sohu.com/",
        "https://stock.sohu.com/",
        "https://fund.sohu.com/",
        "https://futures.sohu.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='sohu.com/a/']", "a[href*='business.sohu.com/']",
            "a[href*='stock.sohu.com/']", ".news-list a", ".list14 a",
            ".article-list a", "h3 a", "h2 a", ".f14list a", ".info-tit a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "sohu.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
