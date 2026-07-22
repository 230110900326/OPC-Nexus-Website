"""
腾讯财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class TencentFinanceSpider(scrapy.Spider):
    name = "tencent_finance"
    source_name = "腾讯财经"
    base_url = "https://finance.qq.com"

    start_urls = [
        "https://finance.qq.com/",
        "https://finance.qq.com/stock/",
        "https://finance.qq.com/fund/",
        "https://finance.qq.com/money/",
        "https://new.qq.com/ch/finance/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='new.qq.com/rain/a/']", "a[href*='finance.qq.com/a/']",
            "a[href*='/stock/']", "a[href*='/fund/']", "a[href*='/money/']",
            ".list li a", ".news-list a", "h3 a", "h2 a", ".article-item a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "qq.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
