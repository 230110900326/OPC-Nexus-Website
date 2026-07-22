#!/usr/bin/env python3
"""
财经新闻爬虫 - Scrapy 入口脚本

用法:
    python run.py --once                    单次爬取所有新闻来源
    python run.py --once --source eastmoney 爬取指定来源
    python run.py --video                   爬取视频平台（B站/抖音）
    python run.py --video --platform bilibili  只爬取B站
    python run.py --all                     同时爬取新闻+视频平台
    python run.py --schedule                启动定时调度
    python run.py --stats                   查看统计信息
    python run.py --search "降息"           关键词搜索新闻
    python run.py --search-video "股市"     搜索视频创作者
    python run.py --export json             导出新闻JSON
    python run.py --export csv              导出新闻CSV
    python run.py --export-video json       导出视频创作者JSON
    python run.py --init-db                 初始化数据库表
"""

import argparse
import asyncio
import os
import signal
import subprocess
import sys

from config import ENABLED_CRAWLERS, ENABLED_VIDEO_CRAWLERS
from utils.logger import setup_logger

logger = setup_logger()

# Scrapy 项目路径
SCRAPY_PROJECT = os.path.dirname(os.path.abspath(__file__))


def run_scrapy(spider_names: list):
    """运行 Scrapy Spider"""
    for name in spider_names:
        logger.info(f"启动 Scrapy Spider: {name}")
        cmd = [
            sys.executable, "-m", "scrapy", "crawl", name,
        ]
        try:
            result = subprocess.run(
                cmd, cwd=SCRAPY_PROJECT,
                capture_output=False,
            )
            if result.returncode != 0:
                logger.error(f"Spider '{name}' 执行失败 (exit={result.returncode})")
        except Exception as e:
            logger.error(f"Spider '{name}' 执行异常: {e}")


def run_all_news(sources: list = None):
    """运行所有新闻 Spider"""
    names = sources or ENABLED_CRAWLERS
    logger.info(f"开始爬取 {len(names)} 个新闻来源...")
    run_scrapy(names)

    # 打印统计
    show_stats()


def run_all_video(platforms: list = None):
    """运行所有视频 Spider"""
    names = platforms or ENABLED_VIDEO_CRAWLERS
    logger.info(f"开始爬取 {len(names)} 个视频平台...")
    run_scrapy(names)

    show_video_stats()


def show_stats(opc_only=False):
    """显示统计信息"""
    if opc_only:
        from storage.manager import OPCStorageManager
        storage = OPCStorageManager()
        stats = storage.get_stats()
        db_name = "opc.db (一人公司)"
    else:
        from storage.manager import StorageManager
        storage = StorageManager()
        stats = storage.get_stats()
        db_name = "finance.db (财经)"

    print("\n" + "=" * 60)
    print(f"  数据库: {db_name}")
    print("=" * 60)
    print(f"  总新闻数:  {stats['total']}")
    if not opc_only:
        print(f"  视频创作者: {stats.get('video_creators_total', 0)}")
    print(f"  最新新闻:  {stats['newest_time'] or 'N/A'}")
    print("-" * 60)
    for s in stats.get("sources", []):
        print(f"  {s['source']:<16} {s['count']:>6}  {s['latest'] or 'N/A':>20}")
    print("=" * 60)

    # 如果是全量统计，同时显示OPC库
    if not opc_only:
        try:
            from storage.manager import OPCStorageManager
            opc = OPCStorageManager()
            opc_stats = opc.get_stats()
            if opc_stats['total'] > 0:
                print(f"\n  OPC数据库 (opc.db): {opc_stats['total']} 条")
                for s in opc_stats.get("sources", []):
                    print(f"    {s['source']:<14} {s['count']:>6}")
        except Exception:
            pass


def show_video_stats():
    """显示视频统计"""
    from storage.manager import StorageManager
    storage = StorageManager()
    creators = storage.get_video_creators(limit=100)
    print(f"\n视频创作者 ({len(creators)} 位):")
    print("-" * 80)
    for c in creators[:20]:
        platform_name = "B站" if c.platform == "bilibili" else "抖音"
        print(f"[{platform_name}] {c.creator_name}  粉丝:{c.follower_count or 'N/A'}")
        print(f"  主页: {c.homepage_url}")
        print(f"  视频: {c.video_title}")


def search_news(keyword: str, limit: int = 50, opc=False):
    """搜索新闻"""
    if opc:
        from storage.manager import OPCStorageManager
        storage = OPCStorageManager()
        db_label = "OPC库 (opc.db)"
    else:
        from storage.manager import StorageManager
        storage = StorageManager()
        db_label = "财经库 (finance.db)"

    articles = storage.search(keyword, limit=limit)

    print(f"\n{db_label} 搜索: '{keyword}' ({len(articles)} 条)")
    print("-" * 80)
    for a in articles:
        print(f"[{a.source}] {a.title}")
        print(f"  URL: {a.url}")
        print("-" * 80)


def search_video(keyword: str, limit: int = 50):
    """搜索视频创作者"""
    from storage.manager import StorageManager
    storage = StorageManager()
    creators = storage.search_video_creators(keyword, limit=limit)

    print(f"\n视频创作者搜索: '{keyword}' ({len(creators)} 位)")
    print("-" * 80)
    for c in creators:
        platform_name = "B站" if c.platform == "bilibili" else "抖音"
        print(f"[{platform_name}] {c.creator_name}")
        print(f"  主页: {c.homepage_url}")
        print(f"  视频: {c.video_title}")
        print("-" * 80)


def export_data(fmt: str, source: str = None):
    """导出新闻数据"""
    from export.exporter import Exporter
    exporter = Exporter()
    if fmt == "json":
        path = exporter.to_json(source=source)
    elif fmt == "csv":
        path = exporter.to_csv(source=source)
    else:
        logger.error(f"不支持的格式: {fmt}")
        return
    print(f"导出完成: {path}")


def export_video_data(fmt: str, platform: str = None):
    """导出视频创作者数据"""
    from export.exporter import Exporter
    exporter = Exporter()
    if fmt == "json":
        path = exporter.video_to_json(platform=platform)
    elif fmt == "csv":
        path = exporter.video_to_csv(platform=platform)
    else:
        logger.error(f"不支持的格式: {fmt}")
        return
    print(f"导出完成: {path}")


def init_database():
    """初始化数据库"""
    from models.database import init_database as init_db
    init_db()
    logger.info("数据库初始化完成！")

    try:
        from models.database import engine
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
            logger.info("数据库连接验证成功")
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")


def run_schedule():
    """启动定时调度（保留 APScheduler）"""
    from scheduler import CrawlScheduler
    sched = CrawlScheduler()
    sched.start()

    stop_event = asyncio.Event()

    def _handler(sig, frame):
        logger.info("收到退出信号...")
        stop_event.set()

    signal.signal(signal.SIGINT, _handler)
    signal.signal(signal.SIGTERM, _handler)

    try:
        asyncio.get_event_loop().run_until_complete(stop_event.wait())
    finally:
        asyncio.get_event_loop().run_until_complete(sched.shutdown())


def main():
    parser = argparse.ArgumentParser(
        description="财经新闻爬虫 (Scrapy版) - 财经+OPC双数据库",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python run.py --once                         单次爬取（自动分流财经/OPC）
  python run.py --once --source eastmoney      只爬取东方财富
  python run.py --video                        爬取B站+抖音创作者
  python run.py --all                          同时爬取新闻+视频
  python run.py --schedule                     启动定时调度
  python run.py --stats                        查看财经库统计
  python run.py --stats --opc                  查看OPC库统计
  python run.py --search "降息"                搜索财经库
  python run.py --search "一人公司" --opc      搜索OPC库
  python run.py --export json                  导出财经库
  python run.py --export json --opc            导出OPC库
  python run.py --export json                  导出新闻JSON
  python run.py --export-video json            导出视频创作者JSON
  python run.py --init-db                      初始化数据库
        """,
    )

    parser.add_argument("--once", action="store_true", help="单次爬取所有新闻来源")
    parser.add_argument("--source", type=str, help="指定爬取来源（逗号分隔）")
    parser.add_argument("--video", action="store_true", help="爬取视频平台创作者")
    parser.add_argument("--platform", type=str, help="指定视频平台（bilibili/douyin）")
    parser.add_argument("--all", action="store_true", help="同时爬取新闻+视频")
    parser.add_argument("--schedule", action="store_true", help="启动定时调度器")
    parser.add_argument("--stats", action="store_true", help="显示统计信息")
    parser.add_argument("--opc", action="store_true", help="操作OPC数据库（配合--stats/--search/--export使用）")
    parser.add_argument("--search", type=str, metavar="KEYWORD", help="关键词搜索新闻")
    parser.add_argument("--search-video", type=str, metavar="KEYWORD", help="搜索视频创作者")
    parser.add_argument("--export", type=str, choices=["json", "csv"], help="导出新闻")
    parser.add_argument("--export-video", type=str, choices=["json", "csv"], help="导出视频创作者")
    parser.add_argument("--init-db", action="store_true", help="初始化数据库表")

    args = parser.parse_args()

    if args.init_db:
        init_database()
        return

    if args.stats:
        init_database()
        show_stats(opc_only=args.opc)
        return

    if args.search:
        init_database()
        search_news(args.search, opc=args.opc)
        return

    if args.search_video:
        init_database()
        search_video(args.search_video)
        return

    if args.export:
        init_database()
        export_data(args.export)
        return

    if args.export_video:
        init_database()
        export_video(args.export_video)
        return

    if args.once:
        sources = None
        if args.source:
            sources = [s.strip() for s in args.source.split(",")]
            invalid = [s for s in sources if s not in ENABLED_CRAWLERS]
            if invalid:
                logger.error(f"未知来源: {invalid}")
                logger.info(f"可用: {', '.join(ENABLED_CRAWLERS)}")
                return
        init_database()
        run_all_news(sources)
        return

    if args.video:
        platforms = None
        if args.platform:
            platforms = [p.strip() for p in args.platform.split(",")]
            invalid = [p for p in platforms if p not in ENABLED_VIDEO_CRAWLERS]
            if invalid:
                logger.error(f"未知平台: {invalid}")
                return
        init_database()
        run_all_video(platforms)
        return

    if args.all:
        sources = None
        platforms = None
        if args.source:
            sources = [s.strip() for s in args.source.split(",")]
        if args.platform:
            platforms = [p.strip() for p in args.platform.split(",")]
        init_database()
        run_all_news(sources)
        run_all_video(platforms)
        return

    if args.schedule:
        init_database()
        run_schedule()
        return

    parser.print_help()


if __name__ == "__main__":
    main()
