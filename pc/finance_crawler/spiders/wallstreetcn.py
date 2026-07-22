"""
华尔街见闻 - Scrapy Spider (API)
"""
from datetime import datetime

import scrapy

from finance_crawler.items import NewsItem


class WallStreetCNSpider(scrapy.Spider):
    name = "wallstreetcn"
    source_name = "华尔街见闻"
    base_url = "https://wallstreetcn.com"

    def start_requests(self):
        headers = {
            "Referer": "https://wallstreetcn.com/",
            "Origin": "https://wallstreetcn.com",
        }
        yield scrapy.Request(
            "https://api-one.wallstcn.com/apiv1/content/articles/hot?period=all&limit=50",
            headers=headers,
            callback=self.parse_articles,
        )
        yield scrapy.Request(
            "https://api-one.wallstcn.com/apiv1/content/lives?limit=30",
            headers=headers,
            callback=self.parse_lives,
        )

    def parse_articles(self, response):
        data = response.json()
        articles = data.get("data", {}).get("day_items", [])
        if not articles:
            articles = data.get("data", {}).get("items", [])

        for art in articles:
            title = art.get("title") or art.get("content_text", "")
            if not title:
                continue
            aid = art.get("id", "")
            summary = art.get("content_text") or art.get("content_short", "")
            pub_time = self._parse_ts(art.get("display_time") or art.get("published_at"))

            yield NewsItem(
                title=title,
                url=f"https://wallstreetcn.com/articles/{aid}",
                source=self.source_name,
                publish_time=pub_time,
                summary=summary,
            )

    def parse_lives(self, response):
        data = response.json()
        lives = data.get("data", {}).get("items", [])
        for live in lives:
            title = live.get("content_text", "")
            if not title:
                continue
            lid = live.get("id", "")
            pub_time = self._parse_ts(live.get("display_time") or live.get("created_at"))

            yield NewsItem(
                title=title[:200],
                url=f"https://wallstreetcn.com/livenews/{lid}",
                source=self.source_name,
                publish_time=pub_time,
                summary=title[:500],
            )

    @staticmethod
    def _parse_ts(ts):
        if not ts:
            return None
        try:
            if isinstance(ts, (int, float)):
                if ts > 1e12:
                    ts = ts / 1000
                return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass
        return None
