"""Tencent Video adapter — searches v.qq.com for AI/tech videos."""
from __future__ import annotations

import logging
import re
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

# vid 形如 /x/page/m0023h7xg6f.html 或 /x/cover/{cid}/{vid}.html
VID_HREF_RE = re.compile(r"/x/(?:page|cover)/(?:[A-Za-z0-9]+/)?([A-Za-z0-9]{6,15})\.html")
VID_ATTR_RE = re.compile(r'"vid"\s*:\s*"([A-Za-z0-9]{6,15})"')


def _extract_vids(html: str) -> list[str]:
    vids: list[str] = []
    for match in VID_HREF_RE.finditer(html):
        vids.append(match.group(1))
    for match in VID_ATTR_RE.finditer(html):
        vids.append(match.group(1))
    return list(dict.fromkeys(vids))


def discover_tencent_videos(entry_url: str, timeout: float = 12.0) -> list[str]:
    """Search Tencent Video for AI/tech videos and return video page URLs."""
    try:
        client = httpx.Client(timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://v.qq.com/",
        })
        all_vids: list[str] = []
        seen: set[str] = set()
        for keyword in TECH_KEYWORDS[:10]:
            try:
                resp = client.get(TENCENT_SEARCH_URL.format(keyword=quote(keyword)))
                resp.raise_for_status()
                vids = _extract_vids(resp.text)
                for vid in vids:
                    if vid not in seen:
                        seen.add(vid)
                        all_vids.append(vid)
            except Exception as exc:
                logger.warning("tencent_search keyword=%s failed: %s", keyword, str(exc)[:100])
                continue
        urls = [TENCENT_VIDEO_BASE.format(vid=vid) for vid in all_vids]
        logger.info("tencent_adapter discovered %d videos from %d searches", len(urls), min(len(TECH_KEYWORDS), 10))
        return urls
    except Exception as exc:
        logger.warning("tencent_adapter failed: %s", str(exc)[:200])
        return []
