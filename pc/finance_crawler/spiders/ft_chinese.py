"""
FT中文网 - Scrapy Spider
"""
from urllib.parse import urljoin

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import NewsItem


class FTChineseSpider(scrapy.Spider):
    name = "ft_chinese"
    source_name = "FT中文网"
    base_url = "https://www.ftchinese.com"

    start_urls = [
        "https://www.ftchinese.com/",
        "https://www.ftchinese.com/channel/economy.html",
        "https://www.ftchinese.com/channel/markets.html",
        "https://www.ftchinese.com/channel/finance.html",
        "https://www.ftchinese.com/channel/companies.html",
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        selectors = [
            "a[href*='/story/']", "a[href*='/interactive/']",
            ".item-headline a", ".headline a", ".items a",
            "h2 a", "h3 a", ".story-headline a",
        ]
        for sel in selectors:
            for el in soup.select(sel):
                href = el.get("href", "")
                title = el.get_text(strip=True) or el.get("title", "")
                if not href or not title or len(title) < 8:
                    continue
                full_url = urljoin(self.base_url, href)
                if "ftchinese.com" not in full_url or full_url in seen:
                    continue
                seen.add(full_url)
                yield NewsItem(title=title, url=full_url, source=self.source_name)
            if seen:
                break
