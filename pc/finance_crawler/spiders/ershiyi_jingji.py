"""
21世纪经济报道 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class ErshiyiJingjiSpider(scrapy.Spider):
    name = "21jingji"
    source_name = "21世纪经济报道"
    base_url = "https://www.21jingji.com"

    start_urls = [
        "https://www.21jingji.com/",
        "https://m.21jingji.com/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/article/']", "a[href*='/news/']",
            ".list-con a", ".news-list a", "h3 a", "h2 a",
            ".article-item a", ".content-list a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "21jingji.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
