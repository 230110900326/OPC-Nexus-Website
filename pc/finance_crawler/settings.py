"""
Scrapy 全局设置
"""

import os

# ============================================================
# 爬虫名称
# ============================================================
BOT_NAME = "finance_crawler"

# ============================================================
# Spider 模块
# ============================================================
SPIDER_MODULES = ["finance_crawler.spiders"]
NEWSPIDER_MODULE = "finance_crawler.spiders"

# ============================================================
# 并发与延迟
# ============================================================
CONCURRENT_REQUESTS = 16
CONCURRENT_REQUESTS_PER_DOMAIN = 3
DOWNLOAD_DELAY = 0.5          # 同域名请求间隔（秒）
RANDOMIZE_DOWNLOAD_DELAY = True

# ============================================================
# 自动限速（AutoThrottle）
# ============================================================
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1.0
AUTOTHROTTLE_MAX_DELAY = 10.0
AUTOTHROTTLE_TARGET_CONCURRENCY = 3.0

# ============================================================
# 超时
# ============================================================
DOWNLOAD_TIMEOUT = 30

# ============================================================
# 重试
# ============================================================
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 522, 524, 408, 429]

# ============================================================
# User-Agent（默认，实际由 Middleware 轮换）
# ============================================================
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

# ============================================================
# 请求头
# ============================================================
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
}

# ============================================================
# 中间件
# ============================================================
DOWNLOADER_MIDDLEWARES = {
    "finance_crawler.middlewares.UARotateMiddleware": 400,
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": 500,
}

# ============================================================
# Pipeline
# ============================================================
ITEM_PIPELINES = {
    "finance_crawler.pipelines.CleanPipeline": 100,
    "finance_crawler.pipelines.CategoryRouterPipeline": 110,
    "finance_crawler.pipelines.VideoQualityPipeline": 150,
    "finance_crawler.pipelines.DedupPipeline": 200,
    "finance_crawler.pipelines.FinanceDBPipeline": 300,
    "finance_crawler.pipelines.OPCDBPipeline": 310,
}

# ============================================================
# 去重
# ============================================================
DUPEFILTER_CLASS = "scrapy.dupefilters.RFPDupeFilter"

# ============================================================
# 日志
# ============================================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "crawler.log")
LOG_STDOUT = True

# ============================================================
# Feed 导出
# ============================================================
FEED_EXPORT_ENCODING = "utf-8"
FEED_EXPORT_INDENT = 2

# ============================================================
# 其他
# ============================================================
ROBOTSTXT_OBEY = False          # 新闻爬虫不遵守 robots.txt
COOKIES_ENABLED = False         # 不需要 cookie
TELNETCONSOLE_ENABLED = False   # 关闭 Telnet
