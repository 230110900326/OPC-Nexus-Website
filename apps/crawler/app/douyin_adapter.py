"""Douyin adapter — best-effort search for tech videos.

抖音网页端为 JS 渲染，且其搜索 API 需要 a_bogus/X-Bogus 签名（随版本频繁变动）。
纯 Python 无头请求通常拿不到结果；这里做尽力尝试，失败则优雅返回空列表。
若需稳定抓取，建议后续用浏览器自动化（如 Playwright）或维护签名算法。
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


def discover_douyin_videos(entry_url: str, timeout: float = 12.0) -> list[str]:
    """尽力尝试：请求抖音搜索页并提取视频 id。JS 渲染下通常拿不到结果。"""
    try:
        client = httpx.Client(timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            "Referer": "https://www.douyin.com/",
            "Accept-Language": "zh-CN,zh;q=0.9",
        })
        all_ids: list[str] = []
        seen: set[str] = set()
        for keyword in TECH_KEYWORDS[:6]:
            try:
                resp = client.get(DOUYIN_SEARCH_URL.format(keyword=quote(keyword)))
                resp.raise_for_status()
                ids = _extract_ids(resp.text)
                for item_id in ids:
                    if item_id not in seen:
                        seen.add(item_id)
                        all_ids.append(item_id)
            except Exception as exc:
                logger.warning("douyin_search keyword=%s failed: %s", keyword, str(exc)[:100])
                continue
        urls = [DOUYIN_VIDEO_BASE.format(item_id=item_id) for item_id in all_ids]
        logger.info("douyin_adapter discovered %d videos (JS-rendered, may be 0)", len(urls))
        return urls
    except Exception as exc:
        logger.warning("douyin_adapter failed: %s", str(exc)[:200])
        return []
