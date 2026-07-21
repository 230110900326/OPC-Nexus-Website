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
    schedule_hour: int = 7
    schedule_minute: int = 30
    timezone: str = "Asia/Shanghai"
    max_items_per_source: int = 25
    api_url: str = "http://localhost:4000"
    api_token: str = ""
    user_agent: str = "OPC-Nexus-Crawler/1.0 (+https://opc-nexus.local)"
    intelligence_enabled: bool = True
    intelligence_provider: str = "none"
    intelligence_model: str = ""
    intelligence_base_url: str = ""
    intelligence_llm_scope: str = "candidates"
    intelligence_config_path: str = ""
    model_config = SettingsConfigDict(env_file="../../.env", env_prefix="CRAWLER_", extra="ignore")


settings = Settings()
