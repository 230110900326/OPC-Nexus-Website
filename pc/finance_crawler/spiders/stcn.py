"""
证券时报 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class StcnSpider(scrapy.Spider):
    name = "stcn"
    source_name = "证券时报"
    base_url = "https://www.stcn.com"

    start_urls = [
        "https://www.stcn.com/",
        "https://www.stcn.com/article/list.html?type=yw",
        "https://www.stcn.com/article/list.html?type=gs",
        "https://www.stcn.com/article/list.html?type=jj",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()

        selectors = [
            "a[href*='/article/']", "a[href*='/news/']",
            ".news-list a", ".article-list a", ".list-con a",
            "h3 a", "h2 a",
        ]

        for selector in selectors:
            for el in soup.select(selector):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue

                full_url = urljoin(self.base_url, href)
                if "stcn.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)

                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
