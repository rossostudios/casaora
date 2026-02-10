from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from typing import Any, Optional

import httpx
from fastapi import HTTPException

from app.services.table_service import create_row, list_rows, update_row


PA_UID_PREFIXES = ("pa-resv-", "pa-block-", "pa-")
ACTIVE_RESERVATION_STATUSES = {"pending", "confirmed", "checked_in"}


def _unfold_ical_lines(text: str) -> list[str]:
    """Unfold RFC5545 folded lines (continuations start with space or tab)."""

    unfolded: list[str] = []
    for raw in text.splitlines():
        line = raw.rstrip("\r\n")
        if not line:
            continue
        if line.startswith((" ", "\t")) and unfolded:
            unfolded[-1] = f"{unfolded[-1]}{line[1:]}"
        else:
            unfolded.append(line)
    return unfolded


def _parse_ical_date(value: str, params: dict[str, str]) -> Optional[date]:
    """Parse an iCal DTSTART/DTEND value into a date.

    We intentionally coerce date-times to dates (YYYYMMDD...) because the product
    models reservations and availability as date ranges (check-in/check-out).
    """

    value = (value or "").strip()
    if not value:
        return None

    # All-day event.
    if params.get("VALUE", "").upper() == "DATE":
        if len(value) < 8:
            return None
        yyyymmdd = value[:8]
        try:
            return date.fromisoformat(f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}")
        except ValueError:
            return None

    # Date-time (UTC or local). Example: 20260207T150000Z
    if len(value) >= 8:
        yyyymmdd = value[:8]
        try:
            return date.fromisoformat(f"{yyyymmdd[0:4]}-{yyyymmdd[4:6]}-{yyyymmdd[6:8]}")
        except ValueError:
            return None

    return None


def _first_prop(event: dict[str, list[tuple[dict[str, str], str]]], name: str) -> tuple[dict[str, str], str]:
    items = event.get(name.upper()) or []
    if not items:
        return {}, ""
    params, value = items[0]
    return (params or {}), (value or "")


def fetch_ical_text(url: str, timeout_s: float = 20.0) -> str:
    url = (url or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="iCal import URL is empty.")

    try:
        with httpx.Client(timeout=timeout_s, follow_redirects=True) as client:
            resp = client.get(
                url,
                headers={
                    "Accept": "text/calendar, text/plain;q=0.9, */*;q=0.1",
                    "User-Agent": "PuertaAbierta/1.0 (+https://puerta-abierta.local)",
                },
            )
            resp.raise_for_status()
            return resp.text
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code if exc.response else 502
        raise HTTPException(status_code=502, detail=f"iCal fetch failed ({status}) for {url}") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail=f"iCal fetch timed out for {url}") from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=502, detail=f"iCal fetch failed for {url}: {exc}") from exc


def parse_ical_events(ics_text: str) -> list[dict[str, Any]]:
    """Parse iCal text into minimal VEVENT records.

    Returns:
      [{uid, start_date, end_date, summary, description, status, raw}]
    """

    unfolded = _unfold_ical_lines(ics_text or "")
    events: list[dict[str, list[tuple[dict[str, str], str]]]] = []
    current: Optional[dict[str, list[tuple[dict[str, str], str]]]] = None

    for line in unfolded:
        upper = line.upper()
        if upper == "BEGIN:VEVENT":
            current = {}
            continue
        if upper == "END:VEVENT":
            if current is not None:
                events.append(current)
            current = None
            continue
        if current is None:
            continue

        if ":" not in line:
            continue
        key_part, value = line.split(":", 1)
        key_bits = key_part.split(";")
        key = (key_bits[0] or "").strip().upper()
        if not key:
            continue

        params: dict[str, str] = {}
        for raw_param in key_bits[1:]:
            raw_param = raw_param.strip()
            if not raw_param:
                continue
            if "=" in raw_param:
                pkey, pval = raw_param.split("=", 1)
                params[pkey.strip().upper()] = pval.strip()
            else:
                params[raw_param.strip().upper()] = "TRUE"

        current.setdefault(key, []).append((params, value.strip()))

    parsed: list[dict[str, Any]] = []
    for event in events:
        uid_params, uid_value = _first_prop(event, "UID")
        dtstart_params, dtstart_value = _first_prop(event, "DTSTART")
        dtend_params, dtend_value = _first_prop(event, "DTEND")
        summary_params, summary_value = _first_prop(event, "SUMMARY")
        desc_params, desc_value = _first_prop(event, "DESCRIPTION")
        status_params, status_value = _first_prop(event, "STATUS")

        _ = uid_params, summary_params, desc_params, status_params  # params unused for now

        start = _parse_ical_date(dtstart_value, dtstart_params)
        end = _parse_ical_date(dtend_value, dtend_params)
        if not start or not end:
            continue
        if end <= start:
            continue

        uid = (uid_value or "").strip()
        if not uid:
            stable = f"{start.isoformat()}|{end.isoformat()}|{summary_value}|{desc_value}".encode("utf-8")
            uid = f"ical-{hashlib.sha1(stable).hexdigest()}"

        parsed.append(
            {
                "uid": uid,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "summary": (summary_value or "").strip(),
                "description": (desc_value or "").strip(),
                "status": (status_value or "").strip().upper(),
                "raw": {
                    "uid": uid_value,
                    "dtstart": dtstart_value,
                    "dtend": dtend_value,
                    "summary": summary_value,
                    "description": desc_value,
                    "status": status_value,
                },
            }
        )

    return parsed


def _should_ignore_uid(uid: str) -> bool:
    lowered = (uid or "").strip().lower()
    return lowered.startswith(PA_UID_PREFIXES)


def sync_listing_ical_reservations(
    *,
    listing: dict[str, Any],
    requested_by_user_id: Optional[str],
) -> dict[str, Any]:
    """Fetch + import a listing's iCal feed as reservations.

    Idempotency:
      - Uses VEVENT UID -> reservations.external_reservation_id
      - Cancels missing iCal reservations for this listing (source='ical')
    """

    listing_id = listing.get("id")
    org_id = listing.get("organization_id")
    unit_id = listing.get("unit_id")
    channel_id = listing.get("channel_id")
    ical_url = (listing.get("ical_import_url") or "").strip()

    if not isinstance(listing_id, str) or not listing_id:
        raise HTTPException(status_code=400, detail="Listing is missing id.")
    if not isinstance(org_id, str) or not org_id:
        raise HTTPException(status_code=400, detail="Listing is missing organization_id.")
    if not isinstance(unit_id, str) or not unit_id:
        raise HTTPException(status_code=400, detail="Listing is missing unit_id.")
    if not isinstance(channel_id, str) or not channel_id:
        raise HTTPException(status_code=400, detail="Listing is missing channel_id.")
    if not ical_url:
        raise HTTPException(status_code=400, detail="Listing does not have an iCal import URL configured.")

    ics_text = fetch_ical_text(ical_url)
    events = parse_ical_events(ics_text)

    desired: dict[str, dict[str, Any]] = {}
    ignored_uid_prefix = 0
    for event in events:
        uid = str(event.get("uid") or "").strip()
        if not uid:
            continue
        if _should_ignore_uid(uid):
            ignored_uid_prefix += 1
            continue
        # Last one wins, but UIDs should be unique.
        desired[uid] = event

    # Pull only iCal-sourced reservations for this listing (so we can cancel missing).
    existing = list_rows(
        "reservations",
        {"organization_id": org_id, "listing_id": listing_id, "source": "ical"},
        limit=5000,
        order_by="check_in_date",
        ascending=True,
    )
    existing_by_external: dict[str, dict[str, Any]] = {}
    for row in existing:
        ext = row.get("external_reservation_id")
        if isinstance(ext, str) and ext.strip():
            existing_by_external[ext.strip()] = row

    created = 0
    updated = 0
    cancelled = 0
    ignored = 0
    conflicts = 0
    errors: list[str] = []

    now_iso = datetime.now(timezone.utc).isoformat()

    for uid, event in desired.items():
        start_date = str(event.get("start_date") or "").strip()
        end_date = str(event.get("end_date") or "").strip()
        summary = str(event.get("summary") or "").strip()
        description = str(event.get("description") or "").strip()
        ical_status = str(event.get("status") or "").strip().upper()
        is_cancelled = ical_status == "CANCELLED"

        if not start_date or not end_date:
            ignored += 1
            continue

        desired_status = "cancelled" if is_cancelled else "confirmed"

        existing_row = existing_by_external.get(uid)
        if existing_row:
            patch: dict[str, Any] = {}

            if existing_row.get("unit_id") != unit_id:
                patch["unit_id"] = unit_id
            if existing_row.get("listing_id") != listing_id:
                patch["listing_id"] = listing_id
            if existing_row.get("channel_id") != channel_id:
                patch["channel_id"] = channel_id
            if existing_row.get("source") != "ical":
                patch["source"] = "ical"

            if existing_row.get("check_in_date") != start_date:
                patch["check_in_date"] = start_date
            if existing_row.get("check_out_date") != end_date:
                patch["check_out_date"] = end_date

            # Avoid downgrading operational statuses.
            current_status = str(existing_row.get("status") or "").strip()
            if desired_status == "cancelled":
                if current_status != "cancelled":
                    patch["status"] = "cancelled"
                    patch["cancel_reason"] = "Cancelled in iCal feed"
                    patch["cancelled_at"] = now_iso
            else:
                if current_status not in {"checked_in", "checked_out"} and current_status != "confirmed":
                    patch["status"] = "confirmed"
                    patch["cancel_reason"] = None
                    patch["cancelled_at"] = None

            # Keep a lightweight note for traceability.
            if summary and not str(existing_row.get("notes") or "").strip():
                patch["notes"] = f"iCal: {summary}"
            elif description and not str(existing_row.get("notes") or "").strip():
                patch["notes"] = f"iCal: {description[:200]}"

            if patch:
                try:
                    update_row("reservations", str(existing_row["id"]), patch)
                    updated += 1
                except HTTPException as exc:
                    errors.append(str(exc.detail))
                    conflicts += 1
            continue

        if desired_status == "cancelled":
            ignored += 1
            continue

        payload: dict[str, Any] = {
            "organization_id": org_id,
            "unit_id": unit_id,
            "listing_id": listing_id,
            "channel_id": channel_id,
            "external_reservation_id": uid,
            "status": "confirmed",
            "source": "ical",
            "check_in_date": start_date,
            "check_out_date": end_date,
            "notes": f"iCal: {summary}" if summary else None,
            "created_by_user_id": requested_by_user_id,
        }
        # Remove Nones to keep payload small and predictable.
        payload = {k: v for k, v in payload.items() if v is not None}

        try:
            create_row("reservations", payload)
            created += 1
        except HTTPException as exc:
            errors.append(str(exc.detail))
            conflicts += 1

    desired_uids = set(desired.keys())
    for row in existing:
        ext = row.get("external_reservation_id")
        if not isinstance(ext, str) or not ext.strip():
            continue
        if ext.strip() in desired_uids:
            continue

        current_status = str(row.get("status") or "").strip()
        if current_status not in {"pending", "confirmed"}:
            continue

        try:
            update_row(
                "reservations",
                str(row["id"]),
                {
                    "status": "cancelled",
                    "cancel_reason": "Removed from iCal feed",
                    "cancelled_at": now_iso,
                },
            )
            cancelled += 1
        except HTTPException as exc:
            errors.append(str(exc.detail))
            conflicts += 1

    result: dict[str, Any] = {
        "import_url": ical_url,
        "events_total": len(events),
        "events_used": len(desired),
        "events_ignored_uid_prefix": ignored_uid_prefix,
        "reservations_created": created,
        "reservations_updated": updated,
        "reservations_cancelled": cancelled,
        "reservations_ignored": ignored,
        "conflicts": conflicts,
        "processed_at": now_iso,
    }

    if errors:
        # Keep payload small but actionable.
        result["errors"] = errors[:8]
        result["errors_truncated"] = len(errors) > 8

    return result


def _escape_ical_text(value: str) -> str:
    value = value.replace("\\", "\\\\")
    value = value.replace(";", "\\;")
    value = value.replace(",", "\\,")
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n")
    return value


def _fold_ical_line(line: str, limit: int = 75) -> list[str]:
    # RFC says 75 octets, we approximate with characters for simplicity.
    if len(line) <= limit:
        return [line]
    out: list[str] = []
    remaining = line
    while len(remaining) > limit:
        out.append(remaining[:limit])
        remaining = " " + remaining[limit:]
    out.append(remaining)
    return out


def build_unit_ical_export(*, org_id: str, unit_id: str, calendar_name: str = "Puerta Abierta") -> str:
    reservations = list_rows(
        "reservations",
        {"organization_id": org_id, "unit_id": unit_id},
        limit=5000,
        order_by="check_in_date",
        ascending=True,
    )
    blocks = list_rows(
        "calendar_blocks",
        {"organization_id": org_id, "unit_id": unit_id},
        limit=5000,
        order_by="starts_on",
        ascending=True,
    )

    active_reservations = [
        row for row in reservations if str(row.get("status") or "").strip() in ACTIVE_RESERVATION_STATUSES
    ]

    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Puerta Abierta//iCal Export//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escape_ical_text(calendar_name)}",
    ]

    def add_event(*, uid: str, start: str, end: str, summary: str, description: str) -> None:
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_stamp}",
                f"DTSTART;VALUE=DATE:{start}",
                f"DTEND;VALUE=DATE:{end}",
                f"SUMMARY:{_escape_ical_text(summary)}",
                f"DESCRIPTION:{_escape_ical_text(description)}",
                "END:VEVENT",
            ]
        )

    for row in active_reservations:
        rid = str(row.get("id") or "").strip()
        start = str(row.get("check_in_date") or "").replace("-", "")
        end = str(row.get("check_out_date") or "").replace("-", "")
        if not rid or len(start) != 8 or len(end) != 8:
            continue
        add_event(
            uid=f"pa-resv-{rid}",
            start=start,
            end=end,
            summary="Reserved",
            description="Busy (reservation)",
        )

    for row in blocks:
        bid = str(row.get("id") or "").strip()
        start = str(row.get("starts_on") or "").replace("-", "")
        end = str(row.get("ends_on") or "").replace("-", "")
        if not bid or len(start) != 8 or len(end) != 8:
            continue
        reason = str(row.get("reason") or "").strip()
        add_event(
            uid=f"pa-block-{bid}",
            start=start,
            end=end,
            summary="Blocked",
            description=reason or "Busy (calendar block)",
        )

    lines.append("END:VCALENDAR")

    folded: list[str] = []
    for line in lines:
        folded.extend(_fold_ical_line(line))
    return "\r\n".join(folded) + "\r\n"

