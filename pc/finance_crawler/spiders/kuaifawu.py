"""
快法务 - OPC/公司注册/创业法务爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class KuaifawuSpider(scrapy.Spider):
    name = "kuaifawu"
    source_name = "快法务"

    start_urls = [
        "https://www.kuaifawu.com/",                     # 首页
        "https://www.kuaifawu.com/article",              # 文章/政策
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/article/'], a[href*='/news/'], "
            "a[href*='/policy/'], .article-list a, "
            "h3 a, h2 a, .title a, li a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.kuaifawu.com", href)
            if "kuaifawu.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
