from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from urllib.parse import parse_qsl, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _prepare_asyncpg_url(url: str) -> tuple[str, dict]:
    """Strip libpq-style query params asyncpg doesn't understand and
    return (clean_url, connect_args)."""
    parts = urlsplit(url)
    qs = dict(parse_qsl(parts.query))
    connect_args: dict = {}
    if qs.pop("sslmode", None) in ("require", "verify-ca", "verify-full"):
        connect_args["ssl"] = True
    qs.pop("channel_binding", None)
    is_pooler = "-pooler" in (parts.hostname or "")
    if is_pooler:
        connect_args["statement_cache_size"] = 0
    new_query = "&".join(f"{k}={v}" for k, v in qs.items())
    return urlunsplit(parts._replace(query=new_query)), connect_args


def get_engine() -> AsyncEngine:
    """Return the shared async engine, creating it on first use."""
    global _engine, _session_factory
    if _engine is None:
        settings = get_settings()
        url, connect_args = _prepare_asyncpg_url(settings.database_url)
        _engine = create_async_engine(
            url,
            connect_args=connect_args,
            pool_pre_ping=True,
            echo=False,
        )
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


class _SessionLocalProxy:
    """Callable like async_sessionmaker so imports of SessionLocal() keep working."""

    def __call__(self, *args: Any, **kwargs: Any) -> AsyncSession:
        get_engine()
        assert _session_factory is not None  # set together with _engine in get_engine()
        return _session_factory(*args, **kwargs)


SessionLocal = _SessionLocalProxy()


async def dispose_engine() -> None:
    """Dispose the pooled connections and drop cached engine/session factory."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
