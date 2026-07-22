"""
导出模块：JSON / CSV（支持新闻 + 视频创作者）
"""

import csv
import json
import os
from datetime import datetime
from typing import List

from loguru import logger

from config import EXPORT_DIR
from models.database import NewsArticle, VideoCreator, SessionLocal


class Exporter:
    """数据导出器"""

    def __init__(self):
        os.makedirs(EXPORT_DIR, exist_ok=True)

    def _get_articles(self, source: str = None, limit: int = 1000) -> List[NewsArticle]:
        """从数据库获取文章"""
        from sqlalchemy import desc

        session = SessionLocal()
        try:
            query = session.query(NewsArticle).order_by(desc(NewsArticle.publish_time))
            if source:
                query = query.filter(NewsArticle.source == source)
            return query.limit(limit).all()
        finally:
            session.close()

    def _get_video_creators(self, platform: str = None, limit: int = 1000) -> List[VideoCreator]:
        """从数据库获取视频创作者"""
        from sqlalchemy import desc

        session = SessionLocal()
        try:
            query = session.query(VideoCreator).order_by(desc(VideoCreator.created_at))
            if platform:
                query = query.filter(VideoCreator.platform == platform)
            return query.limit(limit).all()
        finally:
            session.close()

    # ============================================================
    # 新闻导出
    # ============================================================

    def to_json(self, source: str = None, limit: int = 1000, filename: str = None) -> str:
        """
        导出新闻为 JSON 文件

        Args:
            source: 按来源筛选（None = 全部）
            limit: 最大导出数
            filename: 输出文件名（None = 自动生成）

        Returns:
            输出文件路径
        """
        articles = self._get_articles(source=source, limit=limit)

        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            prefix = source or "all"
            filename = f"finance_news_{prefix}_{ts}.json"

        filepath = os.path.join(EXPORT_DIR, filename)

        data = {
            "export_time": datetime.now().isoformat(),
            "source_filter": source or "all",
            "total": len(articles),
            "articles": [a.to_dict() for a in articles],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"JSON导出完成: {filepath} ({len(articles)} 条)")
        return filepath

    def to_csv(self, source: str = None, limit: int = 1000, filename: str = None) -> str:
        """
        导出新闻为 CSV 文件

        Args:
            source: 按来源筛选（None = 全部）
            limit: 最大导出数
            filename: 输出文件名（None = 自动生成）

        Returns:
            输出文件路径
        """
        articles = self._get_articles(source=source, limit=limit)

        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            prefix = source or "all"
            filename = f"finance_news_{prefix}_{ts}.csv"

        filepath = os.path.join(EXPORT_DIR, filename)

        fieldnames = [
            "id", "title", "url", "source", "publish_time",
            "summary", "keywords", "created_at",
        ]

        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for article in articles:
                writer.writerow(article.to_dict())

        logger.info(f"CSV导出完成: {filepath} ({len(articles)} 条)")
        return filepath

    # ============================================================
    # 视频创作者导出
    # ============================================================

    def video_to_json(self, platform: str = None, limit: int = 1000, filename: str = None) -> str:
        """
        导出视频创作者为 JSON 文件

        Args:
            platform: 按平台筛选（None = 全部）
            limit: 最大导出数
            filename: 输出文件名（None = 自动生成）

        Returns:
            输出文件路径
        """
        creators = self._get_video_creators(platform=platform, limit=limit)

        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            prefix = platform or "all_platforms"
            filename = f"video_creators_{prefix}_{ts}.json"

        filepath = os.path.join(EXPORT_DIR, filename)

        data = {
            "export_time": datetime.now().isoformat(),
            "platform_filter": platform or "all",
            "total": len(creators),
            "creators": [c.to_dict() for c in creators],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        logger.info(f"视频创作者JSON导出完成: {filepath} ({len(creators)} 位)")
        return filepath

    def video_to_csv(self, platform: str = None, limit: int = 1000, filename: str = None) -> str:
        """
        导出视频创作者为 CSV 文件

        Args:
            platform: 按平台筛选（None = 全部）
            limit: 最大导出数
            filename: 输出文件名（None = 自动生成）

        Returns:
            输出文件路径
        """
        creators = self._get_video_creators(platform=platform, limit=limit)

        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            prefix = platform or "all_platforms"
            filename = f"video_creators_{prefix}_{ts}.csv"

        filepath = os.path.join(EXPORT_DIR, filename)

        fieldnames = [
            "id", "platform", "creator_name", "creator_id", "homepage_url",
            "video_title", "video_url", "follower_count", "description",
            "keywords", "related_news_title", "related_news_url", "created_at",
        ]

        with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            for creator in creators:
                writer.writerow(creator.to_dict())

        logger.info(f"视频创作者CSV导出完成: {filepath} ({len(creators)} 位)")
        return filepath
