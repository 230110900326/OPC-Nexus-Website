from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "opc-crawler"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    redis_url: str = "redis://localhost:6379/0"
    request_timeout_seconds: float = 10.0
    allowed_domains: str = "127.0.0.1,localhost"
    local_test_page_url: str = "http://127.0.0.1:8099/article.html"
    scheduler_enabled: bool = False
    schedule_minutes: int = 30
    model_config = SettingsConfigDict(env_file="../../.env", env_prefix="CRAWLER_", extra="ignore")


settings = Settings()
