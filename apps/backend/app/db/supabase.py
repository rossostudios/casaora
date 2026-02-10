from functools import lru_cache

from fastapi import HTTPException
from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)

