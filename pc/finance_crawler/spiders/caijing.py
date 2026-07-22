"""
财经网 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class CaijingSpider(scrapy.Spider):
    name = "caijing"
    source_name = "财经网"
    base_url = "https://www.caijing.com.cn"

    start_urls = [
        "https://www.caijing.com.cn/",
        "https://finance.caijing.com.cn/",
        "https://economy.caijing.com.cn/",
        "https://industry.caijing.com.cn/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/finance/']", "a[href*='/economy/']",
            "a[href*='/industry/']", "a[href*='/news/']",
            ".news-list a", ".article-list a", "h3 a", "h2 a",
            ".title a", ".list-con a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "caijing.com.cn" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
