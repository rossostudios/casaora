from fastapi import HTTPException

from app.core.config import settings


def ensure_marketplace_public_enabled() -> None:
    if settings.marketplace_public_enabled:
        return
    raise HTTPException(status_code=404, detail="Marketplace public endpoints are disabled.")


def ensure_applications_pipeline_enabled() -> None:
    if settings.applications_pipeline_enabled:
        return
    raise HTTPException(status_code=403, detail="Applications pipeline is disabled.")


def ensure_lease_collections_enabled() -> None:
    if settings.lease_collections_enabled:
        return
    raise HTTPException(status_code=403, detail="Lease collections endpoints are disabled.")
