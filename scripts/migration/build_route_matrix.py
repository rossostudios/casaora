#!/usr/bin/env python3
"""Build a FastAPI route migration matrix from backend router source files."""

from __future__ import annotations

import ast
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[2]
ROUTERS_DIR = ROOT / "apps" / "backend" / "app" / "api" / "routers"
OUTPUT_DIR = ROOT / "docs" / "rust-migration"
OUTPUT_MD = OUTPUT_DIR / "route-matrix.md"
OUTPUT_JSON = OUTPUT_DIR / "route-matrix.json"

HTTP_METHODS = {"get", "post", "patch", "delete", "put"}
PRIORITY_DOMAINS = {
    "reservations",
    "marketplace",
    "owner_statements",
    "reports",
    "ai_agent",
    "agent_chats",
}

MIGRATED_PATHS = {
    "/health",
    "/me",
    "/agent/agents",
    "/agent/capabilities",
    "/agent/chat",
    "/agent/chats",
    "/agent/chats/{chat_id}",
    "/agent/chats/{chat_id}/messages",
    "/agent/chats/{chat_id}/archive",
    "/agent/chats/{chat_id}/restore",
    "/organizations",
    "/organizations/{org_id}",
    "/organizations/{org_id}/invites",
    "/organizations/{org_id}/invites/{invite_id}",
    "/organization-invites/accept",
    "/organizations/{org_id}/members",
    "/organizations/{org_id}/members/{member_user_id}",
    "/properties",
    "/properties/{property_id}",
    "/units",
    "/units/{unit_id}",
    "/channels",
    "/channels/{channel_id}",
    "/listings",
    "/listings/{listing_id}",
    "/guests",
    "/guests/{guest_id}",
    "/reservations",
    "/reservations/{reservation_id}",
    "/reservations/{reservation_id}/status",
    "/calendar/availability",
    "/calendar/blocks",
    "/calendar/blocks/{block_id}",
    "/tasks",
    "/tasks/{task_id}",
    "/tasks/{task_id}/complete",
    "/tasks/{task_id}/items",
    "/tasks/{task_id}/items/{item_id}",
    "/expenses",
    "/expenses/{expense_id}",
    "/collections",
    "/collections/{collection_id}",
    "/collections/{collection_id}/mark-paid",
    "/leases",
    "/leases/{lease_id}",
    "/pricing/templates",
    "/pricing/templates/{template_id}",
    "/message-templates",
    "/message-templates/{template_id}",
    "/messages/send",
    "/integration-events",
    "/integration-events/{event_id}",
    "/integrations/webhooks/{provider}",
    "/audit-logs",
    "/audit-logs/{log_id}",
    "/public/ical/{token}.ics",
    "/applications",
    "/applications/{application_id}",
    "/applications/{application_id}/status",
    "/applications/{application_id}/convert-to-lease",
    "/owner-statements",
    "/owner-statements/{statement_id}",
    "/owner-statements/{statement_id}/finalize",
    "/reports/owner-summary",
    "/reports/summary",
    "/reports/operations-summary",
    "/reports/transparency-summary",
    "/marketplace/listings",
    "/marketplace/listings/{marketplace_listing_id}",
    "/marketplace/listings/{marketplace_listing_id}/publish",
    "/public/marketplace/listings",
    "/public/marketplace/listings/{slug}",
    "/public/marketplace/listings/{slug}/apply-start",
    "/public/marketplace/listings/{slug}/contact-whatsapp",
    "/public/marketplace/applications",
    "/listings/{listing_id}/sync-ical",
    "/demo/seed",
}

HTTP_EXCEPTION_RE = re.compile(r"raise\s+HTTPException\([^)]*status_code\s*=\s*(\d+)", re.S)
DEPENDS_RE = re.compile(r"Depends\(([^)]+)\)")
ASSERT_ROLE_RE = re.compile(r"assert_org_role\([^)]*allowed_roles\s*=\s*\{([^}]*)\}", re.S)


@dataclass
class RouteRow:
    file: str
    function: str
    method: str
    path: str
    status_code: int
    auth_requirement: str
    org_role_requirement: str
    request_schema: str
    success_shape: str
    error_statuses: list[int]
    priority_domain: bool
    migrated_to_rust: bool


def main() -> None:
    rows = collect_routes()
    rows.sort(key=lambda item: (item.path, item.method, item.file, item.function))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(
        json.dumps([asdict(row) for row in rows], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    OUTPUT_MD.write_text(render_markdown(rows), encoding="utf-8")
    print(f"Wrote {len(rows)} route rows:")
    print(f" - {OUTPUT_MD}")
    print(f" - {OUTPUT_JSON}")


def collect_routes() -> list[RouteRow]:
    rows: list[RouteRow] = []
    for file_path in sorted(ROUTERS_DIR.glob("*.py")):
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_path))
        lines = source.splitlines()
        domain = file_path.stem

        for node in tree.body:
            if not isinstance(node, ast.FunctionDef):
                continue

            endpoints = parse_endpoint_decorators(node.decorator_list)
            if not endpoints:
                continue

            function_source = function_source_slice(lines, node)
            dependencies = parse_dependencies(function_source)
            auth_requirement = summarize_auth_requirement(dependencies)
            org_role_requirement = parse_org_role_requirement(function_source)
            request_schema = parse_request_schema(node)
            success_shape = infer_success_shape(node)
            error_statuses = sorted({int(code) for code in HTTP_EXCEPTION_RE.findall(function_source)})

            for method, path, status_code in endpoints:
                rows.append(
                    RouteRow(
                        file=str(file_path.relative_to(ROOT)),
                        function=node.name,
                        method=method.upper(),
                        path=path,
                        status_code=status_code,
                        auth_requirement=auth_requirement,
                        org_role_requirement=org_role_requirement,
                        request_schema=request_schema,
                        success_shape=success_shape,
                        error_statuses=error_statuses,
                        priority_domain=domain in PRIORITY_DOMAINS,
                        migrated_to_rust=path in MIGRATED_PATHS,
                    )
                )
    return rows


def parse_endpoint_decorators(decorators: Iterable[ast.expr]) -> list[tuple[str, str, int]]:
    endpoints: list[tuple[str, str, int]] = []
    for decorator in decorators:
        if not isinstance(decorator, ast.Call):
            continue
        func = decorator.func
        if not isinstance(func, ast.Attribute):
            continue
        if not isinstance(func.value, ast.Name) or func.value.id != "router":
            continue
        method = func.attr.lower().strip()
        if method not in HTTP_METHODS:
            continue

        if not decorator.args:
            continue
        first = decorator.args[0]
        if not isinstance(first, ast.Constant) or not isinstance(first.value, str):
            continue
        path = first.value.strip()
        status_code = default_status_for_method(method)
        for keyword in decorator.keywords:
            if keyword.arg == "status_code" and isinstance(keyword.value, ast.Constant):
                if isinstance(keyword.value.value, int):
                    status_code = keyword.value.value

        endpoints.append((method, path, status_code))
    return endpoints


def default_status_for_method(method: str) -> int:
    if method == "post":
        return 200
    return 200


def function_source_slice(lines: list[str], node: ast.FunctionDef) -> str:
    if not hasattr(node, "lineno") or not hasattr(node, "end_lineno"):
        return ""
    return "\n".join(lines[node.lineno - 1 : node.end_lineno])


def parse_dependencies(function_source: str) -> list[str]:
    dependencies: list[str] = []
    for raw in DEPENDS_RE.findall(function_source):
        token = raw.strip()
        if token:
            dependencies.append(token)
    return dependencies


def summarize_auth_requirement(dependencies: list[str]) -> str:
    if any("require_supabase_user" in dep for dep in dependencies):
        return "require_supabase_user"
    if any("require_user_id" in dep for dep in dependencies):
        return "require_user_id"
    return "none"


def parse_org_role_requirement(function_source: str) -> str:
    role_match = ASSERT_ROLE_RE.search(function_source)
    if not role_match:
        if "assert_org_member(" in function_source:
            return "org_member"
        return "none"

    raw_roles = role_match.group(1)
    roles = [
        role.strip().strip("'").strip('"')
        for role in raw_roles.split(",")
        if role.strip()
    ]
    roles = [role for role in roles if role]
    if not roles:
        return "assert_org_role"
    return "assert_org_role:" + ",".join(sorted(set(roles)))


def parse_request_schema(node: ast.FunctionDef) -> str:
    for arg in node.args.args:
        annotation = arg.annotation
        annotation_name = annotation_to_name(annotation)
        if annotation_name.endswith("Input"):
            return annotation_name
    return "none"


def annotation_to_name(annotation: ast.expr | None) -> str:
    if annotation is None:
        return ""
    if isinstance(annotation, ast.Name):
        return annotation.id
    if isinstance(annotation, ast.Attribute):
        value = annotation_to_name(annotation.value)
        if value:
            return f"{value}.{annotation.attr}"
        return annotation.attr
    if isinstance(annotation, ast.Subscript):
        return annotation_to_name(annotation.value)
    if isinstance(annotation, ast.Constant) and isinstance(annotation.value, str):
        return annotation.value
    return ""


def infer_success_shape(node: ast.FunctionDef) -> str:
    for child in ast.walk(node):
        if isinstance(child, ast.Return) and child.value is not None:
            if isinstance(child.value, ast.Dict):
                return "object"
            if isinstance(child.value, ast.List):
                return "array"
    return "dynamic"


def render_markdown(rows: list[RouteRow]) -> str:
    total = len(rows)
    migrated = sum(1 for row in rows if row.migrated_to_rust)
    priority = sum(1 for row in rows if row.priority_domain)
    lines = [
        "# Rust Migration Route Matrix",
        "",
        f"- Generated from: `{ROUTERS_DIR.relative_to(ROOT)}`",
        f"- Total endpoints discovered: **{total}**",
        f"- Priority-domain endpoints: **{priority}**",
        f"- Marked migrated to Rust: **{migrated}**",
        "",
        "## Endpoint Inventory",
        "",
        "| Migrated | Priority | Method | Path | Status | Auth | Org Role | Request Schema | Success Shape | Error Statuses | Source | Function |",
        "|---|---|---|---|---:|---|---|---|---|---|---|---|",
    ]

    for row in rows:
        migrated = "x" if row.migrated_to_rust else " "
        priority = "x" if row.priority_domain else " "
        errors = ",".join(str(code) for code in row.error_statuses) if row.error_statuses else "-"
        lines.append(
            f"| {migrated} | {priority} | {row.method} | `{row.path}` | {row.status_code} | "
            f"`{row.auth_requirement}` | `{row.org_role_requirement}` | `{row.request_schema}` | "
            f"`{row.success_shape}` | `{errors}` | `{row.file}` | `{row.function}` |"
        )

    lines.extend(
        [
            "",
            "## Notes",
            "",
            "- `Migrated` is derived from a curated Rust migration allowlist in `scripts/migration/build_route_matrix.py`.",
            "- This matrix is generated from live FastAPI router source and is the canonical migration checklist.",
            "",
        ]
    )
    return "\n".join(lines)


if __name__ == "__main__":
    main()
