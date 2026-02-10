from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.core.auth import require_user_id
from app.core.tenancy import assert_org_member, assert_org_role
from app.schemas.domain import CreateChannelInput, CreateListingInput, UpdateChannelInput, UpdateListingInput
from app.services.audit import write_audit_log
from app.services.enrichment import enrich_listings
from app.services.ical import sync_listing_ical_reservations
from app.services.table_service import create_row, delete_row, get_row, list_rows, update_row

router = APIRouter(tags=["Channels", "Listings"])


@router.get("/channels")
def list_channels(
    org_id: str = Query(...),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    return {"data": list_rows("channels", {"organization_id": org_id}, limit=limit)}


@router.post("/channels", status_code=201)
def create_channel(payload: CreateChannelInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin"})
    created = create_row("channels", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="channels",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created


@router.get("/channels/{channel_id}")
def get_channel(channel_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("channels", channel_id)
    assert_org_member(user_id, record["organization_id"])
    return record


@router.patch("/channels/{channel_id}")
def update_channel(channel_id: str, payload: UpdateChannelInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("channels", channel_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    updated = update_row("channels", channel_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="channels",
        entity_id=channel_id,
        before_state=record,
        after_state=updated,
    )
    return updated


@router.delete("/channels/{channel_id}")
def delete_channel(channel_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("channels", channel_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    deleted = delete_row("channels", channel_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="channels",
        entity_id=channel_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted


@router.get("/listings")
def list_listings(
    org_id: str = Query(...),
    unit_id: Optional[str] = Query(None),
    channel_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    user_id: str = Depends(require_user_id),
) -> dict:
    assert_org_member(user_id, org_id)
    filters = {"organization_id": org_id}
    if unit_id:
        filters["unit_id"] = unit_id
    if channel_id:
        filters["channel_id"] = channel_id
    rows = list_rows("listings", filters, limit=limit)
    return {"data": enrich_listings(rows, org_id)}


@router.post("/listings", status_code=201)
def create_listing(payload: CreateListingInput, user_id: str = Depends(require_user_id)) -> dict:
    assert_org_role(user_id, payload.organization_id, {"owner_admin"})
    created = create_row("listings", payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=payload.organization_id,
        actor_user_id=user_id,
        action="create",
        entity_name="listings",
        entity_id=created.get("id"),
        before_state=None,
        after_state=created,
    )
    return created

@router.get("/listings/{listing_id}")
def get_listing(listing_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("listings", listing_id)
    assert_org_member(user_id, record["organization_id"])
    return enrich_listings([record], record["organization_id"])[0]

@router.patch("/listings/{listing_id}")
def update_listing(listing_id: str, payload: UpdateListingInput, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("listings", listing_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    updated = update_row("listings", listing_id, payload.model_dump(exclude_none=True))
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="update",
        entity_name="listings",
        entity_id=listing_id,
        before_state=record,
        after_state=updated,
    )
    return enrich_listings([updated], record["organization_id"])[0]


@router.delete("/listings/{listing_id}")
def delete_listing(listing_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("listings", listing_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin"})
    deleted = delete_row("listings", listing_id)
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="delete",
        entity_name="listings",
        entity_id=listing_id,
        before_state=deleted,
        after_state=None,
    )
    return deleted


@router.post("/listings/{listing_id}/sync-ical", status_code=202)
def sync_listing_ical(listing_id: str, user_id: str = Depends(require_user_id)) -> dict:
    record = get_row("listings", listing_id)
    assert_org_role(user_id, record["organization_id"], {"owner_admin", "operator"})

    # Record the request so the admin UI has a traceable integration event.
    integration_event = create_row(
        "integration_events",
        {
            "organization_id": record["organization_id"],
            "provider": "ical",
            "event_type": "listing_sync_requested",
            "payload": {"listing_id": listing_id, "requested_by_user_id": user_id},
            "status": "received",
        },
    )
    write_audit_log(
        organization_id=record.get("organization_id"),
        actor_user_id=user_id,
        action="create",
        entity_name="integration_events",
        entity_id=integration_event.get("id"),
        before_state=None,
        after_state=integration_event,
    )

    event_id = str(integration_event.get("id") or "")
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        result = sync_listing_ical_reservations(listing=record, requested_by_user_id=user_id)
        payload = dict(integration_event.get("payload") or {})
        payload.update(result)

        error_message: Optional[str] = None
        errors = result.get("errors")
        if isinstance(errors, list) and errors:
            error_message = f"Completed with {len(errors)} error(s)."

        try:
            update_row(
                "integration_events",
                event_id,
                {
                    "status": "processed",
                    "processed_at": result.get("processed_at") or now_iso,
                    "payload": payload,
                    "error_message": error_message,
                },
            )
        except Exception:
            pass

        write_audit_log(
            organization_id=record.get("organization_id"),
            actor_user_id=user_id,
            action="sync",
            entity_name="listings",
            entity_id=listing_id,
            before_state=None,
            after_state={
                "provider": "ical",
                **result,
            },
        )

        return {
            "status": "processed",
            "listing_id": listing_id,
            "integration_event_id": event_id,
            **result,
        }
    except HTTPException as exc:
        try:
            update_row(
                "integration_events",
                event_id,
                {
                    "status": "failed",
                    "processed_at": now_iso,
                    "error_message": str(exc.detail),
                },
            )
        except Exception:
            pass
        raise
    except Exception as exc:  # pragma: no cover
        try:
            update_row(
                "integration_events",
                event_id,
                {
                    "status": "failed",
                    "processed_at": now_iso,
                    "error_message": str(exc),
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"iCal sync failed: {exc}") from exc
