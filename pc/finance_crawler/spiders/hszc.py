"""
慧算账 - 小微企业财税/代理记账/税收政策爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class HszcSpider(scrapy.Spider):
    name = "hszc"
    source_name = "慧算账"

    start_urls = [
        "https://www.hszc.com/",                         # 首页
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/news/'], a[href*='/article/'], "
            "a[href*='/zixun/'], a[href*='/info/'], "
            ".news-list a, h3 a, h2 a, li a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.hszc.com", href)
            if "hszc.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
