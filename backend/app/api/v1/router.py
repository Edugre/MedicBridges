from fastapi import APIRouter

from app.api.v1.organizations import router as organizations_router
from app.api.v1.sites import router as sites_router

router = APIRouter(prefix="/api/v1")

router.include_router(sites_router)
router.include_router(organizations_router)
