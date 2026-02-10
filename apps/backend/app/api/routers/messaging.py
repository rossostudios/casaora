from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreateMessageTemplateInput, SendMessageInput
from app.services.audit import write_audit_log
from app.services.table_service import create_row, get_row, list_rows

router = APIRouter(tags=["Messaging"])


@router.get("/message-templates")
def list_templates(
    org_id: str = Query(...),
    channel: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if channel:
        filters["channel"] = channel
    return {"data": list_rows("message_templates", filters, limit=limit)}


@router.post("/message-templates", status_code=201)
def create_template(payload: CreateMessageTemplateInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin", "operator"})
    created = create_row("message_templates", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="message_templates",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/message-templates/{template_id}")
def get_template(template_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("message_templates", template_id)
    assert_org_member(user_id, record["organization_id"])
    return record


@router.post("/messages/send", status_code=202)
def send_message(payload: SendMessageInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin", "operator"})
    log = payload.model_dump(exclude_none=True)
    log["status"] = "queued"
    log["scheduled_at"] = payload.scheduled_at or datetime.now(timezone.utc).isoformat()
    created = create_row("message_logs", log)
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="message_logs",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created
