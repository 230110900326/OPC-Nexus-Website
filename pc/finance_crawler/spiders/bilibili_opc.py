"""
B站 OPC/一人公司 IP孵化 爆款UP主爬虫
搜索一人公司、个人IP、创业等相关内容，提取高流量创作者
"""

import re
from urllib.parse import quote
import scrapy
from finance_crawler.items import VideoCreatorItem
from config import OPC_VIDEO_KEYWORDS, OPC_VIDEO_QUALITY_TOP_N


class BilibiliOPCSpider(scrapy.Spider):
    name = "bilibili_opc"
    source_name = "B站(一人公司OPC)"
    platform = "bilibili"

    is_opc = True   # 标记为OPC内容，Pipeline将使用OPC阈值

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
        for keyword in OPC_VIDEO_KEYWORDS:
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
            if self._creator_count >= OPC_VIDEO_QUALITY_TOP_N * 3:
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
            play_count = video.get("play", 0)
            favorites = video.get("favorites", 0)
            pubdate_ts = video.get("pubdate", 0)
            copyright_val = video.get("copyright", 1)

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
                like_count=favorites,
                publish_date=pubdate_ts,
                copyright_type=copyright_val,
            )
            self._creator_count += 1
            self.logger.info(
                f"  OPC UP主: {author} | 播放:{play_count} | 收藏:{favorites} | {video_title[:40]}"
            )
            yield item
