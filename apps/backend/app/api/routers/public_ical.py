from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services.ical import build_unit_ical_export
from app.services.table_service import get_row

router = APIRouter(tags=["Public"])


@router.get("/public/ical/{token}.ics")
def export_ical(token: str) -> Response:
    token = (token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Missing iCal token.")

    listing = get_row("listings", token, id_field="ical_export_token")
    if not listing.get("is_active", True):
        raise HTTPException(status_code=404, detail="Listing is inactive.")

    org_id = listing.get("organization_id")
    unit_id = listing.get("unit_id")
    if not isinstance(org_id, str) or not org_id:
        raise HTTPException(status_code=404, detail="Listing missing organization context.")
    if not isinstance(unit_id, str) or not unit_id:
        raise HTTPException(status_code=404, detail="Listing missing unit context.")

    calendar_name = listing.get("public_name") or "Puerta Abierta"
    ics = build_unit_ical_export(org_id=org_id, unit_id=unit_id, calendar_name=str(calendar_name))
    return Response(content=ics, media_type="text/calendar; charset=utf-8")

