"""Application settings, loaded from the repo `.env` (reuses the ETL keys)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from scripts.paths import ROOT


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Supabase ---
    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")

    # --- Admin ---
    admin_api_key: str = Field(default="", alias="ADMIN_API_KEY")

    # --- Cloudflare Turnstile (captcha on the public report endpoint) ---
    # When empty, captcha verification is skipped (local dev). Set in any
    # environment where the report endpoint is publicly reachable.
    turnstile_secret_key: str = Field(default="", alias="TURNSTILE_SECRET_KEY")

    # --- Medication source ('cache' = Postgres-backed typeahead) ---
    med_data_source: str = Field(default="cache", alias="MED_DATA_SOURCE")

    # --- Proximity search tuning ---
    default_radius_km: float = 5.0
    min_radius_km: float = 1.0
    max_radius_km: float = 20.0
    default_page_size: int = 25
    max_page_size: int = 100

    # --- CORS (comma-separated origins; '*' allows all) ---
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    @property
    def base_url(self) -> str:
        """Supabase base URL the python client expects (no trailing /rest/v1)."""
        return self.supabase_url.rstrip("/").removesuffix("/rest/v1")

    @property
    def cors_origin_list(self) -> list[str]:
        raw = (self.cors_origins or "").strip()
        if not raw or raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
