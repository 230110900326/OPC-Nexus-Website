"""Douyin adapter — best-effort search for tech videos.

抖音网页端 JS 渲染且搜索 API 需要 a_bogus 签名。优先用无头浏览器渲染后提取；
若浏览器仍拿不到（签名拦截），则返回空。纯 HTTP 基本无效。
"""
from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

DOUYIN_SEARCH_URL = "https://www.douyin.com/search/{keyword}?type=video"
DOUYIN_VIDEO_BASE = "https://www.douyin.com/video/{item_id}"

TECH_KEYWORDS = [
    "人工智能", "AI", "大模型", "机器人", "芯片",
    "科技", "创业", "投资", "财经", "自动驾驶",
]

# 抖音视频 id 为 19 位数字
VIDEO_ID_RE = re.compile(r"/video/(\d{19})")
VIDEO_ID_INLINE_RE = re.compile(r'"aweme_id"\s*:\s*"?(\d{19})')


def _extract_ids(text: str) -> list[str]:
    ids: list[str] = []
    for match in VIDEO_ID_RE.finditer(text):
        ids.append(match.group(1))
    for match in VIDEO_ID_INLINE_RE.finditer(text):
        ids.append(match.group(1))
    return list(dict.fromkeys(ids))


def discover_douyin_videos(entry_url: str, timeout: float = 12.0, browser=None) -> list[str]:
    """尽力尝试搜索抖音视频。browser 为可选的无头浏览器实例。"""
    try:
        all_ids: list[str] = []
        seen: set[str] = set()
        for keyword in TECH_KEYWORDS[:6]:
            url = DOUYIN_SEARCH_URL.format(keyword=quote(keyword))
            ids: list[str] = []
            if browser is not None:
                ids = browser.search(url, _extract_ids, wait_selector=".search-result, .result-list, .video-list")
            else:
                try:
                    client = httpx.Client(timeout=timeout, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                        "Referer": "https://www.douyin.com/",
                    })
                    resp = client.get(url)
                    resp.raise_for_status()
                    ids = _extract_ids(resp.text)
                    client.close()
                except Exception as exc:
                    logger.warning("douyin_http keyword=%s failed: %s", keyword, str(exc)[:100])
            for item_id in ids:
                if item_id not in seen:
                    seen.add(item_id)
                    all_ids.append(item_id)
        urls = [DOUYIN_VIDEO_BASE.format(item_id=item_id) for item_id in all_ids]
        logger.info("douyin_adapter discovered %d videos", len(urls))
        return urls
    except Exception as exc:
        logger.warning("douyin_adapter failed: %s", str(exc)[:200])
        return []
