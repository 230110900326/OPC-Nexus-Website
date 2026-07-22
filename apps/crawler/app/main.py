import logging
import secrets
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from .api_client import ApiClient
from .config import settings
from .runtime import CrawlRunner

logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)
runner = CrawlRunner(settings, ApiClient(settings.api_url, settings.api_token, settings.request_timeout_seconds))


class RunRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    source_id: str | None = Field(default=None, alias="sourceId")


def require_crawler_token(x_crawler_token: str | None = Header(default=None)) -> None:
    if not settings.api_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="crawler API token is not configured")
    if not x_crawler_token or not secrets.compare_digest(x_crawler_token, settings.api_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="crawler API token is invalid")


def run_scheduled_crawl() -> None:
    try:
        result = runner.run()
        logger.info("crawler_daily_run_completed result=%s", result)
    except Exception:
        logger.exception("crawler_daily_run_failed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("crawler_service_started service=%s", settings.service_name)
    scheduler: BackgroundScheduler | None = None
    if settings.scheduler_enabled:
        if not settings.api_token:
            logger.error("crawler_scheduler_disabled_missing_api_token")
        else:
            scheduler = BackgroundScheduler(timezone=settings.timezone)
            scheduler.add_job(run_scheduled_crawl, "cron", hour=settings.schedule_hour, minute=settings.schedule_minute, id="daily-authorized-source-crawl", replace_existing=True)
            scheduler.start()
            logger.info("crawler_daily_scheduler_started hour=%s minute=%s timezone=%s", settings.schedule_hour, settings.schedule_minute, settings.timezone)
    yield
    if scheduler:
        scheduler.shutdown(wait=False)
    runner.http.close()
    runner.api.client.close()
    logger.info("crawler_service_stopped service=%s", settings.service_name)


app = FastAPI(title="OPC Crawler", version="0.2.0", lifespan=lifespan)


@app.get("/health")
async def health_check() -> dict:
    return {"success": True, "data": {"service": settings.service_name, "status": "ok", "schedulerEnabled": settings.scheduler_enabled, "schedule": f"{settings.schedule_hour:02d}:{settings.schedule_minute:02d} {settings.timezone}"}}


@app.post("/runs", dependencies=[Depends(require_crawler_token)])
async def run_now(input: RunRequest) -> dict:
    try:
        return {"success": True, "data": runner.run(input.source_id)}
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except Exception as error:
        logger.exception("crawler_manual_run_failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="crawler run failed") from error
