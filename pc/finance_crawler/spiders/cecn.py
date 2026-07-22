"""
中国经济网 - 政策/经济/企业爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class CEcnSpider(scrapy.Spider):
    name = "cecn"
    source_name = "中国经济网"

    start_urls = ["https://www.ce.cn/"]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href*='/xwzx/'], a[href*='/cj/'], h3 a, h2 a, li a"):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.ce.cn", href)
            if "ce.cn" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
