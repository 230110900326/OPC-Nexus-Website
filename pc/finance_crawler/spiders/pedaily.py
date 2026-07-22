"""
投资界 - 创投/PE/VC/IPO爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class PedailySpider(scrapy.Spider):
    name = "pedaily"
    source_name = "投资界"

    start_urls = ["https://www.pedaily.cn/"]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href*='/news/'], .news-list a, h3 a, h2 a"):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.pedaily.cn", href)
            if "pedaily.cn" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
