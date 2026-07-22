"""
存储管理器：去重插入、查询、统计
支持新闻文章 + 视频创作者数据
"""

from datetime import datetime, timedelta
from typing import List, Optional

from loguru import logger
from sqlalchemy import func, desc

from models.database import SessionLocal, NewsArticle, VideoCreator
from models.database import OPCSessionLocal as OPCSession
from utils.helpers import parse_datetime


class StorageManager:
    """数据存储管理器"""

    def __init__(self):
        pass

    # ============================================================
    # 新闻文章
    # ============================================================

    def bulk_upsert(self, news_items) -> int:
        """
        批量插入新闻（基于URL去重）

        Args:
            news_items: NewsItem 列表

        Returns:
            成功插入的数量
        """
        if not news_items:
            return 0

        session = SessionLocal()
        inserted_count = 0

        try:
            for item in news_items:
                if not item.url:
                    continue

                # 检查是否已存在
                existing = session.query(NewsArticle).filter(
                    NewsArticle.url == item.url
                ).first()

                if existing:
                    # 更新已有记录（补充summary等）
                    updated = False
                    if item.summary and not existing.summary:
                        existing.summary = item.summary
                        updated = True
                    if item.content and not existing.content:
                        existing.content = item.content
                        updated = True
                    if item.keywords and not existing.keywords:
                        existing.keywords = ",".join(item.keywords)
                        updated = True
                    if updated:
                        existing.updated_at = datetime.now()
                    continue

                # 解析时间
                publish_time = parse_datetime(item.publish_time) if item.publish_time else None

                # 插入新记录
                article = NewsArticle(
                    title=item.title,
                    url=item.url,
                    source=item.source,
                    publish_time=publish_time,
                    summary=item.summary,
                    content=item.content,
                    keywords=",".join(item.keywords) if item.keywords else None,
                )
                session.add(article)
                inserted_count += 1

            session.commit()
            logger.info(f"存储完成：新增 {inserted_count} 条，总计处理 {len(news_items)} 条")

        except Exception as e:
            session.rollback()
            logger.error(f"存储异常: {e}")
            raise
        finally:
            session.close()

        return inserted_count

    def query_recent(self, hours: int = 24, limit: int = 100) -> List[NewsArticle]:
        """
        查询最近N小时的新闻

        Args:
            hours: 最近多少小时
            limit: 最大返回数

        Returns:
            新闻文章列表
        """
        session = SessionLocal()
        try:
            since = datetime.now() - timedelta(hours=hours)
            articles = (
                session.query(NewsArticle)
                .filter(NewsArticle.created_at >= since)
                .order_by(desc(NewsArticle.publish_time), desc(NewsArticle.created_at))
                .limit(limit)
                .all()
            )
            return articles
        finally:
            session.close()

    def query_by_source(
        self, source: str, limit: int = 50, offset: int = 0
    ) -> List[NewsArticle]:
        """
        按来源查询新闻

        Args:
            source: 来源名称
            limit: 每页数量
            offset: 偏移量

        Returns:
            新闻文章列表
        """
        session = SessionLocal()
        try:
            articles = (
                session.query(NewsArticle)
                .filter(NewsArticle.source == source)
                .order_by(desc(NewsArticle.publish_time), desc(NewsArticle.created_at))
                .offset(offset)
                .limit(limit)
                .all()
            )
            return articles
        finally:
            session.close()

    def get_stats(self) -> dict:
        """
        获取统计信息

        Returns:
            包含总数、来源分布、时间范围等统计信息的字典
        """
        session = SessionLocal()
        try:
            total = session.query(func.count(NewsArticle.id)).scalar() or 0

            # 各来源数量
            source_stats = (
                session.query(
                    NewsArticle.source,
                    func.count(NewsArticle.id).label("count"),
                    func.max(NewsArticle.publish_time).label("latest"),
                )
                .group_by(NewsArticle.source)
                .order_by(desc("count"))
                .all()
            )

            sources = [
                {
                    "source": s.source,
                    "count": s.count,
                    "latest": s.latest.isoformat() if s.latest else None,
                }
                for s in source_stats
            ]

            # 时间范围
            newest = (
                session.query(NewsArticle)
                .order_by(desc(NewsArticle.publish_time))
                .first()
            )
            oldest = (
                session.query(NewsArticle)
                .order_by(NewsArticle.publish_time)
                .first()
            )

            # 视频创作者统计
            vc_total = session.query(func.count(VideoCreator.id)).scalar() or 0
            vc_stats = (
                session.query(
                    VideoCreator.platform,
                    func.count(VideoCreator.id).label("count"),
                )
                .group_by(VideoCreator.platform)
                .all()
            )
            video_sources = [
                {"platform": s.platform, "count": s.count}
                for s in vc_stats
            ]

            return {
                "total": total,
                "sources": sources,
                "newest_time": newest.publish_time.isoformat() if newest and newest.publish_time else None,
                "oldest_time": oldest.publish_time.isoformat() if oldest and oldest.publish_time else None,
                "video_creators_total": vc_total,
                "video_creators_sources": video_sources,
            }
        finally:
            session.close()

    def search(self, keyword: str, limit: int = 50) -> List[NewsArticle]:
        """
        关键词搜索

        Args:
            keyword: 搜索关键词
            limit: 最大返回数

        Returns:
            匹配的新闻列表
        """
        session = SessionLocal()
        try:
            pattern = f"%{keyword}%"
            articles = (
                session.query(NewsArticle)
                .filter(
                    (NewsArticle.title.like(pattern))
                    | (NewsArticle.summary.like(pattern))
                    | (NewsArticle.keywords.like(pattern))
                )
                .order_by(desc(NewsArticle.publish_time))
                .limit(limit)
                .all()
            )
            return articles
        finally:
            session.close()

    def cleanup_old(self, days: int = 90) -> int:
        """
        清理旧新闻

        Args:
            days: 保留多少天

        Returns:
            删除的记录数
        """
        session = SessionLocal()
        try:
            cutoff = datetime.now() - timedelta(days=days)
            count = (
                session.query(NewsArticle)
                .filter(NewsArticle.created_at < cutoff)
                .delete()
            )
            session.commit()
            logger.info(f"清理了 {count} 条旧新闻（{days}天前）")
            return count
        except Exception as e:
            session.rollback()
            logger.error(f"清理异常: {e}")
            raise
        finally:
            session.close()

    # ============================================================
    # 视频创作者
    # ============================================================

    def bulk_upsert_video_creators(self, creators) -> int:
        """
        批量插入视频创作者（基于主页URL去重）

        Args:
            creators: VideoCreatorItem 列表

        Returns:
            成功插入的数量
        """
        if not creators:
            return 0

        session = SessionLocal()
        inserted_count = 0

        try:
            for item in creators:
                if not item.homepage_url:
                    continue

                # 检查是否已存在
                existing = session.query(VideoCreator).filter(
                    VideoCreator.homepage_url == item.homepage_url
                ).first()

                if existing:
                    # 更新已有记录
                    updated = False
                    if item.video_title and not existing.video_title:
                        existing.video_title = item.video_title
                        updated = True
                    if item.video_url and not existing.video_url:
                        existing.video_url = item.video_url
                        updated = True
                    if item.follower_count and not existing.follower_count:
                        existing.follower_count = item.follower_count
                        updated = True
                    if item.description and not existing.description:
                        existing.description = item.description
                        updated = True
                    if item.keywords and not existing.keywords:
                        existing.keywords = ",".join(item.keywords)
                        updated = True
                    if updated:
                        existing.updated_at = datetime.now()
                    continue

                # 插入新记录
                creator = VideoCreator(
                    platform=item.platform,
                    creator_name=item.creator_name,
                    creator_id=item.creator_id or "",
                    homepage_url=item.homepage_url,
                    video_title=item.video_title,
                    video_url=item.video_url,
                    follower_count=item.follower_count,
                    description=item.description,
                    keywords=",".join(item.keywords) if item.keywords else None,
                    related_news_title=item.related_news_title,
                    related_news_url=item.related_news_url,
                )
                session.add(creator)
                inserted_count += 1

            session.commit()
            logger.info(f"视频创作者存储完成：新增 {inserted_count} 位，总计处理 {len(creators)} 位")

        except Exception as e:
            session.rollback()
            logger.error(f"视频创作者存储异常: {e}")
            raise
        finally:
            session.close()

        return inserted_count

    def get_video_creators(self, platform: str = None, limit: int = 100) -> List[VideoCreator]:
        """
        查询视频创作者

        Args:
            platform: 平台过滤 (bilibili / douyin)，None = 全部
            limit: 最大返回数
        """
        session = SessionLocal()
        try:
            query = session.query(VideoCreator).order_by(desc(VideoCreator.created_at))
            if platform:
                query = query.filter(VideoCreator.platform == platform)
            return query.limit(limit).all()
        finally:
            session.close()

    def search_video_creators(self, keyword: str, limit: int = 50) -> List[VideoCreator]:
        """
        搜索视频创作者

        Args:
            keyword: 搜索关键词
            limit: 最大返回数
        """
        session = SessionLocal()
        try:
            pattern = f"%{keyword}%"
            creators = (
                session.query(VideoCreator)
                .filter(
                    (VideoCreator.creator_name.like(pattern))
                    | (VideoCreator.video_title.like(pattern))
                    | (VideoCreator.description.like(pattern))
                    | (VideoCreator.keywords.like(pattern))
                )
                .order_by(desc(VideoCreator.created_at))
                .limit(limit)
                .all()
            )
            return creators
        finally:
            session.close()


# ============================================================
# OPC 存储管理器（opc.db）
# ============================================================
class OPCStorageManager:
    """OPC/一人公司 数据存储管理器"""

    def bulk_upsert(self, news_items) -> int:
        if not news_items:
            return 0
        session = OPCSession()
        inserted_count = 0
        try:
            for item in news_items:
                if not item.url:
                    continue
                existing = session.query(NewsArticle).filter(
                    NewsArticle.url == item.url
                ).first()
                if existing:
                    updated = False
                    if item.summary and not existing.summary:
                        existing.summary = item.summary
                        updated = True
                    if item.keywords and not existing.keywords:
                        existing.keywords = ",".join(item.keywords)
                        updated = True
                    if updated:
                        existing.updated_at = datetime.now()
                    continue
                publish_time = parse_datetime(item.publish_time) if item.publish_time else None
                article = NewsArticle(
                    title=item.title, url=item.url, source=item.source,
                    publish_time=publish_time, summary=item.summary,
                    content=item.content,
                    keywords=",".join(item.keywords) if item.keywords else None,
                )
                session.add(article)
                inserted_count += 1
            session.commit()
            logger.info(f"OPC存储：新增 {inserted_count} 条，总计处理 {len(news_items)} 条")
        except Exception as e:
            session.rollback()
            logger.error(f"OPC存储异常: {e}")
            raise
        finally:
            session.close()
        return inserted_count

    def get_stats(self) -> dict:
        session = OPCSession()
        try:
            total = session.query(func.count(NewsArticle.id)).scalar() or 0
            source_stats = (
                session.query(NewsArticle.source, func.count(NewsArticle.id).label("count"),
                              func.max(NewsArticle.publish_time).label("latest"))
                .group_by(NewsArticle.source).order_by(desc("count")).all()
            )
            sources = [{"source": s.source, "count": s.count,
                        "latest": s.latest.isoformat() if s.latest else None} for s in source_stats]
            newest = session.query(NewsArticle).order_by(desc(NewsArticle.publish_time)).first()
            return {"total": total, "sources": sources,
                    "newest_time": newest.publish_time.isoformat() if newest and newest.publish_time else None}
        finally:
            session.close()

    def search(self, keyword: str, limit: int = 50):
        session = OPCSession()
        try:
            pattern = f"%{keyword}%"
            return (session.query(NewsArticle)
                    .filter((NewsArticle.title.like(pattern)) | (NewsArticle.summary.like(pattern)))
                    .order_by(desc(NewsArticle.publish_time)).limit(limit).all())
        finally:
            session.close()
