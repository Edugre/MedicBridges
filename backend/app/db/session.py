from collections.abc import AsyncIterator
from urllib.parse import urlsplit, urlunsplit, parse_qsl

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import get_settings


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


settings = get_settings()
_url, _connect_args = _prepare_asyncpg_url(settings.database_url)

engine = create_async_engine(
    _url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session