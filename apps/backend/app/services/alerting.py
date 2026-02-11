from datetime import datetime, timezone
from typing import Any, Optional

from app.db.supabase import get_supabase_client


def write_alert_event(
    organization_id: Optional[str],
    event_type: str,
    payload: Optional[dict[str, Any]] = None,
    *,
    severity: str = "error",
    error_message: Optional[str] = None,
) -> None:
    if not organization_id or not event_type:
        return

    now_iso = datetime.now(timezone.utc).isoformat()
    body = {
        "severity": severity,
        **(payload or {}),
    }

    try:
        client = get_supabase_client()
        client.table("integration_events").insert(
            {
                "organization_id": organization_id,
                "provider": "alerting",
                "event_type": event_type,
                "payload": body,
                "status": "failed",
                "error_message": error_message,
                "received_at": now_iso,
                "processed_at": now_iso,
            }
        ).execute()
    except Exception:
        return
