"""
金融界 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class JRJSpider(scrapy.Spider):
    name = "jrj"
    source_name = "金融界"
    base_url = "https://www.jrj.com.cn"

    start_urls = [
        "https://finance.jrj.com.cn/",
        "https://stock.jrj.com.cn/",
        "https://fund.jrj.com.cn/",
        "https://forex.jrj.com.cn/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/finance/']", "a[href*='/stock/']",
            "a[href*='/fund/']", "a[href*='/forex/']",
            ".news-list a", ".list-con a", ".article-list a",
            "h3 a", "h2 a", ".new-list li a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "jrj.com.cn" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
