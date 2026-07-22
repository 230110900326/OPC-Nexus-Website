"""
B站（Bilibili）视频平台 - Scrapy Spider
通过B站公开搜索API搜索财经视频，提取UP主信息和主页地址
"""

import re
from urllib.parse import quote

import scrapy

from finance_crawler.items import VideoCreatorItem
from config import VIDEO_SEARCH_KEYWORDS, MAX_VIDEO_CREATORS


class BilibiliSpider(scrapy.Spider):
    name = "bilibili"
    source_name = "B站(哔哩哔哩)"
    platform = "bilibili"

    custom_settings = {
        "DOWNLOAD_DELAY": 1.5,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
    }

    @classmethod
    def update_settings(cls, settings):
        super().update_settings(settings)
        settings.set("DEFAULT_REQUEST_HEADERS", {
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Referer": "https://www.bilibili.com/",
            "Origin": "https://www.bilibili.com",
        }, priority="spider")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_mids = set()
        self._creator_count = 0

    @property
    def start_urls(self):
        urls = []
        # 精准财经关键词（减少误匹配）
        focused_keywords = [
            "股票投资", "基金理财", "A股分析", "财经解读",
            "期货交易", "宏观经济", "行业研究", "投资策略",
            "股市行情", "金融知识",
        ]
        # 双策略：click=历史爆款 / pubdate=近期热门
        for keyword in focused_keywords:
            for page in [1, 2]:
                for order in ["click", "pubdate"]:
                    url = (
                        "https://api.bilibili.com/x/web-interface/search/type"
                        f"?search_type=video&keyword={quote(keyword)}"
                        f"&page={page}&page_size=20&order={order}"
                    )
                    urls.append(url)
        return urls

    def parse(self, response):
        self.logger.info(f"请求: {response.url[:100]}")
        data = response.json()

        if data.get("code") != 0:
            self.logger.warning(f"API错误: code={data.get('code')}, msg={data.get('message')}")
            return

        result = data.get("data", {}).get("result", [])
        if isinstance(result, dict):
            result = result.get("data", []) if isinstance(result, dict) else []
        if not isinstance(result, list):
            return

        self.logger.info(f"获取到 {len(result)} 个视频")

        for video in result:
            if self._creator_count >= MAX_VIDEO_CREATORS * 2:  # 爬更多候选，让Pipeline筛选
                self.logger.info(f"已收集足够候选，停止")
                return

            bv_id = video.get("bvid", "")
            aid = video.get("aid", "")
            video_id = bv_id or (f"av{aid}" if aid else "")
            if not video_id:
                continue

            video_title = re.sub(r"<[^>]+>", "", video.get("title", ""))
            author = video.get("author", "")
            mid = video.get("mid", 0)
            tag = video.get("tag", "")

            # 质量数据
            play_count = video.get("play", 0)
            favorites = video.get("favorites", 0)
            pubdate_ts = video.get("pubdate", 0)  # Unix时间戳
            copyright_val = video.get("copyright", 1)  # 1=自制, 2=转载

            if not author or not mid:
                continue
            if mid in self._seen_mids:
                continue
            self._seen_mids.add(mid)

            item = VideoCreatorItem(
                platform=self.platform,
                creator_name=author,
                creator_id=str(mid),
                homepage_url=f"https://space.bilibili.com/{mid}",
                video_title=video_title,
                video_url=f"https://www.bilibili.com/video/{video_id}",
                description=tag,
                play_count=play_count,
                like_count=favorites,  # B站用收藏数作为热度参考
                publish_date=pubdate_ts,
                copyright_type=copyright_val,
            )
            self._creator_count += 1
            self.logger.info(
                f"  UP主: {author} | 播放:{play_count} | 收藏:{favorites} | "
                f"版权:{'自制' if copyright_val == 1 else '转载'} | {video_title[:30]}"
            )
            yield item
