"""
i黑马 - 创业/早期项目/产业互联网爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class IheimaSpider(scrapy.Spider):
    name = "iheima"
    source_name = "i黑马"

    start_urls = ["https://www.iheima.com/"]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href*='/article/'], a[href*='/news/'], h3 a, h2 a, .title a"):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.iheima.com", href)
            if "iheima.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
