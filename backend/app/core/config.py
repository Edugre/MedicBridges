import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


def _env_file_for(app_env: str) -> Path:
    return REPO_ROOT / f".env.{app_env}"


class Settings(BaseSettings):
    app_env: str = Field(default="local")
    database_url: str
    database_url_direct: str
    include_env_in_healthz: bool | None = Field(
        default=None,
        description=(
            "If set, controls whether GET /healthz includes app_env. "
            "If unset, app_env is included only when app_env is not 'production'."
        ),
    )

    model_config = SettingsConfigDict(
        env_file=_env_file_for(os.environ.get("APP_ENV", "local")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


def healthz_includes_app_env(settings: Settings) -> bool:
    """Whether /healthz should expose app_env (see include_env_in_healthz)."""
    if settings.include_env_in_healthz is not None:
        return settings.include_env_in_healthz
    return settings.app_env != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()