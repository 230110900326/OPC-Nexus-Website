"""
V2EX - 热门 + 创业专区爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class V2exSpider(scrapy.Spider):
    name = "v2ex"
    source_name = "V2EX"

    start_urls = [
        "https://www.v2ex.com/?tab=hot",               # 🔥 热门
        "https://www.v2ex.com/go/startup",              # 创业
        "https://www.v2ex.com/go/entrepreneur",          # 创业者
        "https://www.v2ex.com/go/freelancer",            # 自由职业
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/t/'], .topic-link, span.item_title a, "
            ".cell a[href*='/t/']"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True)
            if not href or not title or len(title) < 6:
                continue
            full_url = urljoin("https://www.v2ex.com", href)
            if "v2ex.com" not in full_url or full_url in seen:
                continue
            # V2EX标题通常较短但精炼，放低长度要求
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
