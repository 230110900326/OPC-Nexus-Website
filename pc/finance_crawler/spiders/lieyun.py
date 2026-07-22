"""
猎云网 - 创业/VC/早期投资爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class LieyunSpider(scrapy.Spider):
    name = "lieyun"
    source_name = "猎云网"

    start_urls = ["https://www.lieyunwang.com/"]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href*='/article/'], a[href*='/archives/'], h3 a, h2 a, .title a"):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.lieyunwang.com", href)
            if "lieyunwang.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
