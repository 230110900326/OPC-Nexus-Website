"""
视频平台爬虫基类
"""

from dataclasses import dataclass, field
from typing import List, Optional

from .base import BaseCrawler
from utils.helpers import filter_finance_keywords, truncate_text


@dataclass
class VideoCreatorItem:
    """视频创作者信息数据类"""

    platform: str                      # "bilibili" / "douyin"
    creator_name: str                  # UP主/创作者昵称
    creator_id: str                    # 创作者ID/UID
    homepage_url: str                  # 创作者主页地址
    video_title: Optional[str] = None  # 相关视频标题
    video_url: Optional[str] = None    # 相关视频链接
    follower_count: Optional[str] = None  # 粉丝数
    description: Optional[str] = None  # 简介/视频描述
    keywords: List[str] = field(default_factory=list)
    related_news_title: Optional[str] = None
    related_news_url: Optional[str] = None

    def __post_init__(self):
        """初始化后处理"""
        self.creator_name = self.creator_name.strip() if self.creator_name else ""
        self.video_title = truncate_text(self.video_title.strip(), 500) if self.video_title else None
        self.description = truncate_text(self.description.strip(), 1000) if self.description else None
        if not self.keywords:
            text = f"{self.video_title or ''} {self.description or ''} {self.creator_name}"
            self.keywords = filter_finance_keywords(text)


class BaseVideoCrawler(BaseCrawler):
    """视频平台爬虫基类"""

    def __init__(self):
        super().__init__()
        self.platform: str = "unknown"

    async def crawl(self) -> List:
        """
        执行视频平台爬取，返回 VideoCreatorItem 列表
        子类必须实现 _search_and_extract 方法
        """
        raise NotImplementedError
