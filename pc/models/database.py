"""
SQLAlchemy 数据库模型 + 连接管理
支持 MySQL 和 PostgreSQL
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Index,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL, OPC_DATABASE_URL

Base = declarative_base()


class NewsArticle(Base):
    """财经新闻文章模型"""

    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False, comment="新闻标题")
    url = Column(String(1000), unique=True, nullable=False, comment="新闻链接（去重键）")
    source = Column(String(100), nullable=False, comment="来源网站")
    publish_time = Column(DateTime, nullable=True, comment="发布时间")
    summary = Column(Text, nullable=True, comment="摘要")
    content = Column(Text, nullable=True, comment="正文内容")
    keywords = Column(String(500), nullable=True, comment="匹配到的财经关键词")
    created_at = Column(DateTime, default=datetime.now, comment="入库时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    # 索引
    __table_args__ = (
        Index("idx_source", "source"),
        Index("idx_publish_time", "publish_time"),
        Index("idx_created_at", "created_at"),
        Index("idx_source_publish", "source", "publish_time"),
    )

    def __repr__(self):
        return f"<NewsArticle(id={self.id}, source='{self.source}', title='{self.title[:50]}...')>"

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "title": self.title,
            "url": self.url,
            "source": self.source,
            "publish_time": self.publish_time.isoformat() if self.publish_time else None,
            "summary": self.summary,
            "content": self.content,
            "keywords": self.keywords,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class VideoCreator(Base):
    """视频平台创作者/UP主信息模型"""

    __tablename__ = "video_creators"

    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String(50), nullable=False, comment="视频平台：bilibili / douyin")
    creator_name = Column(String(200), nullable=False, comment="创作者名称/UP主昵称")
    creator_id = Column(String(200), nullable=True, comment="创作者ID/UID")
    homepage_url = Column(String(1000), unique=True, nullable=False, comment="创作者主页地址（去重键）")
    video_title = Column(String(500), nullable=True, comment="相关视频标题")
    video_url = Column(String(1000), nullable=True, comment="相关视频链接")
    follower_count = Column(String(50), nullable=True, comment="粉丝数")
    description = Column(Text, nullable=True, comment="创作者简介/视频描述")
    keywords = Column(String(500), nullable=True, comment="关联的财经关键词")
    related_news_title = Column(String(500), nullable=True, comment="关联的新闻标题")
    related_news_url = Column(String(1000), nullable=True, comment="关联的新闻链接")
    created_at = Column(DateTime, default=datetime.now, comment="入库时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")

    # 索引
    __table_args__ = (
        Index("idx_vc_platform", "platform"),
        Index("idx_vc_creator_name", "creator_name"),
        Index("idx_vc_keywords", "keywords"),
        Index("idx_vc_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<VideoCreator(id={self.id}, platform='{self.platform}', creator='{self.creator_name}')>"

    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "platform": self.platform,
            "creator_name": self.creator_name,
            "creator_id": self.creator_id,
            "homepage_url": self.homepage_url,
            "video_title": self.video_title,
            "video_url": self.video_url,
            "follower_count": self.follower_count,
            "description": self.description,
            "keywords": self.keywords,
            "related_news_title": self.related_news_title,
            "related_news_url": self.related_news_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# 创建引擎和会话工厂
# pool_pre_ping 用于检测断开的连接
# pool_recycle 定期回收连接（防止 MySQL 8小时超时）
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine)


def init_database():
    """初始化数据库：创建所有表（财经 + OPC）"""
    Base.metadata.create_all(bind=engine)
    Base.metadata.create_all(bind=opc_engine)


def get_session():
    """获取财经数据库会话"""
    return SessionLocal()


# ============================================================
# OPC 数据库引擎
# ============================================================
opc_engine = create_engine(
    OPC_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

OPCSessionLocal = sessionmaker(bind=opc_engine)


def get_opc_session():
    """获取OPC数据库会话"""
    return OPCSessionLocal()
