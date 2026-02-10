from fastapi import APIRouter, Depends

from app.core.auth import require_supabase_user
from app.core.tenancy import ensure_app_user, list_user_organizations
from app.services.table_service import list_rows

router = APIRouter(tags=["Identity"])


@router.get("/me")
def me(user=Depends(require_supabase_user)) -> dict:
    app_user = ensure_app_user(user)
    memberships = list_rows("organization_members", {"user_id": user.id}, limit=200)
    organizations = list_user_organizations(user.id)
    return {"user": app_user, "memberships": memberships, "organizations": organizations}
