"""
澎湃新闻 - 热榜爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class ThepaperSpider(scrapy.Spider):
    name = "thepaper"
    source_name = "澎湃新闻"

    start_urls = [
        "https://www.thepaper.cn/",                     # 首页热榜
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/newsDetail_'], h3 a, h2 a, .news_li a, "
            ".hot_news a, .rank_item a, .top_news a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.thepaper.cn", href)
            if "thepaper.cn" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
