from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.core.auth import require_supabase_user
from app.core.tenancy import (
    assert_org_member,
    assert_org_role,
    ensure_app_user,
    ensure_org_membership,
    get_org_membership,
    list_user_org_ids,
    list_user_organizations,
)
from app.db.supabase import get_supabase_client
from app.schemas.domain import (
    AcceptOrganizationInviteInput,
    CreateOrganizationInput,
    CreateOrganizationInviteInput,
    CreateOrganizationMemberInput,
    UpdateOrganizationInput,
    UpdateOrganizationMemberInput,
)
from app.services.audit import write_audit_log
from app.services.table_service import create_row, delete_row, get_row, list_rows, update_row

router = APIRouter(tags=["Organizations"])


@router.get("/organizations")
def list_organizations(
    org_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    user=Depends(require_supabase_user),
) -> dict:
    ensure_app_user(user)

    if org_id:
        assert_org_member(user.id, org_id)
        return {"data": [get_row("organizations", org_id)]}

    organizations = list_user_organizations(user.id)
    # Keep parity with other list endpoints.
    return {"data": organizations[:limit]}


@router.post("/organizations", status_code=201)
def create_organization(payload: CreateOrganizationInput, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    record = payload.model_dump(exclude_none=True)
    record["owner_user_id"] = user.id
    org = create_row("organizations", record)
    ensure_org_membership(org["id"], user.id, role="owner_admin", is_primary=True)
    write_audit_log(
        organization_id=org.get("id"),
        actor_user_id=user.id,
        action="create",
        entity_name="organizations",
        entity_id=org.get("id"),
        before_state=None,
        after_state=org,
    )
    return org


@router.get("/organizations/{org_id}")
def get_organization(org_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_member(user.id, org_id)
    return get_row("organizations", org_id)


@router.patch("/organizations/{org_id}")
def update_organization(org_id: str, payload: UpdateOrganizationInput, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    org = get_row("organizations", org_id)
    if org.get("owner_user_id") != user.id:
        raise HTTPException(status_code=403, detail="Forbidden: only the organization owner can update it.")
    updated = update_row("organizations", org_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="update",
        entity_name="organizations",
        entity_id=org_id,
        before_state=org,
        after_state=updated,
    )
    return updated


@router.delete("/organizations/{org_id}")
def delete_organization(org_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    org = get_row("organizations", org_id)
    if org.get("owner_user_id") != user.id:
        raise HTTPException(status_code=403, detail="Forbidden: only the organization owner can delete it.")
    deleted = delete_row("organizations", org_id)
    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="delete",
        entity_name="organizations",
        entity_id=org_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted


@router.get("/organizations/{org_id}/invites")
def list_invites(org_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    invites = list_rows(
        "organization_invites",
        {"organization_id": org_id},
        limit=200,
        order_by="created_at",
        ascending=False,
    )
    return {"data": invites}


@router.post("/organizations/{org_id}/invites", status_code=201)
def create_invite(
    org_id: str,
    payload: CreateOrganizationInviteInput,
    user=Depends(require_supabase_user),
) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    days = payload.expires_in_days if payload.expires_in_days is not None else 14
    if days <= 0 or days > 180:
        raise HTTPException(status_code=400, detail="expires_in_days must be between 1 and 180.")

    record = {
        "organization_id": org_id,
        "email": str(payload.email).strip(),
        "role": payload.role,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=int(days))).isoformat(),
        "created_by_user_id": user.id,
        "status": "pending",
    }

    try:
        created = create_row("organization_invites", record)
    except HTTPException as exc:
        message = str(exc.detail or "")
        if exc.status_code == 502 and (
            "idx_org_invites_unique_pending_email" in message
            or "duplicate key value" in message
            or "unique" in message.lower()
        ):
            raise HTTPException(status_code=409, detail="An invite is already pending for this email.") from exc
        raise

    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="create",
        entity_name="organization_invites",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.delete("/organizations/{org_id}/invites/{invite_id}")
def revoke_invite(org_id: str, invite_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    existing = get_row("organization_invites", invite_id)
    if existing.get("organization_id") != org_id:
        raise HTTPException(status_code=404, detail="organization_invites record not found.")

    if existing.get("status") != "pending":
        return existing

    patch = {
        "status": "revoked",
        "revoked_at": datetime.now(timezone.utc).isoformat(),
        "revoked_by_user_id": user.id,
    }
    updated = update_row("organization_invites", invite_id, patch)

    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="delete",
        entity_name="organization_invites",
        entity_id=invite_id,
        before_state=existing,
        after_state=updated,
    )

    return updated


@router.post("/organization-invites/accept")
def accept_invite(payload: AcceptOrganizationInviteInput, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)

    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="token is required.")

    try:
        client = get_supabase_client()
        resp = (
            client.table("organization_invites")
            .select("*")
            .eq("token", token)
            .limit(1)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invite not found.")

    invite = rows[0]
    invite_id = str(invite.get("id") or "")

    if invite.get("status") != "pending":
        raise HTTPException(status_code=409, detail="Invite is no longer pending.")

    invite_email = str(invite.get("email") or "").strip().lower()
    user_email = str(getattr(user, "email", "") or "").strip().lower()
    if invite_email and user_email and invite_email != user_email:
        raise HTTPException(status_code=403, detail="Forbidden: this invite was issued to a different email.")

    expires_at_raw = invite.get("expires_at")
    if isinstance(expires_at_raw, str) and expires_at_raw.strip():
        try:
            normalized = expires_at_raw.strip()
            if normalized.endswith("Z"):
                normalized = f"{normalized[:-1]}+00:00"
            expires_at = datetime.fromisoformat(normalized)
            if expires_at < datetime.now(timezone.utc):
                try:
                    update_row("organization_invites", invite_id, {"status": "expired"})
                except Exception:
                    pass
                raise HTTPException(status_code=410, detail="Invite has expired.")
        except HTTPException:
            raise
        except Exception:
            # If parsing fails we treat it as not expired (best-effort).
            pass

    org_id = str(invite.get("organization_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=500, detail="Invite is missing organization_id.")

    is_primary = len(list_user_org_ids(user.id)) == 0
    ensure_org_membership(
        org_id=org_id,
        user_id=user.id,
        role=str(invite.get("role") or "operator"),
        is_primary=is_primary,
    )

    membership = get_org_membership(user_id=user.id, org_id=org_id)
    patch = {
        "status": "accepted",
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "accepted_by_user_id": user.id,
    }
    updated_invite = update_row("organization_invites", invite_id, patch)

    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="accept",
        entity_name="organization_invites",
        entity_id=invite_id,
        before_state=invite,
        after_state=updated_invite,
    )

    return {
        "organization_id": org_id,
        "membership": membership,
        "invite": updated_invite,
    }


@router.get("/organizations/{org_id}/members")
def list_members(org_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_member(user.id, org_id)

    try:
        client = get_supabase_client()
        resp = (
            client.table("organization_members")
            .select(
                "organization_id,user_id,role,is_primary,joined_at,created_at,updated_at,app_users(id,email,full_name)"
            )
            .eq("organization_id", org_id)
            .limit(200)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    return {"data": resp.data or []}


@router.post("/organizations/{org_id}/members", status_code=201)
def add_member(org_id: str, payload: CreateOrganizationMemberInput, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    # Ensure the target user exists in app_users (membership FK depends on it).
    get_row("app_users", payload.user_id)

    ensure_org_membership(
        org_id=org_id,
        user_id=payload.user_id,
        role=payload.role,
        is_primary=payload.is_primary,
    )

    created = get_org_membership(user_id=payload.user_id, org_id=org_id)
    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="create",
        entity_name="organization_members",
        entity_id=payload.user_id,
        before_state=None,
        after_state=created,
    )

    return created or {"organization_id": org_id, **payload.model_dump(exclude_none=True)}


@router.patch("/organizations/{org_id}/members/{member_user_id}")
def update_member(
    org_id: str,
    member_user_id: str,
    payload: UpdateOrganizationMemberInput,
    user=Depends(require_supabase_user),
) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    org = get_row("organizations", org_id)
    if org.get("owner_user_id") == member_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot update the organization owner membership.")

    existing = get_org_membership(user_id=member_user_id, org_id=org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="organization_members record not found.")

    patch = payload.model_dump(exclude_none=True)
    if not patch:
        return existing

    try:
        client = get_supabase_client()
        resp = (
            client.table("organization_members")
            .update(patch)
            .eq("organization_id", org_id)
            .eq("user_id", member_user_id)
            .execute()
        )
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    updated_rows = resp.data or []
    updated = updated_rows[0] if updated_rows else get_org_membership(user_id=member_user_id, org_id=org_id) or existing

    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="update",
        entity_name="organization_members",
        entity_id=member_user_id,
        before_state=existing,
        after_state=updated,
    )

    return updated


@router.delete("/organizations/{org_id}/members/{member_user_id}")
def delete_member(org_id: str, member_user_id: str, user=Depends(require_supabase_user)) -> dict:
    ensure_app_user(user)
    assert_org_role(user.id, org_id, {"owner_admin"})

    org = get_row("organizations", org_id)
    if org.get("owner_user_id") == member_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: cannot remove the organization owner.")

    existing = get_org_membership(user_id=member_user_id, org_id=org_id)
    if not existing:
        raise HTTPException(status_code=404, detail="organization_members record not found.")

    # Safety: avoid removing the last owner_admin.
    if existing.get("role") == "owner_admin":
        owners = list_rows(
            "organization_members",
            {"organization_id": org_id, "role": "owner_admin"},
            limit=50,
        )
        if len(owners) <= 1:
            raise HTTPException(status_code=409, detail="Cannot remove the last owner_admin from the organization.")

    try:
        client = get_supabase_client()
        client.table("organization_members").delete().eq("organization_id", org_id).eq("user_id", member_user_id).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    write_audit_log(
        organization_id=org_id,
        actor_user_id=user.id,
        action="delete",
        entity_name="organization_members",
        entity_id=member_user_id,
        before_state=existing,
        after_state=None,
    )

    return existing
