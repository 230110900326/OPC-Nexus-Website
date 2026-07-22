"""
第一财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class YiCaiSpider(scrapy.Spider):
    name = "yicai"
    source_name = "第一财经"
    base_url = "https://www.yicai.com"

    start_urls = [
        "https://www.yicai.com/",
        "https://www.yicai.com/news/",
        "https://www.yicai.com/brief/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()

        selectors = [
            ".news-list a", ".article-list a", ".list-content a",
            ".m-list a", "a[href*='/news/']", "a[href*='/brief/']",
            "a[href*='/video/']",
        ]

        for selector in selectors:
            for el in soup.select(selector):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue

                full_url = urljoin(self.base_url, href)
                if "yicai.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)

                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
