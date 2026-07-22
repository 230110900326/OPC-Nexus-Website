"""
工具函数：关键词过滤、URL标准化、时间解析
"""

import re
import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Set
from urllib.parse import urlparse, urlunparse

from dateutil import parser as date_parser
from config import FINANCE_KEYWORDS


def filter_finance_keywords(text: str) -> List[str]:
    """
    从文本中提取匹配到的财经关键词

    Args:
        text: 待匹配的文本（标题+摘要）

    Returns:
        匹配到的关键词列表（已去重）
    """
    if not text:
        return []

    matched: Set[str] = set()
    for keyword in FINANCE_KEYWORDS:
        if keyword in text:
            matched.add(keyword)

    return sorted(matched)


def is_finance_related(text: str) -> bool:
    """
    判断文本是否与财经相关

    Args:
        text: 待判断的文本

    Returns:
        True 如果包含至少一个财经关键词
    """
    keywords = filter_finance_keywords(text)
    return len(keywords) > 0


def normalize_url(url: str) -> str:
    """
    URL 标准化：去除 fragment、统一协议、去除末尾斜杠

    Args:
        url: 原始 URL

    Returns:
        标准化后的 URL
    """
    parsed = urlparse(url)
    # 去除 fragment
    normalized = urlunparse(
        (parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), parsed.params, parsed.query, "")
    )
    return normalized


def url_fingerprint(url: str) -> str:
    """
    生成 URL 指纹（用于去重比较）

    Args:
        url: 标准化后的 URL

    Returns:
        MD5 哈希值
    """
    return hashlib.md5(normalize_url(url).encode()).hexdigest()


def parse_datetime(text: str) -> Optional[datetime]:
    """
    智能解析日期时间字符串

    支持多种中文日期格式：
    - 2024-07-14 10:30:00
    - 2024年07月14日 10:30
    - 7月14日 10:30
    - 2小时前
    - 昨天 10:30
    - 今天 10:30

    Args:
        text: 日期时间字符串

    Returns:
        datetime 对象，解析失败返回 None
    """
    if not text:
        return None

    text = text.strip()

    # 相对时间
    now = datetime.now()

    # "X分钟前"
    match = re.match(r"(\d+)\s*分钟前", text)
    if match:
        return now - timedelta(minutes=int(match.group(1)))

    # "X小时前"
    match = re.match(r"(\d+)\s*小时前", text)
    if match:
        return now - timedelta(hours=int(match.group(1)))

    # "昨天 HH:MM"
    match = re.match(r"昨天\s*(\d{1,2}:\d{2})", text)
    if match:
        t = datetime.strptime(match.group(1), "%H:%M").time()
        return datetime.combine(now.date() - timedelta(days=1), t)

    # "今天 HH:MM"
    match = re.match(r"今天\s*(\d{1,2}:\d{2})", text)
    if match:
        t = datetime.strptime(match.group(1), "%H:%M").time()
        return datetime.combine(now.date(), t)

    # 尝试用 dateutil 解析
    try:
        # 处理中文数字
        text_clean = text.replace("年", "-").replace("月", "-").replace("日", "")
        text_clean = text_clean.strip()
        return date_parser.parse(text_clean, fuzzy=True)
    except Exception:
        pass

    # 常见格式
    common_formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%m-%d %H:%M",
        "%Y-%m-%d",
    ]

    for fmt in common_formats:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    return None


def clean_html(html: str) -> str:
    """
    清理 HTML 标签，提取纯文本

    Args:
        html: HTML 文本

    Returns:
        清理后的纯文本
    """
    if not html:
        return ""
    # 移除 script 和 style
    text = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.IGNORECASE)
    # 移除 HTML 标签
    text = re.sub(r"<[^>]+>", "", text)
    # 合并空白
    text = re.sub(r"\s+", " ", text)
    # 解码常见 HTML 实体
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'").replace("&ldquo;", '"').replace("&rdquo;", '"')
    return text.strip()


def truncate_text(text: str, max_length: int = 500) -> str:
    """截断文本到指定长度"""
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."
