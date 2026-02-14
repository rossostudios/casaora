#!/usr/bin/env python3
"""Compare live router paths against api/openapi.yaml coverage."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OPENAPI_FILE = ROOT / "api" / "openapi.yaml"
ROUTE_MATRIX_FILE = ROOT / "docs" / "rust-migration" / "route-matrix.json"
OUTPUT_FILE = ROOT / "docs" / "rust-migration" / "openapi-gap-report.md"

PATH_RE = re.compile(r"^\s{2}(/[^:]+):\s*$")


def main() -> None:
    openapi_paths = parse_openapi_paths()
    route_rows = json.loads(ROUTE_MATRIX_FILE.read_text(encoding="utf-8"))
    live_paths = {str(row["path"]) for row in route_rows}

    missing_in_openapi = sorted(live_paths - openapi_paths)
    extra_in_openapi = sorted(openapi_paths - live_paths)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        render_report(openapi_paths, live_paths, missing_in_openapi, extra_in_openapi),
        encoding="utf-8",
    )
    print(f"Wrote: {OUTPUT_FILE}")
    print(f"OpenAPI paths: {len(openapi_paths)}")
    print(f"Live router paths: {len(live_paths)}")
    print(f"Missing in OpenAPI: {len(missing_in_openapi)}")
    print(f"Extra in OpenAPI: {len(extra_in_openapi)}")


def parse_openapi_paths() -> set[str]:
    paths: set[str] = set()
    for line in OPENAPI_FILE.read_text(encoding="utf-8").splitlines():
        match = PATH_RE.match(line)
        if match:
            paths.add(match.group(1))
    return paths


def render_report(
    openapi_paths: set[str],
    live_paths: set[str],
    missing_in_openapi: list[str],
    extra_in_openapi: list[str],
) -> str:
    lines = [
        "# OpenAPI Gap Report",
        "",
        f"- OpenAPI paths (`api/openapi.yaml`): **{len(openapi_paths)}**",
        f"- Live backend paths (router source): **{len(live_paths)}**",
        f"- Missing in OpenAPI: **{len(missing_in_openapi)}**",
        f"- Extra in OpenAPI: **{len(extra_in_openapi)}**",
        "",
        "## Missing in OpenAPI",
        "",
    ]

    if missing_in_openapi:
        for path in missing_in_openapi:
            lines.append(f"- `{path}`")
    else:
        lines.append("- None")

    lines.extend(["", "## Extra in OpenAPI", ""])
    if extra_in_openapi:
        for path in extra_in_openapi:
            lines.append(f"- `{path}`")
    else:
        lines.append("- None")

    lines.append("")
    return "\n".join(lines)


if __name__ == "__main__":
    main()
