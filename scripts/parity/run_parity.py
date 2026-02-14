#!/usr/bin/env python3
"""Run strict wire-shape parity checks between FastAPI and Rust services."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS = ROOT / "scripts" / "parity" / "request-corpus.json"


@dataclass
class HttpResult:
    status: int
    headers: dict[str, str]
    body_text: str
    body_json: Any | None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--fastapi-base-url",
        default=os.environ.get("PARITY_FASTAPI_URL", "http://localhost:8000"),
    )
    parser.add_argument(
        "--rust-base-url",
        default=os.environ.get("PARITY_RUST_URL", "http://localhost:8100"),
    )
    parser.add_argument("--corpus", default=str(DEFAULT_CORPUS))
    parser.add_argument("--report", default=str(ROOT / "docs" / "rust-migration" / "parity-report.json"))
    parser.add_argument(
        "--tag",
        action="append",
        default=[],
        help="Filter corpus cases by tag. Can be specified multiple times.",
    )
    args = parser.parse_args()

    corpus_path = Path(args.corpus)
    corpus_all = json.loads(corpus_path.read_text(encoding="utf-8"))
    selected_tags = {str(tag).strip() for tag in (args.tag or []) if str(tag).strip()}
    if selected_tags:
        corpus = [
            case
            for case in corpus_all
            if selected_tags.intersection(
                {str(tag).strip() for tag in (case.get("tags") or []) if str(tag).strip()}
            )
        ]
    else:
        corpus = corpus_all

    if not corpus:
        print("No parity cases selected.")
        print(f"Corpus: {corpus_path}")
        if selected_tags:
            print(f"Tags: {sorted(selected_tags)}")
        return 1

    mismatches: list[dict[str, Any]] = []
    report_cases: list[dict[str, Any]] = []

    for case in corpus:
        case_id = case["id"]
        method = case.get("method", "GET").upper()
        path = case["path"]
        compare_body_shape = bool(case.get("compare_body_shape", True))

        fastapi_result = request_once(args.fastapi_base_url, method, path, case)
        rust_result = request_once(args.rust_base_url, method, path, case)

        case_report = {
            "id": case_id,
            "method": method,
            "path": path,
            "fastapi": summarize_result(fastapi_result),
            "rust": summarize_result(rust_result),
            "mismatches": [],
        }

        expected_status = case.get("expected_status")
        if expected_status is not None:
            if fastapi_result.status != expected_status:
                case_report["mismatches"].append(
                    f"FastAPI status {fastapi_result.status} != expected {expected_status}"
                )
            if rust_result.status != expected_status:
                case_report["mismatches"].append(
                    f"Rust status {rust_result.status} != expected {expected_status}"
                )

        if fastapi_result.status != rust_result.status:
            case_report["mismatches"].append(
                f"Status mismatch: FastAPI={fastapi_result.status}, Rust={rust_result.status}"
            )

        if compare_body_shape:
            fastapi_shape = value_shape(fastapi_result.body_json if fastapi_result.body_json is not None else fastapi_result.body_text)
            rust_shape = value_shape(rust_result.body_json if rust_result.body_json is not None else rust_result.body_text)
            if fastapi_shape != rust_shape:
                case_report["mismatches"].append(
                    f"Body shape mismatch: FastAPI={json.dumps(fastapi_shape, ensure_ascii=False)}, "
                    f"Rust={json.dumps(rust_shape, ensure_ascii=False)}"
                )

        report_cases.append(case_report)
        if case_report["mismatches"]:
            mismatches.append(case_report)

    report_payload = {
        "fastapi_base_url": args.fastapi_base_url,
        "rust_base_url": args.rust_base_url,
        "corpus": str(corpus_path),
        "selected_tags": sorted(selected_tags),
        "total_cases_in_corpus": len(corpus_all),
        "selected_case_count": len(corpus),
        "cases": report_cases,
        "mismatch_count": len(mismatches),
    }
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Executed {len(report_cases)} parity cases.")
    print(f"Mismatch count: {len(mismatches)}")
    print(f"Report: {report_path}")

    if mismatches:
        print("Parity mismatches detected:")
        for mismatch in mismatches:
            print(f"- {mismatch['id']}:")
            for detail in mismatch["mismatches"]:
                print(f"  - {detail}")
        return 1

    print("Parity checks passed.")
    return 0


def request_once(base_url: str, method: str, path: str, case: dict[str, Any]) -> HttpResult:
    headers = dict(case.get("headers") or {})
    query = case.get("query") or {}
    body = case.get("body")

    target_path = path if path.startswith("/") else f"/{path}"
    encoded_query = urllib.parse.urlencode(query, doseq=True)
    full_url = f"{base_url.rstrip('/')}{target_path}"
    if encoded_query:
        full_url = f"{full_url}?{encoded_query}"

    payload_bytes: bytes | None = None
    if body is not None:
        payload_bytes = json.dumps(body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")

    request = urllib.request.Request(full_url, data=payload_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw_body = response.read()
            status = response.status
            response_headers = {key.lower(): value for key, value in response.headers.items()}
    except urllib.error.HTTPError as error:
        raw_body = error.read()
        status = error.code
        response_headers = {key.lower(): value for key, value in error.headers.items()}
    except urllib.error.URLError as error:
        raw_body = json.dumps(
            {"detail": f"Network error while calling {full_url}: {error}"}
        ).encode("utf-8")
        status = 0
        response_headers = {"content-type": "application/json"}

    body_text = raw_body.decode("utf-8", errors="replace")
    body_json = try_json_decode(body_text)
    return HttpResult(status=status, headers=response_headers, body_text=body_text, body_json=body_json)


def try_json_decode(value: str) -> Any | None:
    text = value.strip()
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        return None


def value_shape(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            "type": "object",
            "keys": {key: value_shape(val) for key, val in sorted(value.items(), key=lambda item: item[0])},
        }
    if isinstance(value, list):
        return {"type": "array", "items": [value_shape(item) for item in value]}
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "bool"}
    if isinstance(value, int):
        return {"type": "int"}
    if isinstance(value, float):
        return {"type": "float"}
    if isinstance(value, str):
        return {"type": "string"}
    return {"type": type(value).__name__}


def summarize_result(result: HttpResult) -> dict[str, Any]:
    return {
        "status": result.status,
        "headers": result.headers,
        "body_json": result.body_json,
        "body_text": result.body_text if result.body_json is None else None,
    }


if __name__ == "__main__":
    sys.exit(main())
