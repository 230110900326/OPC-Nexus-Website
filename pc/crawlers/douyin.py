"""
抖音（Douyin）视频平台爬虫
通过抖音搜索页面解析财经相关视频，提取创作者信息和主页地址
"""

import asyncio
import random
import re
import json
from typing import List
from urllib.parse import quote

from bs4 import BeautifulSoup
from loguru import logger

from .video_base import BaseVideoCrawler, VideoCreatorItem
from config import VIDEO_SEARCH_KEYWORDS, MAX_VIDEO_CREATORS


class DouyinCrawler(BaseVideoCrawler):
    """抖音爬虫 - 搜索财经相关创作者"""

    def __init__(self):
        super().__init__()
        self.platform = "douyin"
        self.source_name = "抖音"

        # 抖音搜索URL
        self.search_url = "https://www.douyin.com/search/{}"
        # 用户主页模板
        self.user_url_template = "https://www.douyin.com/user/{}"
        # 视频链接模板
        self.video_url_template = "https://www.douyin.com/video/{}"

        self.api_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Referer": "https://www.douyin.com/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }

        # 抖音搜索建议API（更可能返回JSON数据）
        self.search_api = "https://www.douyin.com/aweme/v1/web/search/item/"

    async def _search_keyword(self, keyword: str) -> List[dict]:
        """
        搜索抖音视频

        策略：优先尝试从HTML页面中解析内嵌的JSON数据，
        因为抖音页面会在 `<script id="RENDER_DATA">` 中存放初始数据
        """
        results = []
        try:
            url = self.search_url.format(quote(keyword))
            # 添加搜索参数
            url += f"?type=general&sort=0&publish_time=0"

            html = await self.fetch(url, headers=self.api_headers)
            if not html:
                return results

            # 尝试从 RENDER_DATA 中提取数据
            match = re.search(r'<script[^>]*id="RENDER_DATA"[^>]*>(.*?)</script>', html, re.DOTALL)
            if match:
                try:
                    # 数据是 URL-encoded JSON
                    from urllib.parse import unquote
                    raw_data = match.group(1).strip()
                    decoded = unquote(raw_data)
                    data = json.loads(decoded)

                    # 遍历数据结构查找视频列表
                    def find_video_list(obj, depth=0):
                        if depth > 15:
                            return []
                        if isinstance(obj, list):
                            results = []
                            for item in obj:
                                if isinstance(item, dict):
                                    if "aweme_id" in item or "video" in item:
                                        results.append(item)
                                    else:
                                        results.extend(find_video_list(item, depth + 1))
                            return results
                        elif isinstance(obj, dict):
                            results = []
                            for key, val in obj.items():
                                if key in ("aweme_list", "data", "user_list"):
                                    results.extend(find_video_list(val, depth + 1))
                                elif isinstance(val, (dict, list)):
                                    results.extend(find_video_list(val, depth + 1))
                            return results
                        return []

                    videos = find_video_list(data)
                    if videos:
                        results = videos[:20]  # 取前20个

                except (json.JSONDecodeError, Exception) as e:
                    logger.debug(f"[{self.source_name}] RENDER_DATA解析失败: {e}")

            # 如果RENDER_DATA方法失败，尝试直接解析HTML
            if not results:
                soup = BeautifulSoup(html, "lxml")
                for script in soup.select("script"):
                    text = script.get_text(strip=True)
                    if not text:
                        continue
                    # 查找包含视频数据的JSON
                    for pattern in [r'"aweme_list":\s*\[', r'"user_list":\s*\[', r'window\.__INITIAL_STATE__']:
                        if re.search(pattern, text):
                            try:
                                # 尝试提取JSON
                                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                                if json_match:
                                    json_data = json.loads(json_match.group())
                                    # 递归查找视频列表
                                    def extract_videos(d, depth=0):
                                        if depth > 10:
                                            return []
                                        if isinstance(d, list):
                                            res = []
                                            for i in d:
                                                if isinstance(i, dict) and "aweme_id" in i:
                                                    res.append(i)
                                                else:
                                                    res.extend(extract_videos(i, depth + 1))
                                            return res
                                        elif isinstance(d, dict):
                                            res = []
                                            for k, v in d.items():
                                                if k == "aweme_list" and isinstance(v, list):
                                                    res.extend(v)
                                                elif isinstance(v, (dict, list)):
                                                    res.extend(extract_videos(v, depth + 1))
                                            return res
                                        return []

                                    found = extract_videos(json_data)
                                    if found:
                                        results = found[:20]
                                        break
                            except (json.JSONDecodeError, Exception):
                                continue

        except Exception as e:
            logger.error(f"[{self.source_name}] 搜索 '{keyword}' 失败: {e}")

        return results

    async def _search_and_extract(self) -> List[VideoCreatorItem]:
        """搜索并提取创作者信息"""
        all_creators = {}  # 用creator_id去重

        for keyword in VIDEO_SEARCH_KEYWORDS[:6]:  # 限制关键词数量
            logger.info(f"[{self.source_name}] 搜索关键词: '{keyword}'")

            try:
                videos = await self._search_keyword(keyword)

                for video in videos:
                    # 提取视频信息
                    aweme_id = video.get("aweme_id", "")
                    desc = video.get("desc", "") or video.get("title", "")
                    desc = re.sub(r'#\S+', '', desc).strip()  # 清理话题标签

                    # 创作者信息
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
                    creator_uid = (
                        author_info.get("uid", "")
                        or author_info.get("sec_uid", "")
                        or video.get("author_uid", "")
                    )
                    # sec_uid是抖音的主要用户标识
                    sec_uid = author_info.get("sec_uid", "") or author_info.get("short_id", "")

                    if not creator_name:
                        continue
                    if not sec_uid and not creator_uid:
                        continue

                    user_id = sec_uid or creator_uid

                    # 去重
                    if user_id in all_creators:
                        continue

                    # 粉丝数
                    follower_count = author_info.get("follower_count", 0)
                    follower_str = None
                    if follower_count:
                        if isinstance(follower_count, str):
                            follower_str = follower_count
                        elif follower_count >= 10000:
                            follower_str = f"{follower_count/10000:.1f}万"
                        else:
                            follower_str = str(follower_count)

                    # 创作者签名
                    signature = author_info.get("signature", "") or author_info.get("bio", "")

                    creator_item = VideoCreatorItem(
                        platform=self.platform,
                        creator_name=creator_name,
                        creator_id=str(user_id),
                        homepage_url=self.user_url_template.format(user_id),
                        video_title=desc if desc else f"相关财经视频",
                        video_url=self.video_url_template.format(aweme_id) if aweme_id else None,
                        follower_count=follower_str,
                        description=signature,
                    )
                    all_creators[user_id] = creator_item

                    if len(all_creators) >= MAX_VIDEO_CREATORS * 2:
                        break

                if len(all_creators) >= MAX_VIDEO_CREATORS * 2:
                    break

                # 关键词间随机延迟
                await asyncio.sleep(random.uniform(2, 5))

            except Exception as e:
                logger.error(f"[{self.source_name}] 搜索 '{keyword}' 异常: {e}")
                continue

        # 返回前MAX_VIDEO_CREATORS个
        result = list(all_creators.values())[:MAX_VIDEO_CREATORS]
        return result

    async def _fallback_search(self) -> List[VideoCreatorItem]:
        """
        备用搜索方案：通过抖音热点/话题页面获取财经相关内容
        """
        creators = []
        try:
            # 尝试几个财经相关的话题/热点页面
            fallback_urls = [
                "https://www.douyin.com/hot",
                "https://www.douyin.com/search/财经?type=general",
                "https://www.douyin.com/search/股票?type=general",
            ]

            html = await self.fetch(fallback_urls[-1], headers=self.api_headers)
            if not html:
                return creators

            # 从HTML中尝试提取用户信息
            soup = BeautifulSoup(html, "lxml")
            seen = set()

            # 查找用户链接
            for el in soup.select("a[href*='/user/']"):
                href = el.get("href", "")
                name = el.get_text(strip=True)
                if href and "/user/" in href:
                    user_id = href.split("/user/")[-1].split("?")[0]
                    if user_id and user_id not in seen:
                        seen.add(user_id)
                        creators.append(VideoCreatorItem(
                            platform=self.platform,
                            creator_name=name or f"抖音创作者_{user_id[:8]}",
                            creator_id=user_id,
                            homepage_url=f"https://www.douyin.com/user/{user_id}",
                        ))

        except Exception as e:
            logger.error(f"[{self.source_name}] 备用搜索失败: {e}")

        return creators[:MAX_VIDEO_CREATORS]

    async def crawl(self) -> List[VideoCreatorItem]:
        """爬取抖音财经相关创作者"""
        logger.info(f"[{self.source_name}] 开始搜索财经类创作者...")

        # 主搜索
        creators = await self._search_and_extract()

        # 如果主搜索获取不足，启用备用方案
        if len(creators) < 5:
            logger.info(f"[{self.source_name}] 主搜索结果较少，启用备用方案...")
            fallback = await self._fallback_search()
            existing_ids = {c.creator_id for c in creators}
            for c in fallback:
                if c.creator_id not in existing_ids:
                    creators.append(c)

        logger.info(f"[{self.source_name}] 爬取完成，共 {len(creators)} 位创作者")
        return creators
