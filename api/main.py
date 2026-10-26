"""MedicBridges API entrypoint: app factory, CORS, error contract, router mounts.

Run locally:  uvicorn api.main:app --reload
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api import __version__
from api.config import get_settings
from api.errors import APIError, InvalidCoordinatesError
from api.routers import admin, clinic_registrations, medications, reports, resources
from api.schemas.common import HealthResponse

# App loggers (e.g. clinic registration emails) inherit this; uvicorn's own
# loggers don't propagate to root, so nothing is logged twice.
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="MedicBridges API",
    version=__version__,
    description=(
        "Proximity discovery for FQHC clinics and 340B contract pharmacies, "
        "medication reference, and ingestion monitoring."
    ),
)

_settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(APIError)
async def handle_api_error(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_body())


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Surface coordinate problems with the agreed error code; everything else is a
    # generic validation failure (still never a 500).
    errors = exc.errors()
    fields = {str(loc[-1]) for err in errors for loc in [err.get("loc", [])] if loc}
    if {"lat", "lon"} & fields:
        body = InvalidCoordinatesError("lat and lon must be valid numbers").to_body()
        return JSONResponse(status_code=422, content=body)
    # jsonable_encoder strips non-serializable bits (e.g. the ValueError object
    # Pydantic tucks into `ctx` when a model/field validator raises) so the
    # response never fails to render.
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_request", "detail": jsonable_encoder(errors)},
    )


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health() -> HealthResponse:
    return HealthResponse(
        version=__version__,
        supabase_configured=bool(_settings.base_url and _settings.supabase_anon_key),
        email_configured=bool(
            _settings.resend_api_key and _settings.clinic_registration_notify_email
        ),
    )


app.include_router(resources.router)
app.include_router(resources.catalog_router)
app.include_router(medications.router)
app.include_router(reports.router)
app.include_router(clinic_registrations.router)
app.include_router(admin.router)
