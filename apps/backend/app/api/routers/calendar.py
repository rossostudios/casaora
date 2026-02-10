from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreateCalendarBlockInput, UpdateCalendarBlockInput
from app.services.audit import write_audit_log
from app.services.enrichment import enrich_calendar_blocks
from app.services.table_service import create_row, delete_row, get_row, list_rows, update_row

router = APIRouter(tags=["Calendar"])

ACTIVE_BOOKING_STATUSES = {"pending", "confirmed", "checked_in"}


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _overlaps(start_a: date, end_a: date, start_b: date, end_b: date) -> bool:
    return not (end_a <= start_b or start_a >= end_b)


@router.get("/calendar/availability")
def calendar_availability(
    org_id: str = Query(...),
    unit_id: str = Query(...),
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    window_start = _parse_date(from_date)
    window_end = _parse_date(to_date)
    unavailable: list[dict[str, str]] = []

    reservations = list_rows("reservations", {"organization_id": org_id, "unit_id": unit_id}, limit=1000)
    for reservation in reservations:
        if reservation.get("status") not in ACTIVE_BOOKING_STATUSES:
            continue
        start = _parse_date(reservation["check_in_date"])
        end = _parse_date(reservation["check_out_date"])
        if _overlaps(window_start, window_end, start, end):
            unavailable.append({"from": reservation["check_in_date"], "to": reservation["check_out_date"]})

    blocks = list_rows("calendar_blocks", {"organization_id": org_id, "unit_id": unit_id}, limit=1000)
    for block in blocks:
        start = _parse_date(block["starts_on"])
        end = _parse_date(block["ends_on"])
        if _overlaps(window_start, window_end, start, end):
            unavailable.append({"from": block["starts_on"], "to": block["ends_on"]})

    unavailable = sorted(unavailable, key=lambda p: (p["from"], p["to"]))
    return {"unit_id": unit_id, "from": from_date, "to": to_date, "unavailable_periods": unavailable}


@router.get("/calendar/blocks")
def list_calendar_blocks(
    org_id: str = Query(...),
    unit_id: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if unit_id:
        filters["unit_id"] = unit_id
    rows = list_rows("calendar_blocks", filters, limit=limit, order_by="starts_on", ascending=True)
    return {"data": enrich_calendar_blocks(rows, org_id)}


@router.post("/calendar/blocks", status_code=201)
def create_calendar_block(payload: CreateCalendarBlockInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin", "operator"})
    starts_on = _parse_date(payload.starts_on)
    ends_on = _parse_date(payload.ends_on)
    if ends_on <= starts_on:
        raise HTTPException(status_code=400, detail="ends_on must be later than starts_on.")

    # Lightweight overlap protection before insert.
    existing_blocks = list_rows(
        "calendar_blocks",
        {"organization_id": payload.organization_id, "unit_id": payload.unit_id},
        limit=1000,
    )
    for block in existing_blocks:
        start = _parse_date(block["starts_on"])
        end = _parse_date(block["ends_on"])
        if _overlaps(starts_on, ends_on, start, end):
            raise HTTPException(status_code=409, detail="Calendar block overlaps an existing block.")

    created = create_row("calendar_blocks", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="calendar_blocks",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/calendar/blocks/{block_id}")
def get_calendar_block(block_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("calendar_blocks", block_id)
    assert_org_member(user_id, record["organization_id"])
    return enrich_calendar_blocks([record], record["organization_id"])[0]


@router.patch("/calendar/blocks/{block_id}")
def update_calendar_block(block_id: str, payload: UpdateCalendarBlockInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("calendar_blocks", block_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})

    patch = payload.model_dump(exclude_none=True)
    if not patch:
        return enrich_calendar_blocks([record], record["organization_id"])[0]

    next_starts = _parse_date(patch.get("starts_on") or record["starts_on"])
    next_ends = _parse_date(patch.get("ends_on") or record["ends_on"])
    if next_ends <= next_starts:
        raise HTTPException(status_code=400, detail="ends_on must be later than starts_on.")

    updated = update_row("calendar_blocks", block_id, patch)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="calendar_blocks",
        entity_id=block_id,
        before_state=record,
        after_state=updated,
    )
    return enrich_calendar_blocks([updated], record["organization_id"])[0]


@router.delete("/calendar/blocks/{block_id}")
def delete_calendar_block(block_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("calendar_blocks", block_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})
    deleted = delete_row("calendar_blocks", block_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="calendar_blocks",
        entity_id=block_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted
