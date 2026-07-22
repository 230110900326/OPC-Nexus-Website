"""
Scrapy Item 定义
"""

import scrapy


class NewsItem(scrapy.Item):
    """财经新闻条目"""

    title = scrapy.Field()
    url = scrapy.Field()
    source = scrapy.Field()
    publish_time = scrapy.Field()
    summary = scrapy.Field()
    content = scrapy.Field()
    keywords = scrapy.Field()
    category = scrapy.Field()       # "finance" / "opc" / "finance,opc"


class VideoCreatorItem(scrapy.Item):
    """视频创作者信息"""

    platform = scrapy.Field()
    creator_name = scrapy.Field()
    creator_id = scrapy.Field()
    homepage_url = scrapy.Field()
    video_title = scrapy.Field()
    video_url = scrapy.Field()
    follower_count = scrapy.Field()
    description = scrapy.Field()
    keywords = scrapy.Field()
    related_news_title = scrapy.Field()
    related_news_url = scrapy.Field()
    # 质量筛选字段
    play_count = scrapy.Field()       # 播放量
    like_count = scrapy.Field()       # 点赞数
    publish_date = scrapy.Field()     # 发布时间（Unix时间戳）
    quality_score = scrapy.Field()    # 质量评分（0-100）
    copyright_type = scrapy.Field()   # 版权标记（1=自制, 2=转载）
