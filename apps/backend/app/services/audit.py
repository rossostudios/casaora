from typing import Any, Optional

from app.db.supabase import get_supabase_client


def write_audit_log(
    organization_id: Optional[str],
    actor_user_id: Optional[str],
    action: str,
    entity_name: str,
    entity_id: Optional[str] = None,
    before_state: Optional[dict[str, Any]] = None,
    after_state: Optional[dict[str, Any]] = None,
) -> None:
    """Best-effort audit logging.

    Audit logs should never block the primary operation, so failures are
    intentionally swallowed.
    """

    if not organization_id:
        return

    record: dict[str, Any] = {
        "organization_id": organization_id,
        "actor_user_id": actor_user_id,
        "action": action,
        "entity_name": entity_name,
        "entity_id": entity_id,
        "before_state": before_state,
        "after_state": after_state,
    }

    try:
        client = get_supabase_client()
        client.table("audit_logs").insert(record).execute()
    except Exception:
        return

