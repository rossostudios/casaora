from typing import Any, Optional

from fastapi import HTTPException

from app.db.supabase import get_supabase_client


def get_org_membership(user_id: str, org_id: str) -> Optional[dict[str, Any]]:
    try:
        client = get_supabase_client()
        resp = (
            client.table("organization_members")
            .select("*")
            .eq("organization_id", org_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        return rows[0] if rows else None
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc


def ensure_app_user(user: Any) -> dict[str, Any]:
    """Ensure an auth user exists in app_users with the same UUID.

    We keep a separate app_users table for profile/locale fields while using
    Supabase Auth for authentication.
    """

    if not user or not getattr(user, "id", None):
        raise HTTPException(status_code=401, detail="Unauthorized: missing user.")

    email: Optional[str] = getattr(user, "email", None)
    if not email:
        raise HTTPException(status_code=400, detail="Supabase user is missing an email address.")

    metadata = getattr(user, "user_metadata", None) or {}
    full_name = (
        metadata.get("full_name")
        or metadata.get("name")
        or metadata.get("fullName")
        or email.split("@")[0]
        or "User"
    )

    payload = {"id": user.id, "email": email, "full_name": full_name}

    try:
        client = get_supabase_client()
        client.table("app_users").upsert(payload).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    return payload


def list_user_org_ids(user_id: str) -> list[str]:
    try:
        client = get_supabase_client()
        resp = client.table("organization_members").select("organization_id").eq("user_id", user_id).limit(500).execute()
        rows = resp.data or []
        return [row["organization_id"] for row in rows if row.get("organization_id")]
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc


def assert_org_member(user_id: str, org_id: str) -> dict[str, Any]:
    membership = get_org_membership(user_id=user_id, org_id=org_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden: not a member of this organization.")
    return membership


def assert_org_role(user_id: str, org_id: str, allowed_roles: set[str]) -> dict[str, Any]:
    membership = assert_org_member(user_id=user_id, org_id=org_id)
    role = membership.get("role")
    if role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: role '{role or 'unknown'}' is not allowed for this action.",
        )
    return membership


def ensure_org_membership(org_id: str, user_id: str, role: str = "owner_admin", is_primary: bool = True) -> None:
    try:
        client = get_supabase_client()
        # The table has a composite PK, so upsert is safe here.
        client.table("organization_members").upsert(
            {
                "organization_id": org_id,
                "user_id": user_id,
                "role": role,
                "is_primary": is_primary,
            }
        ).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc


def list_user_organizations(user_id: str) -> list[dict[str, Any]]:
    org_ids = list_user_org_ids(user_id)
    if not org_ids:
        return []

    try:
        client = get_supabase_client()
        resp = client.table("organizations").select("*").in_("id", org_ids).limit(500).execute()
        return resp.data or []
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc
