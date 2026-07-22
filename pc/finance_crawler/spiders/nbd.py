"""
每经网 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class NbdSpider(scrapy.Spider):
    name = "nbd"
    source_name = "每经网"
    base_url = "https://www.nbd.com.cn"

    start_urls = [
        "https://www.nbd.com.cn/",
        "https://www.nbd.com.cn/columns/3",
        "https://www.nbd.com.cn/columns/5",
        "https://www.nbd.com.cn/columns/2",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()

        selectors = [
            "a[href*='/articles/']", "a[href*='/news/']",
            ".article-item a", ".news-item a", ".m-news-list a",
            "h3 a", "h2 a", ".g-article-list a",
        ]

        for selector in selectors:
            for el in soup.select(selector):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue

                full_url = urljoin(self.base_url, href)
                if "nbd.com.cn" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)

                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
