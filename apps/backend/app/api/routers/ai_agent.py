from fastapi import APIRouter, Depends

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member
from app.schemas.domain import AgentChatInput
from app.services.ai_agent import agent_capabilities, run_ai_agent_chat
from app.services.audit import write_audit_log

router = APIRouter(tags=["ai-agent"])


@router.get("/agent/capabilities")
def get_agent_capabilities(org_id: str, user_id=Depends(require_user_id)) -> dict:
    membership = assert_org_member(user_id=user_id, org_id=org_id)
    role = str(membership.get("role") or "viewer")
    return {
        "organization_id": org_id,
        **agent_capabilities(role=role, allow_mutations=False),
    }


@router.post("/agent/chat")
def ai_agent_chat(payload: AgentChatInput, user_id=Depends(require_user_id)) -> dict:
    membership = assert_org_member(user_id=user_id, org_id=payload.org_id)
    role = str(membership.get("role") or "viewer")

    result = run_ai_agent_chat(
        org_id=payload.org_id,
        user_id=user_id,
        role=role,
        message=payload.message,
        conversation=[
            {"role": item.role, "content": item.content}
            for item in payload.conversation
        ],
        allow_mutations=payload.allow_mutations,
    )

    write_audit_log(
        organization_id=payload.org_id,
        actor_user_id=user_id,
        action="agent.chat",
        entity_name="ai_agent",
        after_state={
            "role": role,
            "allow_mutations": payload.allow_mutations,
            "tool_trace_count": len(result.get("tool_trace") or []),
        },
    )

    return {
        "organization_id": payload.org_id,
        "role": role,
        **result,
    }
