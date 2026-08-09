"""Bilibili video adapter — searches for AI/tech videos via Bilibili API.

返回结构化视频元数据（标题、封面、时长、播放量、UP主等）。
"""
from __future__ import annotations
from .processing import strip_html
import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)

BILIBILI_SEARCH_API = "https://api.bilibili.com/x/web-interface/search/type"
BILIBILI_VIDEO_BASE = "https://www.bilibili.com/video/"

TECH_KEYWORDS = [
    "人工智能", "AI", "大模型", "GPT", "LLM", "深度学习",
    "机器人", "芯片", "半导体", "自动驾驶", "新能源",
    "科技", "创业", "投资", "财经", "商业",
    "AI芯片", "大模型应用", "具身智能", "AI Agent", "智能体",
    "开源模型", "算力", "GPU", "人形机器人", "AI创业",
]


def _parse_duration(seconds_or_str: Any) -> int:
    """解析 B站 duration 字段，可能是秒数或 'mm:ss' 格式。"""
    if isinstance(seconds_or_str, (int, float)):
        return int(seconds_or_str)
    if isinstance(seconds_or_str, str) and ":" in seconds_or_str:
        parts = seconds_or_str.split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def discover_bilibili_videos(entry_url: str, timeout: float = 10.0) -> list[dict[str, Any]]:
    """Search Bilibili for AI/tech videos and return structured video metadata."""
    try:
        client = httpx.Client(timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com/",
        })

        all_items: list[dict[str, Any]] = []
        seen: set[str] = set()

        for keyword in TECH_KEYWORDS[:12]:
            try:
                resp = client.get(
                    BILIBILI_SEARCH_API,
                    params={
                        "search_type": "video",
                        "keyword": keyword,
                        "order": "pubdate",
                        "duration": 0,
                        "page": 1,
                    },
                )
                resp.raise_for_status()
                data: dict[str, Any] = resp.json()

                if data.get("code") == 0:
                    results = data.get("data", {}).get("result", [])
                    for v in results:
                        bvid = v.get("bvid", "")
                        tag = (v.get("tag", "") or "").lower()
                        title = strip_html(v.get("title", "") or "")
                        title_lower = title.lower()
                        # Filter: must have tech-related tag or title
                        is_tech = any(t in tag for t in ["科技", "数码", "财经", "商业", "知识", "科学",
                                                           "人工智能", "编程", "互联网"])
                        if not is_tech:
                            is_tech = any(kw in title_lower for kw in [
                                "ai", "人工智能", "gpt", "科技", "芯片", "机器人",
                                "大模型", "融资", "上市", "llm", "深度学习", "自动驾驶",
                            ])
                        if bvid and bvid not in seen and is_tech:
                            seen.add(bvid)
                            all_items.append({
                                "url": f"{BILIBILI_VIDEO_BASE}{bvid}/",
                                "title": title,
                                "coverUrl": v.get("pic", ""),
                                "durationSeconds": _parse_duration(v.get("duration", 0)),
                                "views": v.get("play", 0),
                                "likes": 0,  # API search results don't include likes
                                "comments": v.get("video_review", 0),  # danmaku count
                                "publishedAt": v.get("pubdate", 0),
                                "author": v.get("author", ""),
                                "description": strip_html(v.get("description", "") or "")[:2000],
                                "platform": "bilibili",
                            })
            except Exception as e:
                logger.warning("bilibili_search keyword=%s failed: %s", keyword, str(e)[:100])
                continue

        logger.info("bilibili_adapter discovered %d tech/AI videos", len(all_items))
        return all_items

    except Exception as e:
        logger.warning("bilibili_adapter failed: %s", str(e)[:200])
        return []
