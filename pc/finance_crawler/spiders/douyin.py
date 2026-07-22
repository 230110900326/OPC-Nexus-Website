"""
抖音（Douyin）视频平台 - Scrapy Spider
通过搜索页面解析财经内容，提取创作者信息和主页地址
"""

import json
import re
from urllib.parse import quote, unquote

import scrapy
from bs4 import BeautifulSoup

from finance_crawler.items import VideoCreatorItem
from config import VIDEO_SEARCH_KEYWORDS, MAX_VIDEO_CREATORS


class DouyinSpider(scrapy.Spider):
    name = "douyin"
    source_name = "抖音"
    platform = "douyin"

    custom_settings = {
        "DOWNLOAD_DELAY": 2.0,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._seen_uids = set()
        self._creator_count = 0

    @property
    def start_urls(self):
        urls = []
        for keyword in VIDEO_SEARCH_KEYWORDS[:6]:
            url = f"https://www.douyin.com/search/{quote(keyword)}?type=general"
            urls.append(url)
        return urls

    def parse(self, response):
        self.logger.info(f"搜索页面: {response.url[:80]}")
        html = response.text

        # 尝试从 RENDER_DATA 提取
        match = re.search(
            r'<script[^>]*id="RENDER_DATA"[^>]*>(.*?)</script>',
            html, re.DOTALL
        )
        if match:
            try:
                raw = match.group(1).strip()
                decoded = unquote(raw)
                data = json.loads(decoded)
                videos = self._find_videos(data)
                self.logger.info(f"RENDER_DATA提取到 {len(videos)} 个视频")
                for v in videos:
                    item = self._extract_creator(v)
                    if item:
                        self._seen_uids.add(item["creator_id"])
                        self._creator_count += 1
                        yield item
                if videos:
                    return
            except (json.JSONDecodeError, Exception) as e:
                self.logger.warning(f"RENDER_DATA解析失败: {e}")

        # 备用：直接解析HTML
        self.logger.info("使用HTML备用方案")
        soup = BeautifulSoup(html, "lxml")
        for el in soup.select("a[href*='/user/']"):
            if self._creator_count >= MAX_VIDEO_CREATORS:
                return

            href = el.get("href", "")
            name = el.get_text(strip=True)
            if not href or "/user/" not in href:
                continue

            uid = href.split("/user/")[-1].split("?")[0].split("&")[0]
            if not uid or uid in self._seen_uids:
                continue

            self._seen_uids.add(uid)
            self._creator_count += 1

            yield VideoCreatorItem(
                platform=self.platform,
                creator_name=name or f"抖音创作者_{uid[:8]}",
                creator_id=uid,
                homepage_url=f"https://www.douyin.com/user/{uid}",
            )

    def _find_videos(self, obj, depth=0):
        """递归查找视频列表"""
        if depth > 15:
            return []
        if isinstance(obj, list):
            results = []
            for item in obj:
                if isinstance(item, dict) and ("aweme_id" in item or "video" in item):
                    results.append(item)
                else:
                    results.extend(self._find_videos(item, depth + 1))
            return results
        elif isinstance(obj, dict):
            results = []
            for key, val in obj.items():
                if key in ("aweme_list", "data", "user_list"):
                    results.extend(self._find_videos(val, depth + 1))
                elif isinstance(val, (dict, list)):
                    results.extend(self._find_videos(val, depth + 1))
            return results
        return []

    def _extract_creator(self, video):
        """从视频数据提取创作者信息"""
        aweme_id = video.get("aweme_id", "")
        desc = video.get("desc", "") or video.get("title", "")
        desc = re.sub(r"#\S+", "", desc).strip()

        author_info = video.get("author", {}) or video.get("author_info", {})
        if isinstance(author_info, str):
            try:
                author_info = json.loads(author_info)
            except Exception:
                author_info = {}

        creator_name = (
            author_info.get("nickname", "")
            or author_info.get("unique_id", "")
            or video.get("nickname", "")
        )
        creator_uid = author_info.get("uid", "")
        sec_uid = author_info.get("sec_uid", "") or author_info.get("short_id", "")
        user_id = sec_uid or creator_uid

        if not creator_name or not user_id:
            return None

        # 质量数据
        stats = video.get("statistics", {}) or {}
        like_count = stats.get("digg_count", 0) or video.get("like_count", 0)
        play_count = stats.get("play_count", 0) or video.get("play_count", 0)
        create_time = video.get("create_time", 0) or video.get("publish_time", 0)

        follower = author_info.get("follower_count", 0)
        follower_str = None
        if follower:
            if isinstance(follower, str):
                follower_str = follower
            elif follower >= 10000:
                follower_str = f"{follower / 10000:.1f}万"
            else:
                follower_str = str(follower)

        return VideoCreatorItem(
            platform=self.platform,
            creator_name=creator_name,
            creator_id=str(user_id),
            homepage_url=f"https://www.douyin.com/user/{user_id}",
            video_title=desc if desc else "财经相关视频",
            video_url=f"https://www.douyin.com/video/{aweme_id}" if aweme_id else None,
            follower_count=follower_str,
            description=author_info.get("signature", "") or author_info.get("bio", ""),
            play_count=play_count,
            like_count=like_count,
            publish_date=create_time,
            copyright_type=1,  # 抖音默认为自制
        )
