"""Bilibili video adapter — searches for AI/tech videos via Bilibili API."""
from __future__ import annotations
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
]

TECH_TAG_FILTER = [
    "科技", "数码", "财经", "商业", "知识", "科学",
    "人工智能", "机器学习", "编程", "互联网", "创业",
]


def discover_bilibili_videos(entry_url: str, timeout: float = 10.0) -> list[str]:
    """Search Bilibili for AI/tech videos and return relevant video URLs."""
    try:
        client = httpx.Client(timeout=timeout, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com/",
        })

        all_bvids: list[str] = []
        seen: set[str] = set()

        for keyword in TECH_KEYWORDS[:6]:  # Use top 6 keywords to avoid rate limits
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
                        title = (v.get("title", "") or "").lower()
                        # Filter: must have tech-related tag or title
                        is_tech = any(t in tag for t in ["科技", "数码", "财经", "商业", "知识", "科学"])
                        if not is_tech:
                            is_tech = any(kw in title for kw in ["ai", "人工智能", "gpt", "科技", "芯片", "机器人", "大模型", "融资", "上市"])
                        if bvid and bvid not in seen and is_tech:
                            seen.add(bvid)
                            all_bvids.append(bvid)
            except Exception as e:
                logger.warning("bilibili_search keyword=%s failed: %s", keyword, str(e)[:100])
                continue

        urls = [f"{BILIBILI_VIDEO_BASE}{bvid}/" for bvid in all_bvids]
        logger.info("bilibili_adapter discovered %d tech/AI video URLs from %d searches", len(urls), len(TECH_KEYWORDS[:6]))
        return urls

    except Exception as e:
        logger.warning("bilibili_adapter failed: %s", str(e)[:200])
        return []
