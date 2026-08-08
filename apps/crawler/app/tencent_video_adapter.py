"""Tencent Video adapter — searches v.qq.com for AI/tech videos.

搜索页为 JS 渲染，优先使用无头浏览器渲染后提取；无浏览器时退回 HTTP（通常拿不到结果）。
返回结构化视频元数据。
"""
from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

TENCENT_SEARCH_URL = "https://v.qq.com/x/search/?q={keyword}"
TENCENT_VIDEO_BASE = "https://v.qq.com/x/page/{vid}.html"

TECH_KEYWORDS = [
    "人工智能", "AI", "大模型", "GPT", "LLM", "深度学习",
    "机器人", "芯片", "半导体", "自动驾驶", "新能源",
    "AI芯片", "大模型应用", "具身智能", "AI Agent", "智能体",
]

VID_HREF_RE = re.compile(r"/x/(?:page|cover)/(?:[A-Za-z0-9]+/)?([A-Za-z0-9]{6,15})\.html")
VID_ATTR_RE = re.compile(r'"vid"\s*:\s*"([A-Za-z0-9]{6,15})"')
RESULT_SELECTOR = ".result_video, .mod_result, #search_result, .search_result"


def _extract_vids(html: str) -> list[str]:
    vids: list[str] = []
    for match in VID_HREF_RE.finditer(html):
        vids.append(match.group(1))
    for match in VID_ATTR_RE.finditer(html):
        vids.append(match.group(1))
    return list(dict.fromkeys(vids))


def discover_tencent_videos(entry_url: str, timeout: float = 12.0, browser=None) -> list[dict[str, Any]]:
    """搜索腾讯视频，返回结构化视频元数据列表。browser 为可选的无头浏览器实例。"""
    try:
        all_items: list[dict[str, Any]] = []
        seen: set[str] = set()
        for keyword in TECH_KEYWORDS[:10]:
            url = TENCENT_SEARCH_URL.format(keyword=quote(keyword))
            vids: list[str] = []
            if browser is not None:
                vids = browser.search(url, _extract_vids, wait_selector=RESULT_SELECTOR)
            else:
                try:
                    client = httpx.Client(timeout=timeout, headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": "https://v.qq.com/",
                    })
                    resp = client.get(url)
                    resp.raise_for_status()
                    vids = _extract_vids(resp.text)
                    client.close()
                except Exception as exc:
                    logger.warning("tencent_http keyword=%s failed: %s", keyword, str(exc)[:100])
            for vid in vids:
                if vid not in seen:
                    seen.add(vid)
                    all_items.append({
                        "url": TENCENT_VIDEO_BASE.format(vid=vid),
                        "title": "",
                        "coverUrl": "",
                        "durationSeconds": 0,
                        "views": 0,
                        "likes": 0,
                        "comments": 0,
                        "publishedAt": "",
                        "author": "",
                        "description": "",
                        "platform": "tencent",
                    })
        logger.info("tencent_adapter discovered %d videos", len(all_items))
        return all_items
    except Exception as exc:
        logger.warning("tencent_adapter failed: %s", str(exc)[:200])
        return []
