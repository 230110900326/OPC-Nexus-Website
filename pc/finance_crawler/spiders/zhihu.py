"""
知乎 - 热榜 + OPC相关话题爬虫
"""
from urllib.parse import urljoin, quote
import scrapy
from bs4 import BeautifulSoup
from finance_crawler.items import NewsItem


class ZhihuSpider(scrapy.Spider):
    name = "zhihu"
    source_name = "知乎"

    def start_requests(self):
        # 热榜
        yield scrapy.Request("https://www.zhihu.com/hot",
                             headers={"Referer": "https://www.zhihu.com/"})
        # OPC相关搜索
        for topic in ["一人公司", "创业", "自由职业", "个人IP"]:
            url = f"https://www.zhihu.com/search?type=content&q={quote(topic)}"
            yield scrapy.Request(url, headers={"Referer": "https://www.zhihu.com/"})

    def parse(self, response):
        soup = BeautifulSoup(response.text, "lxml")
        seen = set()
        for el in soup.select(
            "a[href*='/question/'], a[href*='/p/'], "
            "a[href*='/answer/'], .HotItem-title a, "
            ".HotList-item a, h3 a"
        ):
            href = el.get("href", "")
            title = el.get_text(strip=True)
            if not href or not title or len(title) < 10:
                continue
            full_url = urljoin("https://www.zhihu.com", href)
            if "zhihu.com" not in full_url or full_url in seen:
                continue
            seen.add(full_url)
            yield NewsItem(title=title, url=full_url, source=self.source_name)
