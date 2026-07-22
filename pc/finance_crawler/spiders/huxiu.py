"""
虎嗅 - 24小时热文 + 创业频道爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class HuxiuSpider(scrapy.Spider):
    name = "huxiu"
    source_name = "虎嗅"

    start_urls = [
        "https://www.huxiu.com/",                        # 首页热门
        "https://www.huxiu.com/channel/2.html",           # 创业频道
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/article/'], .hot-article-item a, "
            ".article-item a, h3 a, h2 a, .title a, "
            ".mod-b-art-list a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.huxiu.com", href)
            if "huxiu.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
