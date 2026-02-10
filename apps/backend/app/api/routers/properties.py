from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreatePropertyInput, CreateUnitInput, UpdatePropertyInput, UpdateUnitInput
from app.services.audit import write_audit_log
from app.services.enrichment import enrich_units
from app.services.table_service import create_row, delete_row, get_row, list_rows, update_row

router = APIRouter(tags=["Properties", "Units"])


@router.get("/properties")
def list_properties(
    org_id: str = Query(...),
    status: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if status:
        filters["status"] = status
    return {"data": list_rows("properties", filters, limit=limit)}


@router.post("/properties", status_code=201)
def create_property(payload: CreatePropertyInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin"})
    created = create_row("properties", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="properties",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/properties/{property_id}")
def get_property(property_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("properties", property_id)
    assert_org_member(user_id, record["organization_id"])
    return record


@router.patch("/properties/{property_id}")
def update_property(property_id: str, payload: UpdatePropertyInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("properties", property_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    updated = update_row("properties", property_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="properties",
        entity_id=property_id,
        before_state=record,
        after_state=updated,
    )
    return updated

@router.delete("/properties/{property_id}")
def delete_property(property_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("properties", property_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    deleted = delete_row("properties", property_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="properties",
        entity_id=property_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted


@router.get("/units")
def list_units(
    org_id: str = Query(...),
    property_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if property_id:
        filters["property_id"] = property_id
    rows = list_rows("units", filters, limit=limit)
    return {"data": enrich_units(rows, org_id)}


@router.post("/units", status_code=201)
def create_unit(payload: CreateUnitInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin"})
    created = create_row("units", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="units",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/units/{unit_id}")
def get_unit(unit_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("units", unit_id)
    assert_org_member(user_id, record["organization_id"])
    return enrich_units([record], record["organization_id"])[0]


@router.patch("/units/{unit_id}")
def update_unit(unit_id: str, payload: UpdateUnitInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("units", unit_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    updated = update_row("units", unit_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="units",
        entity_id=unit_id,
        before_state=record,
        after_state=updated,
    )
    return updated


@router.delete("/units/{unit_id}")
def delete_unit(unit_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("units", unit_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    deleted = delete_row("units", unit_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="units",
        entity_id=unit_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted
