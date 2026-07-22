"""
凤凰财经 - 政策/商业/财经爬虫
"""
from urllib.parse import urljoin
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class IfengFinanceSpider(scrapy.Spider):
    name = "ifeng_finance"
    source_name = "凤凰财经"

    start_urls = ["https://finance.ifeng.com/"]

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select("a[href*='/c/'], a[href*='/a/'], h3 a, h2 a, .news-stream-news a"):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://finance.ifeng.com", href)
            if "ifeng.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
