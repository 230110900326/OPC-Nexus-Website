"""
新华财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class XinhuaFinanceSpider(scrapy.Spider):
    name = "xinhua_finance"
    source_name = "新华财经"
    base_url = "https://www.xinhuafinance.com"

    start_urls = [
        "https://www.xinhuafinance.com/",
        "https://www.news.cn/fortune/",
        "https://www.cs.com.cn/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/fortune/']", "a[href*='/finance/']",
            "a[href*='/cs/']", "a[href*='/news/']",
            ".news-list a", ".list-con a", "h3 a", "h2 a", ".article-list a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
