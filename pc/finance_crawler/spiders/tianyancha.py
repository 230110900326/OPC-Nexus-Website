"""
天眼查 - 公司信息/工商变更/创业政策资讯爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class TianyanchaSpider(scrapy.Spider):
    name = "tianyancha"
    source_name = "天眼查"

    start_urls = [
        "https://www.tianyancha.com/",                   # 首页
    ]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/news/'], a[href*='/article/'], "
            "a[href*='/report/'], a[href*='/company/'], "
            ".news-item a, h3 a, h2 a, li a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://www.tianyancha.com", href)
            if "tianyancha.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
