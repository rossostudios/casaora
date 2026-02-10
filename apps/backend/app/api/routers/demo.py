from __future__ import annotations

from datetime import date, timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_role
from app.services.table_service import create_row, list_rows

router = APIRouter(tags=["Demo"])


def _as_uuid(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid organization_id (expected UUID).") from exc


@router.post("/demo/seed", status_code=201)
def seed_demo(payload: dict, user_id: str = Depends(require_user_id)) -> dict:
    org_id = str(payload.get("organization_id") or payload.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="organization_id is required.")

    org_uuid = _as_uuid(org_id)
    assert_org_role(user_id, org_id, {"owner_admin"})

    # Keep this safe and predictable: only seed into an empty org.
    if list_rows("properties", {"organization_id": org_id}, limit=1):
        raise HTTPException(
            status_code=409,
            detail="Demo data already exists for this organization (properties found).",
        )

    namespace = org_uuid
    property_id = uuid.uuid5(namespace, "demo:property:vm-hq")
    unit_a_id = uuid.uuid5(namespace, "demo:unit:vm-hq:A1")
    unit_b_id = uuid.uuid5(namespace, "demo:unit:vm-hq:B1")
    airbnb_id = uuid.uuid5(namespace, "demo:channel:airbnb")
    booking_id = uuid.uuid5(namespace, "demo:channel:bookingcom")
    listing_a_id = uuid.uuid5(namespace, "demo:listing:airbnb:A1")
    listing_b_id = uuid.uuid5(namespace, "demo:listing:bookingcom:B1")
    guest_id = uuid.uuid5(namespace, "demo:guest:ana-perez")
    reservation_id = uuid.uuid5(namespace, "demo:reservation:ana-perez:A1")
    block_id = uuid.uuid5(namespace, "demo:block:maintenance:A1")
    task_id = uuid.uuid5(namespace, "demo:task:turnover:A1")
    task_item_1 = uuid.uuid5(namespace, "demo:task_item:turnover:1")
    task_item_2 = uuid.uuid5(namespace, "demo:task_item:turnover:2")
    expense_id = uuid.uuid5(namespace, "demo:expense:supplies:A1")
    statement_id = uuid.uuid5(namespace, "demo:statement:this-month")

    today = date.today()
    check_in = today + timedelta(days=7)
    check_out = today + timedelta(days=10)
    maintenance_start = today + timedelta(days=14)
    maintenance_end = today + timedelta(days=16)
    period_start = today.replace(day=1)
    period_end = today

    created: dict[str, str | list[str]] = {}

    prop = create_row(
        "properties",
        {
            "id": str(property_id),
            "organization_id": org_id,
            "name": "Villa Morra HQ (Demo)",
            "code": "DEMO-VM-HQ",
            "address_line1": "Av. Example 123",
            "city": "Asuncion",
            "country_code": "PY",
        },
    )
    created["property_id"] = str(prop.get("id") or property_id)

    unit_a = create_row(
        "units",
        {
            "id": str(unit_a_id),
            "organization_id": org_id,
            "property_id": str(property_id),
            "code": "A1",
            "name": "Departamento A1 (Demo)",
            "max_guests": 2,
            "bedrooms": 1,
            "bathrooms": 1.0,
            "default_nightly_rate": 250000,
            "default_cleaning_fee": 80000,
            "currency": "PYG",
            "is_active": True,
        },
    )
    unit_b = create_row(
        "units",
        {
            "id": str(unit_b_id),
            "organization_id": org_id,
            "property_id": str(property_id),
            "code": "B1",
            "name": "Departamento B1 (Demo)",
            "max_guests": 4,
            "bedrooms": 2,
            "bathrooms": 1.0,
            "default_nightly_rate": 380000,
            "default_cleaning_fee": 120000,
            "currency": "PYG",
            "is_active": True,
        },
    )
    created["unit_ids"] = [
        str(unit_a.get("id") or unit_a_id),
        str(unit_b.get("id") or unit_b_id),
    ]

    ch_airbnb = create_row(
        "channels",
        {
            "id": str(airbnb_id),
            "organization_id": org_id,
            "kind": "airbnb",
            "name": "Airbnb (Demo)",
            "is_active": True,
        },
    )
    ch_booking = create_row(
        "channels",
        {
            "id": str(booking_id),
            "organization_id": org_id,
            "kind": "bookingcom",
            "name": "Booking.com (Demo)",
            "is_active": True,
        },
    )
    created["channel_ids"] = [
        str(ch_airbnb.get("id") or airbnb_id),
        str(ch_booking.get("id") or booking_id),
    ]

    listing_a = create_row(
        "listings",
        {
            "id": str(listing_a_id),
            "organization_id": org_id,
            "unit_id": str(unit_a_id),
            "channel_id": str(airbnb_id),
            "external_listing_id": "airbnb-demo-VM-A1",
            "public_name": "VM A1 (Demo Airbnb)",
            "is_active": True,
        },
    )
    listing_b = create_row(
        "listings",
        {
            "id": str(listing_b_id),
            "organization_id": org_id,
            "unit_id": str(unit_b_id),
            "channel_id": str(booking_id),
            "external_listing_id": "booking-demo-VM-B1",
            "public_name": "VM B1 (Demo Booking)",
            "is_active": True,
        },
    )
    created["listing_ids"] = [
        str(listing_a.get("id") or listing_a_id),
        str(listing_b.get("id") or listing_b_id),
    ]

    guest = create_row(
        "guests",
        {
            "id": str(guest_id),
            "organization_id": org_id,
            "full_name": "Ana Perez (Demo)",
            "email": "ana.perez@example.com",
            "phone_e164": "+595981000000",
            "preferred_language": "es",
        },
    )
    created["guest_id"] = str(guest.get("id") or guest_id)

    reservation = create_row(
        "reservations",
        {
            "id": str(reservation_id),
            "organization_id": org_id,
            "unit_id": str(unit_a_id),
            "listing_id": str(listing_a_id),
            "channel_id": str(airbnb_id),
            "guest_id": str(guest_id),
            "status": "confirmed",
            "source": "manual",
            "check_in_date": check_in.isoformat(),
            "check_out_date": check_out.isoformat(),
            "currency": "PYG",
            "nightly_rate": 250000,
            "cleaning_fee": 80000,
            "total_amount": 830000,
            "owner_payout_estimate": 830000,
        },
    )
    created["reservation_id"] = str(reservation.get("id") or reservation_id)

    block = create_row(
        "calendar_blocks",
        {
            "id": str(block_id),
            "organization_id": org_id,
            "unit_id": str(unit_a_id),
            "source": "manual",
            "starts_on": maintenance_start.isoformat(),
            "ends_on": maintenance_end.isoformat(),
            "reason": "Maintenance (Demo)",
        },
    )
    created["calendar_block_id"] = str(block.get("id") or block_id)

    task = create_row(
        "tasks",
        {
            "id": str(task_id),
            "organization_id": org_id,
            "property_id": str(property_id),
            "unit_id": str(unit_a_id),
            "reservation_id": str(reservation_id),
            "type": "cleaning",
            "status": "todo",
            "priority": "high",
            "title": "Turnover cleaning (Demo)",
            "description": "Auto-generated demo task for the next reservation.",
        },
    )
    created["task_id"] = str(task.get("id") or task_id)

    create_row(
        "task_items",
        {
            "id": str(task_item_1),
            "task_id": str(task_id),
            "sort_order": 1,
            "label": "Replace linens + towels",
            "is_required": True,
            "is_completed": False,
        },
    )
    create_row(
        "task_items",
        {
            "id": str(task_item_2),
            "task_id": str(task_id),
            "sort_order": 2,
            "label": "Restock water + coffee",
            "is_required": True,
            "is_completed": False,
        },
    )

    expense = create_row(
        "expenses",
        {
            "id": str(expense_id),
            "organization_id": org_id,
            "property_id": str(property_id),
            "unit_id": str(unit_a_id),
            "reservation_id": str(reservation_id),
            "category": "supplies",
            "vendor_name": "Supermarket (Demo)",
            "expense_date": today.isoformat(),
            "amount": 95000,
            "currency": "PYG",
            "payment_method": "cash",
            "notes": "Cleaning supplies for turnover.",
        },
    )
    created["expense_id"] = str(expense.get("id") or expense_id)

    statement = create_row(
        "owner_statements",
        {
            "id": str(statement_id),
            "organization_id": org_id,
            "property_id": str(property_id),
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "currency": "PYG",
            "gross_revenue": 830000,
            "operating_expenses": 95000,
            "net_payout": 735000,
            "status": "draft",
        },
    )
    created["owner_statement_id"] = str(statement.get("id") or statement_id)

    return {"ok": True, "organization_id": org_id, "created": created}
