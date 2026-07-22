from .base import BaseCrawler, NewsItem
from .video_base import BaseVideoCrawler, VideoCreatorItem

# 原有财经新闻爬虫
from .eastmoney import EastMoneyCrawler
from .sina_finance import SinaFinanceCrawler
from .wallstreetcn import WallStreetCNCrawler
from .yicai import YiCaiCrawler
from .cls import ClsCrawler
from .stcn import StcnCrawler
from .nbd import NbdCrawler

# 新增财经新闻爬虫
from .caixin import CaixinCrawler
from .hexun import HexunCrawler
from .jrj import JRJCrawler
from .tencent_finance import TencentFinanceCrawler
from .netease_finance import NeteaseFinanceCrawler
from .sohu_finance import SohuFinanceCrawler
from .ft_chinese import FTChineseCrawler
from .caijing import CaijingCrawler
from .xinhua_finance import XinhuaFinanceCrawler
from .reuters import ReutersCrawler
from .bbg_chinese import BloombergChineseCrawler
from .ershiyi_jingji import ErshiyiJingjiCrawler
from .china_stock import ChinaStockCrawler
from .sh_stock_news import SHStockNewsCrawler

# 视频平台爬虫
from .bilibili import BilibiliCrawler
from .douyin import DouyinCrawler

__all__ = [
    "BaseCrawler",
    "NewsItem",
    "BaseVideoCrawler",
    "VideoCreatorItem",
    # 原有
    "EastMoneyCrawler",
    "SinaFinanceCrawler",
    "WallStreetCNCrawler",
    "YiCaiCrawler",
    "ClsCrawler",
    "StcnCrawler",
    "NbdCrawler",
    # 新增新闻
    "CaixinCrawler",
    "HexunCrawler",
    "JRJCrawler",
    "TencentFinanceCrawler",
    "NeteaseFinanceCrawler",
    "SohuFinanceCrawler",
    "FTChineseCrawler",
    "CaijingCrawler",
    "XinhuaFinanceCrawler",
    "ReutersCrawler",
    "BloombergChineseCrawler",
    "ErshiyiJingjiCrawler",
    "ChinaStockCrawler",
    "SHStockNewsCrawler",
    # 视频平台
    "BilibiliCrawler",
    "DouyinCrawler",
]

# ============================================================
# 新闻爬虫注册表
# ============================================================
CRAWLER_REGISTRY = {
    # 原有
    "eastmoney": EastMoneyCrawler,
    "sina_finance": SinaFinanceCrawler,
    "wallstreetcn": WallStreetCNCrawler,
    "yicai": YiCaiCrawler,
    "cls": ClsCrawler,
    "stcn": StcnCrawler,
    "nbd": NbdCrawler,
    # 新增新闻网站
    "caixin": CaixinCrawler,
    "hexun": HexunCrawler,
    "jrj": JRJCrawler,
    "tencent_finance": TencentFinanceCrawler,
    "netease_finance": NeteaseFinanceCrawler,
    "sohu_finance": SohuFinanceCrawler,
    "ft_chinese": FTChineseCrawler,
    "caijing": CaijingCrawler,
    "xinhua_finance": XinhuaFinanceCrawler,
    "reuters": ReutersCrawler,
    "bbg_chinese": BloombergChineseCrawler,
    "21jingji": ErshiyiJingjiCrawler,
    "china_stock": ChinaStockCrawler,
    "sh_stock_news": SHStockNewsCrawler,
}

# ============================================================
# 视频爬虫注册表
# ============================================================
VIDEO_CRAWLER_REGISTRY = {
    "bilibili": BilibiliCrawler,
    "douyin": DouyinCrawler,
}
