from fastapi import APIRouter, Depends, Query

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreateGuestInput, UpdateGuestInput
from app.services.audit import write_audit_log
from app.services.table_service import create_row, delete_row, get_row, list_rows, update_row

router = APIRouter(tags=["Guests"])


@router.get("/guests")
def list_guests(
    org_id: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    return {"data": list_rows("guests", {"organization_id": org_id}, limit=limit)}


@router.post("/guests", status_code=201)
def create_guest(payload: CreateGuestInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin", "operator"})
    created = create_row("guests", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="guests",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/guests/{guest_id}")
def get_guest(guest_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("guests", guest_id)
    assert_org_member(user_id, record["organization_id"])
    return record


@router.patch("/guests/{guest_id}")
def update_guest(guest_id: str, payload: UpdateGuestInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("guests", guest_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})
    updated = update_row("guests", guest_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="guests",
        entity_id=guest_id,
        before_state=record,
        after_state=updated,
    )
    return updated


@router.delete("/guests/{guest_id}")
def delete_guest(guest_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("guests", guest_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})
    deleted = delete_row("guests", guest_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="guests",
        entity_id=guest_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted
