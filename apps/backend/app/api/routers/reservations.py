from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreateReservationInput, ReservationStatusInput, UpdateReservationInput
from app.services.audit import write_audit_log
from app.services.enrichment import enrich_reservations
from app.services.table_service import create_row, get_row, list_rows, update_row

router = APIRouter(tags=["Reservations"])

ACTIVE_BOOKING_STATUSES = {"pending", "confirmed", "checked_in"}
ALLOWED_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"checked_in", "cancelled", "no_show"},
    "checked_in": {"checked_out"},
    "checked_out": set(),
    "cancelled": set(),
    "no_show": set(),
}


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _has_overlap(unit_id: str, check_in_date: str, check_out_date: str, org_id: str) -> bool:
    reservations = list_rows("reservations", {"organization_id": org_id, "unit_id": unit_id}, limit=1000)
    new_start = _parse_date(check_in_date)
    new_end = _parse_date(check_out_date)

    for reservation in reservations:
        if reservation.get("status") not in ACTIVE_BOOKING_STATUSES:
            continue
        existing_start = _parse_date(reservation["check_in_date"])
        existing_end = _parse_date(reservation["check_out_date"])
        if not (new_end <= existing_start or new_start >= existing_end):
            return True
    return False


def _ensure_cleaning_task(reservation: dict, actor_user_id: str) -> None:
    """Best-effort task auto-creation.

    Operators primarily need a cleaning task after marking a reservation as
    checked_out. This should never block the status transition itself.
    """

    if reservation.get("status") != "checked_out":
        return

    org_id = reservation.get("organization_id")
    reservation_id = reservation.get("id")
    unit_id = reservation.get("unit_id")
    check_out_date = reservation.get("check_out_date")

    if not all(
        isinstance(value, str) and value.strip()
        for value in [org_id, reservation_id, unit_id, check_out_date]
    ):
        return

    existing = list_rows(
        "tasks",
        {
            "organization_id": org_id,
            "reservation_id": reservation_id,
            "type": "cleaning",
        },
        limit=10,
    )
    if existing:
        return

    property_id = None
    try:
        unit = get_row("units", unit_id)
        pid = unit.get("property_id")
        if isinstance(pid, str) and pid.strip():
            property_id = pid.strip()
    except Exception:
        property_id = None

    due_at = f"{check_out_date}T12:00:00Z"
    title = f"Cleaning ({check_out_date})"

    record = {
        "organization_id": org_id,
        "reservation_id": reservation_id,
        "unit_id": unit_id,
        "property_id": property_id,
        "type": "cleaning",
        "priority": "high",
        "status": "todo",
        "title": title,
        "due_at": due_at,
        "created_by_user_id": actor_user_id,
    }

    create_row("tasks", record)


@router.get("/reservations")
def list_reservations(
    org_id: str = Query(...),
    unit_id: Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    guest_id: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if unit_id:
        filters["unit_id"] = unit_id
    if listing_id:
        filters["listing_id"] = listing_id
    if guest_id:
        filters["guest_id"] = guest_id
    if channel_id:
        filters["channel_id"] = channel_id
    if status:
        filters["status"] = status
    rows = list_rows("reservations", filters, limit=limit, order_by="check_in_date", ascending=True)
    return {"data": enrich_reservations(rows, org_id)}


@router.post("/reservations", status_code=201)
def create_reservation(payload: CreateReservationInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin", "operator"})
    if _has_overlap(
        unit_id=payload.unit_id,
        check_in_date=payload.check_in_date,
        check_out_date=payload.check_out_date,
        org_id=payload.organization_id,
    ):
        raise HTTPException(status_code=409, detail="Reservation overlaps an existing active reservation.")
    created = create_row("reservations", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="reservations",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/reservations/{reservation_id}")
def get_reservation(reservation_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("reservations", reservation_id)
    assert_org_member(user_id, record["organization_id"])
    return enrich_reservations([record], record["organization_id"])[0]


@router.patch("/reservations/{reservation_id}")
def update_reservation(reservation_id: str, payload: UpdateReservationInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("reservations", reservation_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})
    updated = update_row("reservations", reservation_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="reservations",
        entity_id=reservation_id,
        before_state=record,
        after_state=updated,
    )
    return updated


@router.post("/reservations/{reservation_id}/status")
def transition_status(reservation_id: str, payload: ReservationStatusInput, user_id: str = Depends(require_user_id)) -> dict:
    reservation = get_row("reservations", reservation_id)
    assert_org_role(user_id, reservation["organization_id"], {"owner_admin", "operator"})
    current_status = reservation["status"]
    if payload.status == current_status:
        return reservation

    if payload.status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise HTTPException(status_code=422, detail=f"Invalid status transition: {current_status} -> {payload.status}")

    patch = {"status": payload.status}
    if payload.status == "cancelled":
        patch["cancel_reason"] = payload.reason
    updated = update_row("reservations", reservation_id, patch)
    write_audit_log(
        organization_id=reservation.get("organization_id"),
        actor_user_id=user_id,
        action="status_transition",
        entity_name="reservations",
        entity_id=reservation_id,
        before_state=reservation,
        after_state=updated,
    )
    if payload.status == "checked_out":
        try:
            _ensure_cleaning_task(updated, actor_user_id=user_id)
        except Exception:
            pass

    return updated
