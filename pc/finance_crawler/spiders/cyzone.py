"""
创业邦 - 热门 + 创业政策爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class CyzoneSpider(scrapy.Spider):
    name = "cyzone"
    source_name = "创业邦"

    start_urls = [
        "https://www.cyzone.cn/",                        # 首页热门
        "https://www.cyzone.cn/channel/11/",             # 创业政策
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/article/'], .item-title a, .list-content a, "
            "h3 a, h2 a, .news-item a, a[href*='/channel/'], "
            ".hot-item a, .rank-item a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.cyzone.cn", href)
            if "cyzone.cn" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
