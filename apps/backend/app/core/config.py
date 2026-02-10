from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Puerta Abierta API"
    environment: str = "development"
    api_prefix: str = "/v1"
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    default_org_id: Optional[str] = None
    default_user_id: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [value.strip() for value in self.cors_origins.split(",") if value.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
