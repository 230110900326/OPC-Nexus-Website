import logging
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

from fastapi import FastAPI

from .config import settings
from .queue import LocalOnlyQueue

logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("crawler_service_started service=%s", settings.service_name)
    scheduler: BackgroundScheduler | None = None
    if settings.scheduler_enabled:
        queue = LocalOnlyQueue(settings.redis_url, set(settings.allowed_domains.split(",")), settings.request_timeout_seconds)
        scheduler = BackgroundScheduler()
        scheduler.add_job(queue.enqueue_local_page, "interval", minutes=settings.schedule_minutes, args=[settings.local_test_page_url], id="local-test-crawl", replace_existing=True)
        scheduler.add_job(lambda: logger.info("crawler_job_result result=%s", queue.run_once()), "interval", minutes=settings.schedule_minutes, id="local-test-worker", replace_existing=True)
        scheduler.start(); logger.info("crawler_scheduler_started local_test_page=%s", settings.local_test_page_url)
    yield
    if scheduler: scheduler.shutdown(wait=False)
    logger.info("crawler_service_stopped service=%s", settings.service_name)


app = FastAPI(title="OPC Crawler", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health_check() -> dict:
    return {"success": True, "data": {"service": settings.service_name, "status": "ok"}}
