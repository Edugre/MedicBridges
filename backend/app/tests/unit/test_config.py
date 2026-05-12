import pytest
from app.core.config import Settings, healthz_includes_app_env


def _settings(app_env: str = "local", include_env_in_healthz: bool | None = None) -> Settings:
    return Settings.model_construct(
        app_env=app_env,
        database_url="postgresql+asyncpg://x",
        database_url_direct="postgresql+psycopg://x",
        include_env_in_healthz=include_env_in_healthz,
    )


def test_explicit_true_overrides_production():
    assert healthz_includes_app_env(_settings("production", True)) is True


def test_explicit_false_overrides_local():
    assert healthz_includes_app_env(_settings("local", False)) is False


def test_default_local_shows_env():
    assert healthz_includes_app_env(_settings("local")) is True


def test_default_staging_shows_env():
    assert healthz_includes_app_env(_settings("staging")) is True


def test_default_production_hides_env():
    assert healthz_includes_app_env(_settings("production")) is False
