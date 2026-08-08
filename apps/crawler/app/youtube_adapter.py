"""YouTube video adapter — searches for AI/tech videos via YouTube search.

搜索页为 JS 渲染，需要无头浏览器；无浏览器时退回 HTTP（通常拿不到结果）。
返回结构化视频元数据。
"""
from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

YOUTUBE_SEARCH_URL = "https://www.youtube.com/results?search_query={keyword}"
YOUTUBE_VIDEO_BASE = "https://www.youtube.com/watch?v={video_id}"

TECH_KEYWORDS = [
    "人工智能 AI", "大模型 GPT LLM", "深度学习 machine learning",
    "机器人 robotics", "AI芯片 半导体", "自动驾驶 self-driving",
    "新能源 科技", "AI Agent 智能体", "具身智能 人形机器人",
    "开源模型 open source AI", "AI创业 投资", "科技财经",
]

# YouTube video ID: 11 chars, alphanumeric + _ + -
VIDEO_ID_RE = re.compile(r'videoId["\s:=]+["\']([A-Za-z0-9_-]{11})["\']')
WATCH_HREF_RE = re.compile(r'/watch\?v=([A-Za-z0-9_-]{11})')
SHORT_LINK_RE = re.compile(r'youtu\.be/([A-Za-z0-9_-]{11})')

# Extract title, duration, views from search result snippets
TITLE_RE = re.compile(r'"title"\s*:\s*\{[^}]*"runs"\s*:\s*\[\{[^}]*"text"\s*:\s*"([^"]+)"')
# Broader patterns for embedded JSON in YouTube search results
VIEW_COUNT_RE = re.compile(r'"viewCountText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"')
LENGTH_RE = re.compile(r'"lengthText"\s*:\s*\{[^}]*"simpleText"\s*:\s*"([^"]+)"')
THUMBNAIL_RE = re.compile(r'"url"\s*:\s*"https://i\.ytimg\.com/vi/([A-Za-z0-9_-]{11})/[^"]+\.jpg"')

RESULT_SELECTOR = "ytd-video-renderer, ytd-search, #contents"


def _extract_video_ids(html: str) -> list[str]:
    """从 YouTube 搜索结果 HTML 中提取 videoId 列表。"""
    ids: list[str] = []
    for match in VIDEO_ID_RE.finditer(html):
        ids.append(match.group(1))
    for match in WATCH_HREF_RE.finditer(html):
        ids.append(match.group(1))
    for match in SHORT_LINK_RE.finditer(html):
        ids.append(match.group(1))
    return list(dict.fromkeys(ids))


def _parse_duration(text: str) -> int:
    """解析 YouTube 时长格式如 '12:34' 或 '1:02:34'。"""
    parts = text.strip().split(":")
    if len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    return 0


def _parse_view_count(text: str) -> int:
    """解析观看量如 '1.2万 views' 或 '12K views'。"""
    num_str = text.replace("views", "").replace("view", "").strip()
    num_str = re.sub(r'[,\s]', '', num_str)
    try:
        if "万" in num_str:
            return int(float(num_str.replace("万", "")) * 10000)
        if "亿" in num_str:
            return int(float(num_str.replace("亿", "")) * 100000000)
        if num_str.upper().endswith("K"):
            return int(float(num_str[:-1]) * 1000)
        if num_str.upper().endswith("M"):
            return int(float(num_str[:-1]) * 1000000)
        return int(num_str) if num_str else 0
    except (ValueError, TypeError):
        return 0


def discover_youtube_videos(entry_url: str, timeout: float = 15.0, browser=None) -> list[dict[str, Any]]:
    """搜索 YouTube 科技/AI 视频，返回结构化视频元数据列表。"""
    try:
        all_items: list[dict[str, Any]] = []
        seen: set[str] = set()
        for keyword in TECH_KEYWORDS[:8]:
            url = YOUTUBE_SEARCH_URL.format(keyword=quote(keyword))
            ids: list[str] = []
            if browser is not None:
                ids = browser.search(url, _extract_video_ids, wait_selector=RESULT_SELECTOR, timeout=25000, settle_ms=3000)
            else:
                try:
                    client = httpx.Client(timeout=timeout, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                    })
                    resp = client.get(url)
                    resp.raise_for_status()
                    ids = _extract_video_ids(resp.text)
                    client.close()
                except Exception as exc:
                    logger.warning("youtube_http keyword=%s failed: %s", keyword, str(exc)[:100])
            for vid in ids:
                if vid not in seen:
                    seen.add(vid)
                    all_items.append({
                        "url": YOUTUBE_VIDEO_BASE.format(video_id=vid),
                        "title": "",
                        "coverUrl": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                        "durationSeconds": 0,
                        "views": 0,
                        "likes": 0,
                        "comments": 0,
                        "publishedAt": "",
                        "author": "",
                        "description": "",
                        "platform": "youtube",
                    })
        logger.info("youtube_adapter discovered %d videos", len(all_items))
        return all_items
    except Exception as exc:
        logger.warning("youtube_adapter failed: %s", str(exc)[:200])
        return []
