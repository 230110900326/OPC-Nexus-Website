"""
中国证券报 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class ChinaStockSpider(scrapy.Spider):
    name = "china_stock"
    source_name = "中国证券报"
    base_url = "https://www.cs.com.cn"

    start_urls = [
        "https://www.cs.com.cn/",
        "https://www.cs.com.cn/ssgs/",
        "https://www.cs.com.cn/jj/",
        "https://www.cs.com.cn/ggyy/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/ssgs/']", "a[href*='/jj/']",
            "a[href*='/ggyy/']", "a[href*='/cj/']",
            ".list-con a", ".news-list a", "h3 a", "h2 a", ".article-list a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "cs.com.cn" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
