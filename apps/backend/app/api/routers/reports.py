from datetime import date

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member
from app.services.table_service import list_rows

router = APIRouter(tags=["Reports"])

REPORTABLE_STATUSES = {"confirmed", "checked_in", "checked_out"}


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _nights(start: date, end: date) -> int:
    return max((end - start).days, 0)


def _expense_amount_pyg(expense: dict) -> tuple[float, Optional[str]]:
    """Return (amount_in_pyg, warning_code)."""

    currency = str(expense.get("currency") or "PYG").strip().upper()
    amount = float(expense.get("amount", 0) or 0)
    if currency == "PYG":
        return amount, None
    if currency == "USD":
        fx = expense.get("fx_rate_to_pyg")
        try:
            fx_value = float(fx)
        except Exception:  # pragma: no cover
            return 0.0, "missing_fx_rate_to_pyg"
        if fx_value <= 0:  # pragma: no cover
            return 0.0, "missing_fx_rate_to_pyg"
        return amount * fx_value, None
    return 0.0, f"unsupported_currency:{currency}"


@router.get("/reports/owner-summary")
def owner_summary_report(
    org_id: str = Query(...),
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    property_id: Optional[str] = Query(None),
    unit_id: Optional[str] = Query(None),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    period_start = _parse_date(from_date)
    period_end = _parse_date(to_date)
    total_days = _nights(period_start, period_end)

    units = list_rows("units", {"organization_id": org_id}, limit=3000)
    if property_id:
        units = [unit for unit in units if unit.get("property_id") == property_id]
    if unit_id:
        units = [unit for unit in units if unit.get("id") == unit_id]
    unit_count = max(len(units), 1)
    available_nights = max(total_days * unit_count, 1)

    reservations = list_rows("reservations", {"organization_id": org_id}, limit=6000)
    if unit_id:
        reservations = [item for item in reservations if item.get("unit_id") == unit_id]
    if property_id:
        units_in_property = {unit["id"] for unit in units}
        reservations = [item for item in reservations if item.get("unit_id") in units_in_property]

    booked_nights = 0
    gross_revenue = 0.0
    for reservation in reservations:
        if reservation.get("status") not in REPORTABLE_STATUSES:
            continue
        check_in = _parse_date(reservation["check_in_date"])
        check_out = _parse_date(reservation["check_out_date"])
        if check_out <= period_start or check_in >= period_end:
            continue
        overlap_start = max(check_in, period_start)
        overlap_end = min(check_out, period_end)
        booked_nights += _nights(overlap_start, overlap_end)
        gross_revenue += float(reservation.get("total_amount", 0) or 0)

    expenses = list_rows("expenses", {"organization_id": org_id}, limit=6000)
    if unit_id:
        expenses = [item for item in expenses if item.get("unit_id") == unit_id]
    if property_id:
        expenses = [item for item in expenses if item.get("property_id") == property_id]

    total_expenses = 0.0
    warnings: dict[str, int] = {}
    for expense in expenses:
        expense_date = _parse_date(expense["expense_date"])
        if period_start <= expense_date <= period_end:
            amount_pyg, warning = _expense_amount_pyg(expense)
            total_expenses += amount_pyg
            if warning:
                warnings[warning] = (warnings.get(warning, 0) or 0) + 1

    occupancy_rate = round(booked_nights / available_nights, 4)
    net_payout = round(gross_revenue - total_expenses, 2)

    return {
        "organization_id": org_id,
        "from": from_date,
        "to": to_date,
        "occupancy_rate": occupancy_rate,
        "gross_revenue": round(gross_revenue, 2),
        "expenses": round(total_expenses, 2),
        "net_payout": net_payout,
        "expense_warnings": warnings,
    }
