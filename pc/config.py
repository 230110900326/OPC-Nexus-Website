"""
财经新闻爬虫 - 全局配置（财经/OPC双数据库版）
"""

import os

# ============================================================
# 数据库配置
# ============================================================
DATABASE_URL = os.getenv(
    "FINANCE_CRAWLER_DB_URL",
    "sqlite:///finance.db",              # 财经数据库
)
OPC_DATABASE_URL = os.getenv(
    "OPC_DB_URL",
    "sqlite:///opc.db",                  # OPC数据库（一人公司）
)

# ============================================================
# 爬取配置
# ============================================================
CRAWL_INTERVAL_MINUTES = int(os.getenv("CRAWL_INTERVAL", "30"))
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RATE_LIMIT_PER_DOMAIN = int(os.getenv("RATE_LIMIT", "3"))
MAX_ARTICLES_PER_SOURCE = int(os.getenv("MAX_ARTICLES", "50"))
MAX_VIDEO_CREATORS = int(os.getenv("MAX_VIDEO_CREATORS", "20"))

# ============================================================
# 视频创作者质量筛选配置
# ============================================================
VIDEO_MIN_PLAYS = int(os.getenv("VIDEO_MIN_PLAYS", "100000"))
VIDEO_MIN_LIKES = int(os.getenv("VIDEO_MIN_LIKES", "30000"))
VIDEO_MAX_AGE_DAYS = int(os.getenv("VIDEO_MAX_AGE_DAYS", "365"))
VIDEO_MIN_KEYWORD_MATCH = int(os.getenv("VIDEO_MIN_KEYWORD_MATCH", "3"))
VIDEO_QUALITY_TOP_N = int(os.getenv("VIDEO_QUALITY_TOP_N", "15"))
VIDEO_COPYRIGHT_FILTER = os.getenv("VIDEO_COPYRIGHT_FILTER", "true").lower() == "true"

# OPC视频阈值（垂直小众领域，单独配置）
OPC_VIDEO_MIN_PLAYS = int(os.getenv("OPC_VIDEO_MIN_PLAYS", "2000"))
OPC_VIDEO_MIN_KEYWORD_MATCH = int(os.getenv("OPC_VIDEO_MIN_KEYWORD_MATCH", "1"))
OPC_VIDEO_QUALITY_TOP_N = int(os.getenv("OPC_VIDEO_QUALITY_TOP_N", "15"))

# 非财经内容过滤词
VIDEO_EXCLUDE_KEYWORDS = [
    "电影", "电视剧", "综艺", "动漫", "动画", "MV", "音乐",
    "游戏", "搞笑", "美食", "旅游", "美妆", "穿搭", "健身",
    "综艺节目", "纪录片", "番剧", "鬼畜", "舞蹈",
]

# OPC内容排除词（"一人公司"会误匹配动漫/娱乐等无关内容）
OPC_EXCLUDE_TITLES = [
    "一人之下", "一人养活", "独自一人在",
    "王一博", "肖战", "赵丽颖", "杨幂",
    "番剧", "追番", "鬼畜", "cos", "COS",
]

# ============================================================
# User-Agent 池
# ============================================================
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 Edg/127.0.0.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
]

# ============================================================
# 财经关键词
# ============================================================
FINANCE_KEYWORDS = [
    "金融", "财经", "经济", "财政", "货币",
    "A股", "港股", "美股", "股票", "股市", "大盘", "股指", "创业板", "科创板",
    "主板", "新三板", "北交所", "涨停", "跌停", "牛市", "熊市", "IPO",
    "基金", "ETF", "LOF", "QDII", "私募", "公募", "定投",
    "债券", "国债", "企业债", "可转债", "城投债", "信用债",
    "期货", "期权", "股指期货", "商品期货", "原油", "黄金",
    "外汇", "汇率", "人民币", "美元", "欧元", "日元", "离岸人民币",
    "央行", "美联储", "加息", "降息", "降准", "存款准备金", "LPR", "MLF",
    "逆回购", "货币政策", "财政政策",
    "券商", "银行", "保险", "信托", "房地产", "科技股", "新能源",
    "半导体", "医药", "消费", "汽车",
    "GDP", "CPI", "PPI", "PMI", "社融", "M2", "贸易", "进出口",
    "分红", "股息", "回购", "增持", "减持", "借壳", "重组", "并购",
    "区块链", "数字货币", "比特币", "碳中和", "人工智能", "AI",
    "上证", "深证", "恒生", "纳斯达克", "道琼斯", "标普",
    "日经", "富时", "德国DAX",
    "投资", "理财", "资产", "负债", "营收", "净利润", "市值", "估值",
    "市盈率", "市净率", "ROE", "现金流", "财报", "年报", "季报",
    "供应链", "产业链", "制造业", "服务业", "数字化转型",
    "通胀", "通缩", "衰退", "复苏", "非农",
    "ESG", "绿色金融", "碳交易", "新能源车", "光伏", "风电",
    "锂电", "储能", "芯片", "5G", "云计算", "大数据",
    "北向资金", "南向资金", "主力资金", "龙虎榜",
    "解禁", "质押", "商誉", "减值", "亏损", "盈利",
    "社保基金", "养老金", "险资", "外资", "机构",
    "注册制", "退市", "ST", "*ST", "问询函", "监管",
]

# ============================================================
# OPC/一人公司 独立关键词
# ============================================================
OPC_KEYWORDS = [
    "一人公司", "一人有限公司", "个人独资", "个体工商户",
    "创业补贴", "创业贷款", "创业扶持", "创业担保",
    "公司注册", "营业执照", "注册资本", "工商登记",
    "税收优惠", "减税降费", "免税", "小型微利企业",
    "社保补贴", "稳岗返还", "就业补助", "见习补贴",
    "公司法", "商事制度", "放管服", "营商环境",
    "个人IP", "个人品牌", "超级个体", "一人企业",
    "AI创业", "独立开发者", "数字游民", "自由职业",
    "知识产权", "商标注册", "专利", "版权",
    "小微企业", "孵化器", "众创空间", "创业园",
    "新媒体", "自媒体", "短视频", "直播带货",
    "跨境电商", "私域", "知识付费", "远程办公",
    "创业", "副业", "公司注册", "工作室",
]

# ============================================================
# 视频平台搜索关键词
# ============================================================
VIDEO_SEARCH_KEYWORDS = [
    "财经新闻", "股市分析", "A股", "经济形势",
    "基金理财", "股票投资", "财经解读", "金融知识",
    "宏观经济", "行业分析", "公司研究", "投资策略",
    "期货交易", "外汇市场", "数字货币", "IPO分析",
]

OPC_VIDEO_KEYWORDS = [
    "个人IP孵化", "个人品牌打造", "超级个体",
    "一人企业", "一人公司注册", "一人公司创业",
    "AI一人公司", "独立开发者", "数字游民",
    "自媒体创业", "知识付费变现", "个人工作室创业",
    "自由职业", "远程工作", "副业实操",
]

# ============================================================
# 启用的新闻爬虫（21个财经新闻源 — OPC内容通过关键词匹配分流）
# ============================================================
ENABLED_CRAWLERS = [
    "eastmoney", "sina_finance", "wallstreetcn",
    "yicai", "cls", "stcn", "nbd",
    "caixin", "hexun", "jrj",
    "tencent_finance", "netease_finance", "sohu_finance",
    "ft_chinese", "caijing", "xinhua_finance",
    "reuters", "bbg_chinese", "21jingji",
    "china_stock", "sh_stock_news",
    "cyzone",            # 创业邦
    "36kr",              # 36氪
    # OPC 垂直新闻/社区源
    "zhihu",             # 知乎
    "v2ex",              # V2EX 创业社区
    "huxiu",             # 虎嗅
    "jiemian",           # 界面新闻
    "thepaper",          # 澎湃新闻
    "lieyun",            # 猎云网
    "pedaily",           # 投资界
    "ifeng_finance",     # 凤凰财经
    "cecn",              # 中国经济网
    "iheima",            # i黑马
    # OPC 法务/财税/企业服务
    "kuaifawu",          # 快法务
    "hszc",              # 慧算账
    "tianyancha",        # 天眼查
    "zsxq",              # 知识星球
]

# ============================================================
# 启用的视频平台爬虫
# ============================================================
ENABLED_VIDEO_CRAWLERS = [
    "bilibili",          # B站（财经爆款）
    "bilibili_opc",      # B站（一人公司OPC）
    "douyin",            # 抖音（财经）
]

# ============================================================
# 日志配置
# ============================================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "crawler.log")
LOG_MAX_SIZE = "50 MB"
LOG_RETENTION = "7 days"

# ============================================================
# 导出配置
# ============================================================
EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exports")
