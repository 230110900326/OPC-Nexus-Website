"""
36氪 - 人气榜 + 创投快讯爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class Kr36Spider(scrapy.Spider):
    name = "36kr"
    source_name = "36氪"

    start_urls = [
        "https://36kr.com/hot-list/",                   # 🔥 人气热榜
        "https://36kr.com/information/",                # 快讯
        "https://36kr.com/newsflashes",                 # 新闻
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/p/'], a.article-item-title, .hotlist-item a, "
            ".newsflash-item a, .kr-shadow-content a, "
            "[class*='title'] a, h3 a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://36kr.com", href)
            if "36kr.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
