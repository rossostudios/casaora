from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.db.supabase import get_supabase_client
from app.services.table_service import create_row, get_row, list_rows

router = APIRouter(tags=["Integrations", "Audit"])


@router.get("/integration-events")
def list_integration_events(
    org_id: str = Query(...),
    provider: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters: dict[str, Any] = {"organization_id": org_id}
    if provider:
        filters["provider"] = provider
    if event_type:
        filters["event_type"] = event_type
    if status:
        filters["status"] = status
    rows = list_rows("integration_events", filters, limit=limit, order_by="received_at", ascending=False)
    return {"data": rows}


@router.post("/integration-events", status_code=201)
def create_integration_event(payload: dict, user_id: str = Depends(require_user_id)) -> dict:
    organization_id = (payload.get("organization_id") or payload.get("org_id") or "").strip()
    provider = (payload.get("provider") or "").strip()
    event_type = (payload.get("event_type") or "").strip()
    external_event_id = (payload.get("external_event_id") or "").strip() or None
    body = payload.get("payload")

    if not organization_id:
        raise HTTPException(status_code=400, detail="organization_id is required.")
    if not provider:
        raise HTTPException(status_code=400, detail="provider is required.")
    if not event_type:
        raise HTTPException(status_code=400, detail="event_type is required.")
    if body is None:
        raise HTTPException(status_code=400, detail="payload is required.")

    assert_org_role(user_id, organization_id, {"owner_admin", "operator"})
    record = {
        "organization_id": organization_id,
        "provider": provider,
        "event_type": event_type,
        "external_event_id": external_event_id,
        "payload": body,
        "status": "received",
    }
    return create_row("integration_events", record)


@router.get("/integration-events/{event_id}")
def get_integration_event(event_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("integration_events", event_id)
    org_id = record.get("organization_id")
    if not isinstance(org_id, str) or not org_id:
        raise HTTPException(status_code=403, detail="Forbidden: integration event is missing organization context.")
    assert_org_member(user_id, org_id)
    return record


@router.post("/integrations/webhooks/{provider}", status_code=201)
def ingest_integration_webhook(
    provider: str,
    payload: Any,
    org_id: str = Query(...),
    event_type: str = Query(...),
    external_event_id: Optional[str] = Query(None),
    user_id: str = Depends(require_user_id),
) -> dict:
    # MVP-safe ingestion for testing. In production this should use a provider
    # signature/secret, not end-user auth.
    assert_org_role(user_id, org_id, {"owner_admin", "operator"})

    record = {
        "organization_id": org_id,
        "provider": provider,
        "event_type": event_type,
        "external_event_id": external_event_id,
        "payload": payload,
        "status": "received",
    }
    return create_row("integration_events", record)


@router.get("/audit-logs")
def list_audit_logs(
    org_id: str = Query(...),
    action: Optional[str] = Query(None),
    entity_name: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=2000),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters: dict[str, Any] = {"organization_id": org_id}
    if action:
        filters["action"] = action
    if entity_name:
        filters["entity_name"] = entity_name
    rows = list_rows("audit_logs", filters, limit=limit, order_by="created_at", ascending=False)
    return {"data": rows}


@router.get("/audit-logs/{log_id}")
def get_audit_log(log_id: int, user_id: str = Depends(require_user_id)) -> dict:
    try:
        client = get_supabase_client()
        resp = client.table("audit_logs").select("*").eq("id", log_id).limit(1).execute()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"Supabase request failed: {exc}") from exc

    rows = resp.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="audit_logs record not found.")

    record = rows[0]
    org_id = record.get("organization_id")
    if not isinstance(org_id, str) or not org_id:
        raise HTTPException(status_code=403, detail="Forbidden: audit log is missing organization context.")
    assert_org_member(user_id, org_id)
    return record
