"""
Scrapy Item Pipeline：清理 → 分类 → 视频质量筛选 → 去重 → 双数据库入库

Pipeline 链：
  CleanPipeline (100)           → 文本清理、关键词提取
  CategoryRouterPipeline (110)  → 区分 finance / opc / both
  VideoQualityPipeline (150)    → 视频质量评分筛选
  DedupPipeline (200)           → URL 去重
  FinanceDBPipeline (300)       → 存入 finance.db
  OPCDBPipeline (310)           → 存入 opc.db
"""

import math
import time
from datetime import datetime
from urllib.parse import urljoin

from finance_crawler.items import NewsItem, VideoCreatorItem
from finance_crawler.utils import (
    filter_finance_keywords,
    normalize_url,
    truncate_text,
    parse_datetime,
)
from config import (
    FINANCE_KEYWORDS,
    OPC_KEYWORDS,
    MAX_ARTICLES_PER_SOURCE,
    MAX_VIDEO_CREATORS,
    VIDEO_MIN_PLAYS,
    VIDEO_MIN_LIKES,
    VIDEO_MAX_AGE_DAYS,
    VIDEO_MIN_KEYWORD_MATCH,
    VIDEO_QUALITY_TOP_N,
    VIDEO_COPYRIGHT_FILTER,
    VIDEO_EXCLUDE_KEYWORDS,
    OPC_VIDEO_MIN_PLAYS,
    OPC_VIDEO_MIN_KEYWORD_MATCH,
    OPC_VIDEO_QUALITY_TOP_N,
    OPC_EXCLUDE_TITLES,
)


def _count_keywords(text, keyword_list):
    """统计文本中匹配到的关键词数量"""
    if not text:
        return 0
    return sum(1 for kw in keyword_list if kw in text)


# ============================================================
# Pipeline 1: CleanPipeline — 文本清理 + 关键词提取
# ============================================================
class CleanPipeline:
    """清理 Pipeline：标准化文本、截断、提取关键词"""

    def process_item(self, item, spider):
        if isinstance(item, NewsItem):
            return self._clean_news(item, spider)
        elif isinstance(item, VideoCreatorItem):
            return self._clean_video(item, spider)
        return item

    def _clean_news(self, item, spider):
        if item.get("title"):
            item["title"] = item["title"].strip()
        if item.get("url"):
            item["url"] = normalize_url(item["url"])
            base_url = getattr(spider, "base_url", "")
            if base_url and not item["url"].startswith("http"):
                item["url"] = urljoin(base_url, item["url"])
        if not item.get("source"):
            item["source"] = getattr(spider, "source_name", spider.name)
        if item.get("summary"):
            item["summary"] = truncate_text(item["summary"].strip(), 500)
        if item.get("content"):
            item["content"] = truncate_text(item["content"].strip(), 5000)
        if not item.get("keywords"):
            text = f"{item.get('title', '')} {item.get('summary', '')}"
            keywords = filter_finance_keywords(text)
            if keywords:
                item["keywords"] = ",".join(keywords)
        return item

    def _clean_video(self, item, spider):
        if item.get("creator_name"):
            item["creator_name"] = item["creator_name"].strip()
        if item.get("video_title"):
            item["video_title"] = truncate_text(item["video_title"].strip(), 500)
        if item.get("description"):
            item["description"] = truncate_text(item["description"].strip(), 1000)
        if not item.get("platform"):
            item["platform"] = getattr(spider, "platform", spider.name)
        if not item.get("keywords"):
            text = f"{item.get('video_title', '')} {item.get('description', '')} {item.get('creator_name', '')}"
            keywords = filter_finance_keywords(text)
            if keywords:
                item["keywords"] = ",".join(keywords)
        return item


# ============================================================
# Pipeline 2: CategoryRouterPipeline — 财经/OPC 分类
# ============================================================
class CategoryRouterPipeline:
    """
    分类路由 Pipeline：根据关键词匹配度标记 category

    - 匹配财经关键词 → category 含 "finance"
    - 匹配 OPC 关键词 → category 含 "opc"
    - 两边都匹配 → "finance,opc"（两边都入库）
    """

    def process_item(self, item, spider):
        if not isinstance(item, NewsItem):
            return item

        text = f"{item.get('title', '')} {item.get('summary', '')}"

        finance_count = _count_keywords(text, FINANCE_KEYWORDS)
        opc_count = _count_keywords(text, OPC_KEYWORDS)

        categories = []
        if finance_count > 0:
            categories.append("finance")
        if opc_count > 0:
            categories.append("opc")

        item["category"] = ",".join(categories) if categories else "finance"

        spider.logger.debug(
            f"  分类: {item['category']} (财经{finance_count} OPC{opc_count}) "
            f"| {item.get('title', '')[:50]}"
        )
        return item


# ============================================================
# Pipeline 3: VideoQualityPipeline — 视频质量筛选
# ============================================================
class VideoQualityPipeline:
    """视频创作者质量筛选 Pipeline（运行中 Top-N 模式）"""

    def __init__(self):
        self.accepted = []
        self.top_n = VIDEO_QUALITY_TOP_N
        self.total = 0
        self.passed = 0
        self.filtered_reasons = {}

    @classmethod
    def from_crawler(cls, crawler):
        import scrapy
        pipe = cls()
        crawler.signals.connect(pipe.spider_closed, signal=scrapy.signals.spider_closed)
        return pipe

    def process_item(self, item, spider):
        if not isinstance(item, VideoCreatorItem):
            return item

        self.total += 1

        is_opc = getattr(spider, "is_opc", False)
        min_plays = OPC_VIDEO_MIN_PLAYS if is_opc else VIDEO_MIN_PLAYS
        min_likes = OPC_VIDEO_MIN_PLAYS if is_opc else VIDEO_MIN_LIKES
        min_kw = OPC_VIDEO_MIN_KEYWORD_MATCH if is_opc else VIDEO_MIN_KEYWORD_MATCH
        if is_opc:
            self.top_n = OPC_VIDEO_QUALITY_TOP_N

        title = item.get("video_title") or ""
        desc = item.get("description") or ""
        text = f"{title} {desc}"

        # 1. 版权过滤
        copyright_val = item.get("copyright_type", 1)
        if VIDEO_COPYRIGHT_FILTER and copyright_val == 2:
            self._filtered("版权转载", item, spider)
            raise DropItem()

        # 2. 内容过滤
        if is_opc:
            for kw in OPC_EXCLUDE_TITLES:
                if kw in text:
                    self._filtered(f"无关({kw})", item, spider)
                    raise DropItem()
        else:
            for kw in VIDEO_EXCLUDE_KEYWORDS:
                if kw in text:
                    self._filtered(f"非财经({kw})", item, spider)
                    raise DropItem()

        # 3. 关键词数
        kw_str = item.get("keywords") or ""
        keywords = [k for k in kw_str.split(",") if k] if kw_str else []
        kw_count = len(keywords)
        if kw_count < min_kw:
            self._filtered("关键词不足", item, spider, extra=f"({kw_count}<{min_kw})")
            raise DropItem()

        # 4. 播放量/点赞
        platform = item.get("platform", "")
        play_count = int(item.get("play_count", 0) or 0)
        like_count = int(item.get("like_count", 0) or 0)

        if platform == "bilibili" and play_count < min_plays:
            self._filtered("播放量不足", item, spider, extra=f"({play_count}<{min_plays})")
            raise DropItem()
        if platform == "douyin" and like_count < min_likes:
            self._filtered("点赞不足", item, spider, extra=f"({like_count}<{min_likes})")
            raise DropItem()

        # 5. 时效性
        pubdate_ts = item.get("publish_date", 0)
        if pubdate_ts and pubdate_ts > 0:
            if pubdate_ts > 1e12:
                pubdate_ts = pubdate_ts / 1000
            video_age_days = (time.time() - pubdate_ts) / 86400
            if video_age_days > VIDEO_MAX_AGE_DAYS:
                self._filtered("过旧", item, spider, extra=f"({video_age_days:.0f}天)")
                raise DropItem()
        else:
            video_age_days = VIDEO_MAX_AGE_DAYS / 2

        # 6. 评分
        kw_score = min(kw_count / 5 * 100, 100)
        combined = max(play_count, like_count, 1)
        engagement_score = min(math.log10(combined) / 5 * 100, 100)
        freshness_score = max(0, (VIDEO_MAX_AGE_DAYS - video_age_days) / VIDEO_MAX_AGE_DAYS * 100)
        quality_score = kw_score * 0.3 + engagement_score * 0.5 + freshness_score * 0.2
        item["quality_score"] = round(quality_score, 1)

        spider.logger.info(
            f"  ✅ 通过 | 评分:{quality_score:.1f} "
            f"(kw:{kw_score:.0f} 热:{engagement_score:.0f} 鲜:{freshness_score:.0f}) | "
            f"{item.get('creator_name','')}"
        )

        # 7. Top-N
        self.accepted.append((quality_score, item))
        self.accepted.sort(key=lambda x: x[0], reverse=True)
        if len(self.accepted) > self.top_n:
            self.accepted.pop()

        self.passed += 1
        return item

    def _filtered(self, reason, item, spider, extra=""):
        self.filtered_reasons[reason] = self.filtered_reasons.get(reason, 0) + 1
        spider.logger.info(
            f"  ❌ 过滤({reason}{extra}): {item.get('creator_name','')} | {item.get('video_title','')[:40]}"
        )

    def spider_closed(self, spider):
        if self.total > 0:
            spider.logger.info("=" * 50)
            spider.logger.info(f"视频质量筛选: 总计{self.total} | 通过{self.passed} | Top-N={len(self.accepted)}")
            for reason, count in sorted(self.filtered_reasons.items(), key=lambda x: -x[1]):
                spider.logger.info(f"  过滤-{reason}: {count}个")
            spider.logger.info(f"最终Top-{len(self.accepted)}:")
            for score, item in sorted(self.accepted, key=lambda x: -x[0]):
                spider.logger.info(f"  [{score:.1f}] {item.get('creator_name','')} | {item.get('homepage_url','')}")
            spider.logger.info("=" * 50)


# ============================================================
# Pipeline 4: DedupPipeline — URL 去重
# ============================================================
class DedupPipeline:
    def __init__(self):
        self.seen_urls = set()
        self.news_count = 0
        self.video_count = 0

    def process_item(self, item, spider):
        url = item.get("url") or item.get("homepage_url")
        if not url:
            return item
        url = normalize_url(url)

        if isinstance(item, NewsItem):
            if self.news_count >= MAX_ARTICLES_PER_SOURCE:
                raise DropItem(f"已达上限 {MAX_ARTICLES_PER_SOURCE}")
            if url in self.seen_urls:
                raise DropItem(f"重复: {url}")
            self.seen_urls.add(url)
            self.news_count += 1

        elif isinstance(item, VideoCreatorItem):
            if self.video_count >= MAX_VIDEO_CREATORS:
                raise DropItem(f"已达上限 {MAX_VIDEO_CREATORS}")
            if url in self.seen_urls:
                raise DropItem(f"重复: {url}")
            self.seen_urls.add(url)
            self.video_count += 1

        return item


# ============================================================
# Pipeline 5: FinanceDBPipeline — 存入 finance.db
# ============================================================
class FinanceDBPipeline:
    """财经数据库入库（finance.db）"""

    def __init__(self):
        self.buffer = []
        self.storage = None

    @classmethod
    def from_crawler(cls, crawler):
        import scrapy
        pipe = cls()
        crawler.signals.connect(pipe.spider_closed, signal=scrapy.signals.spider_closed)
        return pipe

    def process_item(self, item, spider):
        if isinstance(item, NewsItem):
            cat = item.get("category", "finance")
            if "finance" in cat:
                self.buffer.append(item)
                if len(self.buffer) >= 20:
                    self._flush()
        return item

    def _flush(self):
        if not self.buffer or not self.storage:
            self.storage = _get_finance_storage()
        items = [_wrap_news(it) for it in self.buffer]
        self.storage.bulk_upsert(items)
        self.buffer.clear()

    def spider_closed(self, spider):
        self._flush()


# ============================================================
# Pipeline 6: OPCDBPipeline — 存入 opc.db
# ============================================================
class OPCDBPipeline:
    """OPC数据库入库（opc.db）"""

    def __init__(self):
        self.buffer = []
        self.storage = None

    @classmethod
    def from_crawler(cls, crawler):
        import scrapy
        pipe = cls()
        crawler.signals.connect(pipe.spider_closed, signal=scrapy.signals.spider_closed)
        return pipe

    def process_item(self, item, spider):
        if isinstance(item, NewsItem):
            cat = item.get("category", "")
            if "opc" in cat:
                self.buffer.append(item)
                if len(self.buffer) >= 20:
                    self._flush()
        elif isinstance(item, VideoCreatorItem):
            # 视频创作者暂时只存财经库
            pass
        return item

    def _flush(self):
        if not self.buffer or not self.storage:
            self.storage = _get_opc_storage()
        items = [_wrap_news(it) for it in self.buffer]
        self.storage.bulk_upsert(items)
        self.buffer.clear()

    def spider_closed(self, spider):
        self._flush()


# ============================================================
# 辅助函数
# ============================================================
def _get_finance_storage():
    from storage.manager import StorageManager
    return StorageManager()


def _get_opc_storage():
    from storage.manager import OPCStorageManager
    return OPCStorageManager()


def _wrap_news(item):
    return _NewsWrapper(
        title=item.get("title", ""),
        url=item.get("url", ""),
        source=item.get("source", ""),
        publish_time=item.get("publish_time"),
        summary=item.get("summary"),
        content=item.get("content"),
        keywords=item.get("keywords", "").split(",") if item.get("keywords") else [],
    )


class _NewsWrapper:
    def __init__(self, **kw):
        self.__dict__.update(kw)


# 最后导入
import scrapy
from scrapy.exceptions import DropItem
