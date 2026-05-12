"""
Integration test fixtures.

Requires a .env.test file at the repo root with:
    DATABASE_URL=postgresql+asyncpg://...
    DATABASE_URL_DIRECT=postgresql+psycopg://...

The test DB must have the postgis and pg_trgm extensions enabled.
"""
import asyncio
import os
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.db.session as _session_mod
from app.core.config import get_settings
from app.main import app as fastapi_app

# Tables truncated between tests; order avoids FK violations.
_TABLES = ["raw_hrsa_sites", "sites", "organizations", "ingest_runs"]

# ---------------------------------------------------------------------------
# Sample CSV content shared across ingest / transform tests.
# Two orgs, three sites, all with valid geocoords.
# ---------------------------------------------------------------------------
SAMPLE_CSV_CONTENT = (
    "Health Center Name,"
    "BHCMIS Organization Identification Number,"
    "BPHC Assigned Number,"
    "Site Name,Site Address,Site City,Site State Abbreviation,"
    "Site Postal Code,Site Telephone Number,FQHC Site NPI Number,"
    "Geocoding Artifact Address Primary X Coordinate,"
    "Geocoding Artifact Address Primary Y Coordinate,\n"
    "Clinic Alpha,ORG001,SITE001,Alpha Main,"
    "123 Main St,Springfield,IL,62701,217-555-0100,1111111111,-89.6501,39.7817,\n"
    "Clinic Alpha,ORG001,SITE002,Alpha East,"
    "456 Oak Ave,Springfield,IL,62702,217-555-0200,2222222222,-89.6100,39.8000,\n"
    "Clinic Beta,ORG002,SITE003,Beta Central,"
    "789 Pine Rd,Chicago,IL,60601,312-555-0300,3333333333,-87.6298,41.8781,\n"
)


@pytest.fixture(scope="session")
def sample_csv(tmp_path_factory) -> Path:
    p = tmp_path_factory.mktemp("data") / "Health_Center_Service_Delivery_and_LookAlike_Sites.csv"
    p.write_text(SAMPLE_CSV_CONTENT)
    return p


# ---------------------------------------------------------------------------
# Session-scoped DB setup: migrations + engine patch.
# Uses a sync fixture so the event loop has no scope constraints here.
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    from alembic import command
    from alembic.config import Config
    from app.db.session import _prepare_asyncpg_url

    os.environ.setdefault("APP_ENV", "test")
    get_settings.cache_clear()
    settings = get_settings()

    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", settings.database_url_direct)
    command.upgrade(cfg, "head")

    url, connect_args = _prepare_asyncpg_url(settings.database_url)
    engine = create_async_engine(url, connect_args=connect_args, pool_pre_ping=True)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    _session_mod._engine = engine
    _session_mod._session_factory = maker

    yield

    asyncio.run(engine.dispose())
    _session_mod._engine = None
    _session_mod._session_factory = None
    get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Function-scoped fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
async def _truncate_tables():
    """Wipe all data tables before each test for isolation."""
    engine = _session_mod.get_engine()
    async with engine.connect() as conn:
        for table in _TABLES:
            await conn.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
        await conn.commit()


@pytest.fixture
async def db_session() -> AsyncSession:
    async with _session_mod.SessionLocal() as session:
        yield session


@pytest.fixture
async def http_client() -> AsyncClient:
    async with AsyncClient(
        transport=ASGITransport(app=fastapi_app), base_url="http://test"
    ) as client:
        yield client
