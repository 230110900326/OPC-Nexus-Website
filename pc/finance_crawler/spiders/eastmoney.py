"""
东方财富网 - Scrapy Spider (RSS + HTML)
"""
from datetime import datetime
from urllib.parse import urljoin

import feedparser
import scrapy
from bs4 import BeautifulSoup

from config import FINANCE_KEYWORDS
from finance_crawler.items import NewsItem


class EastMoneySpider(scrapy.Spider):
    name = "eastmoney"
    source_name = "东方财富"
    base_url = "https://finance.eastmoney.com"

    def start_requests(self):
        # RSS 源
        yield scrapy.Request(
            "https://rss.eastmoney.com/yaowen.xml",
            callback=self.parse_rss,
            errback=lambda f: self._fallback_html(),
            dont_filter=True,
        )

    def _fallback_html(self):
        urls = [
            "https://finance.eastmoney.com/a/czqyw.html",
            "https://finance.eastmoney.com/a/cgsxw.html",
            "https://finance.eastmoney.com/a/cjdd.html",
        ]
        for url in urls:
            yield scrapy.Request(url, callback=self.parse_html)

    def parse_rss(self, response):
        feed = feedparser.parse(response.text)
        for entry in feed.entries:
            pub_time = None
            if hasattr(entry, "published_parsed") and entry.published_parsed:
                try:
                    pub_time = datetime(*entry.published_parsed[:6]).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass

            summary = entry.get("summary", "")
            if summary:
                summary = BeautifulSoup(summary, "lxml").get_text(strip=True)

            yield NewsItem(
                title=entry.get("title", ""),
                url=entry.get("link", ""),
                source=self.source_name,
                publish_time=pub_time,
                summary=summary,
            )

        # RSS 不足，补充 HTML
        if len(feed.entries) < 20:
            yield from self._fallback_html()

    def parse_html(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()

        for el in soup.select("a[href]"):
            href = el.get("href", "")
            title = el.get_text(strip=True)
            if not href or not title or len(title) < 10:
                continue
            if "/a/" not in href and "/news/" not in href:
                continue

            full_url = urljoin(self.base_url, href)
            if "eastmoney.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)

            yield NewsItem(
                title=title,
                url=full_url,
                source=self.source_name,
            )
