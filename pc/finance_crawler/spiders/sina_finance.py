"""
新浪财经 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class SinaFinanceSpider(scrapy.Spider):
    name = "sina_finance"
    source_name = "新浪财经"
    base_url = "https://finance.sina.com.cn"

    start_urls = [
        "https://finance.sina.com.cn/",
        "https://finance.sina.com.cn/stock/",
        "https://finance.sina.com.cn/china/",
        "https://finance.sina.com.cn/world/",
        "https://finance.sina.com.cn/money/fund/",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()

        for el in soup.select("a[href]"):
            href = el.get("href", "")
            title = el.get_text(strip=True)
            if not href or not title or len(title) < 10:
                continue

            if "finance.sina.com.cn" not in href:
                if href.startswith("/"):
                    href = f"https://finance.sina.com.cn{href}"
                else:
                    continue

            full_url = urljoin(self.base_url, href)
            if full_url in seen:
                continue

            skip = ["#", "javascript:", "mailto:", "login", "registe"]
            if any(p in full_url.lower() for p in skip):
                continue
            seen.add(full_url)

            yield NewsItem(title=title, url=full_url, source=self.source_name)
