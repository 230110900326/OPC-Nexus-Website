"""
界面新闻 - 热榜 + 商业频道爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class JiemianSpider(scrapy.Spider):
    name = "jiemian"
    source_name = "界面新闻"

    start_urls = [
        "https://www.jiemian.com/",                     # 首页（含热榜）
        "https://www.jiemian.com/lists/4.html",          # 商业
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/article/'], .news-view a, h3 a, "
            ".item-news a, .hot-list a, .rank-list a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.jiemian.com", href)
            if "jiemian.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
