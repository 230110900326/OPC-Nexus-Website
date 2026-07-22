"""
B站（Bilibili）视频平台爬虫
通过B站公开API搜索财经相关视频，提取UP主信息和主页地址
"""

import asyncio
import random
import re
from datetime import datetime
from typing import List
from urllib.parse import quote

from loguru import logger

from .video_base import BaseVideoCrawler, VideoCreatorItem
from config import VIDEO_SEARCH_KEYWORDS, MAX_VIDEO_CREATORS, MAX_RETRIES


class BilibiliCrawler(BaseVideoCrawler):
    """B站爬虫 - 通过公开API搜索财经视频"""

    def __init__(self):
        super().__init__()
        self.platform = "bilibili"
        self.source_name = "B站(哔哩哔哩)"

        # B站搜索API
        self.search_api = "https://api.bilibili.com/x/web-interface/search/type"
        # UP主主页模板
        self.space_url_template = "https://space.bilibili.com/{}"
        # 视频链接模板
        self.video_url_template = "https://www.bilibili.com/video/{}"

        # API请求头
        self.api_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Referer": "https://www.bilibili.com/",
            "Origin": "https://www.bilibili.com",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

    async def _search_keyword(self, keyword: str, page: int = 1) -> List[dict]:
        """
        搜索B站视频

        Returns:
            视频结果列表
        """
        results = []
        try:
            params = {
                "search_type": "video",
                "keyword": keyword,
                "page": page,
                "page_size": 20,
                "order": "pubdate",  # 按发布时间排序
            }

            data = await self.fetch_json(
                self.search_api,
                headers=self.api_headers,
                params=params,
            )

            if not data:
                return results

            # B站API返回格式: {"code": 0, "data": {"result": [...]}}
            if data.get("code") != 0:
                logger.warning(f"[{self.source_name}] API返回错误: code={data.get('code')}, message={data.get('message')}")
                return results

            result_data = data.get("data", {}).get("result", [])
            if isinstance(result_data, list):
                results = result_data
            else:
                # 有时候result是dict包含列表
                results = result_data if isinstance(result_data, list) else []

        except Exception as e:
            logger.error(f"[{self.source_name}] 搜索 '{keyword}' 失败: {e}")

        return results

    async def _search_and_extract(self) -> List[VideoCreatorItem]:
        """搜索并提取UP主信息"""
        all_creators = {}  # 用creator_id去重

        for keyword in VIDEO_SEARCH_KEYWORDS[:8]:  # 限制搜索关键词数量
            logger.info(f"[{self.source_name}] 搜索关键词: '{keyword}'")

            for page in range(1, 3):  # 每个关键词搜2页
                videos = await self._search_keyword(keyword, page=page)
                if not videos:
                    break

                for video in videos:
                    # 提取视频信息
                    bv_id = video.get("bvid", "")
                    aid = video.get("aid", "")
                    video_id = bv_id or f"av{aid}" if aid else ""
                    if not video_id:
                        continue

                    # 视频标题
                    video_title = video.get("title", "")
                    # 清理HTML标签
                    video_title = re.sub(r'<[^>]+>', '', video_title)

                    # 播放量
                    play = video.get("play", 0)

                    # UP主信息
                    author = video.get("author", "")
                    mid = video.get("mid", 0)  # UP主UID

                    if not author or not mid:
                        continue

                    # 去重：同一UP主只记录一次
                    creator_key = str(mid)
                    if creator_key in all_creators:
                        # 更新：保留播放量更高的视频
                        existing = all_creators[creator_key]
                        if play > existing.get("_play", 0):
                            existing["video_title"] = video_title
                            existing["video_url"] = self.video_url_template.format(video_id)
                            existing["_play"] = play
                        continue

                    # 视频描述
                    description = video.get("description", "")
                    description = re.sub(r'<[^>]+>', '', description)

                    # 标签
                    tag = video.get("tag", "")

                    creator_item = VideoCreatorItem(
                        platform=self.platform,
                        creator_name=author,
                        creator_id=str(mid),
                        homepage_url=self.space_url_template.format(mid),
                        video_title=video_title,
                        video_url=self.video_url_template.format(video_id),
                        follower_count=None,  # 需要额外API获取
                        description=tag or description,
                    )
                    creator_item._play = play  # 临时存储
                    all_creators[creator_key] = creator_item

                    if len(all_creators) >= MAX_VIDEO_CREATORS * 2:
                        break

                if len(all_creators) >= MAX_VIDEO_CREATORS * 2:
                    break

                # 页面间随机延迟
                await asyncio.sleep(random.uniform(1, 3))

            if len(all_creators) >= MAX_VIDEO_CREATORS * 2:
                break

        # 按播放量排序，取前N个
        sorted_creators = sorted(
            all_creators.values(),
            key=lambda x: getattr(x, "_play", 0),
            reverse=True,
        )[:MAX_VIDEO_CREATORS]

        # 清理临时属性
        for c in sorted_creators:
            if hasattr(c, "_play"):
                delattr(c, "_play")

        return sorted_creators

    async def _enrich_follower_count(self, creators: List[VideoCreatorItem]):
        """批量获取UP主粉丝数"""
        for creator in creators:
            try:
                mid = creator.creator_id
                # B站用户信息API
                api_url = f"https://api.bilibili.com/x/space/acc/info?mid={mid}"
                data = await self.fetch_json(api_url, headers=self.api_headers)

                if data and data.get("code") == 0:
                    info = data.get("data", {})
                    follower = info.get("follower", 0)
                    if follower:
                        if follower >= 10000:
                            creator.follower_count = f"{follower/10000:.1f}万"
                        else:
                            creator.follower_count = str(follower)

                # 避免请求过频
                await asyncio.sleep(random.uniform(0.5, 1.5))

            except Exception as e:
                logger.debug(f"[{self.source_name}] 获取UP主 {creator.creator_name} 粉丝数失败: {e}")

    async def crawl(self) -> List[VideoCreatorItem]:
        """爬取B站财经相关UP主"""
        logger.info(f"[{self.source_name}] 开始搜索财经类视频UP主...")

        creators = await self._search_and_extract()
        logger.info(f"[{self.source_name}] 搜索到 {len(creators)} 位UP主")

        # 补充粉丝数据
        if creators:
            logger.info(f"[{self.source_name}] 正在获取UP主粉丝数...")
            await self._enrich_follower_count(creators)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(creators)} 位UP主")
        return creators
