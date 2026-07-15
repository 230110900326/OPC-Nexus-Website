from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "opc-crawler"
    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "INFO"
    model_config = SettingsConfigDict(env_file="../../.env", env_prefix="CRAWLER_")


settings = Settings()
