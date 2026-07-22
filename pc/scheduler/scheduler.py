"""
定时调度器 - 基于 APScheduler
支持新闻 + 视频平台定时爬取
"""

import asyncio
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from config import CRAWL_INTERVAL_MINUTES, ENABLED_CRAWLERS, ENABLED_VIDEO_CRAWLERS
from crawlers import CRAWLER_REGISTRY, VIDEO_CRAWLER_REGISTRY
from storage.manager import StorageManager


class CrawlScheduler:
    """爬虫定时调度器"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler(
            timezone="Asia/Shanghai",
            job_defaults={
                "coalesce": True,      # 合并错过的任务
                "max_instances": 1,    # 同一任务最多1个实例
                "misfire_grace_time": 60,  # 错过60秒内仍执行
            },
        )
        self.storage = StorageManager()

    async def _run_all_crawlers(self):
        """执行所有启用的新闻爬虫"""
        logger.info("=" * 60)
        logger.info(f"定时任务(新闻)开始 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)

        total_inserted = 0

        for name in ENABLED_CRAWLERS:
            crawler_cls = CRAWLER_REGISTRY.get(name)
            if not crawler_cls:
                logger.warning(f"爬虫 '{name}' 未注册，跳过")
                continue

            try:
                crawler = crawler_cls()
                items = await crawler.crawl()
                if items:
                    inserted = self.storage.bulk_upsert(items)
                    total_inserted += inserted
            except Exception as e:
                logger.error(f"爬虫 '{name}' 执行失败: {e}")

        logger.info("=" * 60)
        logger.info(f"定时任务(新闻)完成 - 本轮新增 {total_inserted} 条新闻")
        logger.info("=" * 60)

    async def _run_video_crawlers(self):
        """执行所有启用的视频爬虫"""
        logger.info("=" * 60)
        logger.info(f"定时任务(视频)开始 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)

        total_inserted = 0

        for name in ENABLED_VIDEO_CRAWLERS:
            crawler_cls = VIDEO_CRAWLER_REGISTRY.get(name)
            if not crawler_cls:
                logger.warning(f"视频爬虫 '{name}' 未注册，跳过")
                continue

            try:
                crawler = crawler_cls()
                creators = await crawler.crawl()
                if creators:
                    inserted = self.storage.bulk_upsert_video_creators(creators)
                    total_inserted += inserted
                    logger.info(f"  [{crawler.source_name}] 爬取 {len(creators)} 位创作者，新增 {inserted} 位")
            except Exception as e:
                logger.error(f"视频爬虫 '{name}' 执行失败: {e}")

        logger.info("=" * 60)
        logger.info(f"定时任务(视频)完成 - 本轮新增 {total_inserted} 位创作者")
        logger.info("=" * 60)

    async def _close_http_client(self):
        """关闭共享HTTP客户端"""
        try:
            from crawlers.base import BaseCrawler
            await BaseCrawler.close_client()
        except Exception:
            pass

    def start(self):
        """启动定时调度"""
        interval_minutes = CRAWL_INTERVAL_MINUTES

        # 新闻爬取任务
        self.scheduler.add_job(
            self._run_all_crawlers,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="crawl_news",
            name="财经新闻全量爬取",
            next_run_time=datetime.now(),  # 启动后立即执行一次
        )

        # 视频爬取任务（频率减半，避免频繁请求视频平台）
        video_interval = max(interval_minutes * 2, 60)  # 至少60分钟
        self.scheduler.add_job(
            self._run_video_crawlers,
            trigger=IntervalTrigger(minutes=video_interval),
            id="crawl_video",
            name="视频平台创作者爬取",
            next_run_time=datetime.now(),  # 启动后也立即执行一次
        )

        self.scheduler.start()

        logger.info(f"定时调度已启动 - 新闻每 {interval_minutes} 分钟，视频每 {video_interval} 分钟")
        logger.info(f"启用的新闻爬虫 ({len(ENABLED_CRAWLERS)}): {', '.join(ENABLED_CRAWLERS)}")
        logger.info(f"启用的视频爬虫 ({len(ENABLED_VIDEO_CRAWLERS)}): {', '.join(ENABLED_VIDEO_CRAWLERS)}")

        # 打印下次执行时间
        for job_id in ["crawl_news", "crawl_video"]:
            job = self.scheduler.get_job(job_id)
            if job:
                logger.info(f"  {job.name} - 下次执行: {job.next_run_time}")

    def stop(self):
        """停止调度器"""
        self.scheduler.shutdown(wait=False)
        logger.info("定时调度已停止")

    async def shutdown(self):
        """完整关闭（调度器 + HTTP客户端）"""
        self.stop()
        await self._close_http_client()
