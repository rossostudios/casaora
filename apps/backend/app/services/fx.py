import json
from datetime import date
from typing import Optional, Union
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _fetch_json(url: str) -> Optional[dict]:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            # Some CDNs reject requests without a UA.
            "User-Agent": "puerta-abierta/1.0",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = response.read()
        return json.loads(payload.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None


def get_usd_to_pyg_rate(value_date: Union[str, date]) -> Optional[float]:
    """Best-effort USD -> PYG FX snapshot lookup.

    Returns None when no rate could be fetched, so callers can require manual input.
    """

    day = value_date.isoformat() if isinstance(value_date, date) else str(value_date).strip()
    if not day:
        return None

    # Primary: daily snapshots published via jsDelivr.
    # Format: {"date":"YYYY-MM-DD","pyg":1234.56}
    sources = [
        f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{day}/v1/currencies/usd/pyg.json",
        "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd/pyg.json",
        "https://open.er-api.com/v6/latest/USD",
    ]

    for url in sources:
        payload = _fetch_json(url)
        if not payload:
            continue

        rate: Optional[float] = None

        if "pyg" in payload:
            try:
                rate = float(payload.get("pyg"))
            except Exception:
                rate = None
        elif "rates" in payload:
            try:
                rate = float((payload.get("rates") or {}).get("PYG"))
            except Exception:
                rate = None

        if rate and rate > 0:
            return rate

    return None
