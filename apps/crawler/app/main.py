import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings

logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("crawler_service_started service=%s", settings.service_name)
    yield
    logger.info("crawler_service_stopped service=%s", settings.service_name)


app = FastAPI(title="OPC Crawler", version="0.1.0", lifespan=lifespan)


@app.get("/health")
async def health_check() -> dict:
    return {"success": True, "data": {"service": settings.service_name, "status": "ok"}}
