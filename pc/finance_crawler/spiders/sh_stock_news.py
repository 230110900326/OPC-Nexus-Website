"""
上海证券报 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class SHStockNewsSpider(scrapy.Spider):
    name = "sh_stock_news"
    source_name = "上海证券报"
    base_url = "https://www.cnstock.com"

    start_urls = [
        "https://www.cnstock.com/",
        "https://news.cnstock.com/",
        "https://company.cnstock.com/",
        "https://fund.cnstock.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/news/']", "a[href*='/company/']",
            "a[href*='/fund/']", "a[href*='/market/']",
            ".list-con a", ".news-list a", "h3 a", "h2 a",
            ".article-list a", ".content-list a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "cnstock.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
