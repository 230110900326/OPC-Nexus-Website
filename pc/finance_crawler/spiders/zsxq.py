"""
知识星球 - 一人公司/自由职业/独立开发者社群爬虫
"""
from urllib.parse import urljoin, quote
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class ZsxqSpider(scrapy.Spider):
    name = "zsxq"
    source_name = "知识星球"

    def start_requests(self):
        topics = ["一人公司", "自由职业", "独立开发者", "创业", "个人IP"]
        for topic in topics:
            url = f"https://zsxq.com/search?keyword={quote(topic)}"
            yield scrapy.Request(url, headers={
                "Referer": "https://zsxq.com/",
                "Accept": "text/html,application/xhtml+xml",
            }, dont_filter=True)

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/group/'], a[href*='/topic/'], "
            ".search-result a, .group-item a, "
            "h3 a, h2 a, .title a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True) or el.get("title", "")
            if not href or not title or len(title) < 8:
                continue
            full_url = urljoin("https://zsxq.com", href)
            if "zsxq.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
