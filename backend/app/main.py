from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, healthz_includes_app_env
from app.db.session import dispose_engine, get_db
from app.routers.review import router as review_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await dispose_engine()


app = FastAPI(title="MedicBridges API", lifespan=lifespan)

app.include_router(review_router)

_REVIEW_DIST = Path(__file__).resolve().parents[2] / "frontend" / "review" / "dist"
if _REVIEW_DIST.exists():
    app.mount("/review-ui", StaticFiles(directory=_REVIEW_DIST, html=True), name="review-ui")


@app.get("/healthz")
async def healthz():
    settings = get_settings()
    payload: dict[str, str] = {"status": "ok"}
    if healthz_includes_app_env(settings):
        payload["env"] = settings.app_env
    return payload


@app.get("/healthz/db")
async def healthz_db(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    return {"db": result.scalar_one()}
