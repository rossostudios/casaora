import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional


BUCKET_NAME = "receipts"

# Keep filenames predictable and safe for object paths.
_SAFE_FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def is_http_url(value: str) -> bool:
    normalized = (value or "").strip().lower()
    return normalized.startswith("http://") or normalized.startswith("https://")


def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename or "").strip()
    if not base:
        return "receipt"

    cleaned = _SAFE_FILENAME_RE.sub("-", base).strip(".-_")
    if not cleaned:
        return "receipt"

    if len(cleaned) <= 120:
        return cleaned

    root, ext = os.path.splitext(cleaned)
    # Preserve a short extension when present (e.g. .pdf/.jpg).
    if ext and len(ext) <= 10:
        root = root[: max(1, 120 - len(ext))]
        return f"{root}{ext}"

    return cleaned[:120]


def build_receipt_path(org_id: str, namespace: str, filename: str) -> str:
    safe_org = (org_id or "").strip()
    safe_ns = (namespace or "").strip().strip("/")
    if not safe_org:
        raise ValueError("org_id is required.")
    if not safe_ns:
        safe_ns = "general"

    safe_name = sanitize_filename(filename)
    day = datetime.now(timezone.utc).date().isoformat()
    return f"{safe_org}/{safe_ns}/{day}/{uuid.uuid4()}-{safe_name}"


def validate_receipt_path(value: str, org_id: str) -> str:
    """Validate we store a private storage object path, not a public URL."""

    text = (value or "").strip()
    if not text:
        raise ValueError("receipt_url is required.")
    if is_http_url(text):
        raise ValueError(
            "receipt_url must be a private storage path (not an http(s) URL)."
        )

    expected = f"{(org_id or '').strip()}/"
    if not expected.strip("/"):
        raise ValueError("organization_id is required.")
    if not text.startswith(expected):
        raise ValueError(f"receipt_url must start with '{expected}'.")
    return text


def signed_url_from_response(response: dict) -> Optional[str]:
    if not isinstance(response, dict):
        return None
    url = response.get("signedUrl") or response.get("signedURL")
    if isinstance(url, str) and url.strip():
        return url.strip()
    return None

