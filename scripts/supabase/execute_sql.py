#!/usr/bin/env python3
"""
Execute SQL against a Supabase project's database via the Supabase Management API.

Usage:
  python3 scripts/supabase/execute_sql.py --project-ref <ref> --sql-file db/schema.sql

Auth:
  Provide a Supabase Personal Access Token (PAT) via:
  - --access-token
  - env SUPABASE_ACCESS_TOKEN
  - (Codex convenience) ~/.codex/config.toml SUPABASE_ACCESS_TOKEN = '...'
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import subprocess
import sys


def _read_access_token(cli_token: str | None) -> str | None:
    if cli_token:
        return cli_token.strip()

    env_token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if env_token:
        return env_token.strip()

    # Convenience for this repo's Codex workflow (token is typically configured here).
    codex_config = pathlib.Path.home() / ".codex" / "config.toml"
    if codex_config.exists():
        match = re.search(
            r"SUPABASE_ACCESS_TOKEN\s*=\s*'([^']+)'",
            codex_config.read_text(encoding="utf-8", errors="replace"),
        )
        if match:
            return match.group(1).strip()

    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-ref", required=True, help="Supabase project ref (e.g. thzhbiojhdeifjqhhzli).")
    parser.add_argument("--sql-file", required=True, help="Path to a .sql file to execute.")
    parser.add_argument("--api-url", default=os.environ.get("SUPABASE_API_URL", "https://api.supabase.com"))
    parser.add_argument("--access-token", default=None)
    parser.add_argument("--read-only", action="store_true", default=False)
    args = parser.parse_args()

    token = _read_access_token(args.access_token)
    if not token:
        print(
            "Missing Supabase access token. Provide --access-token or env SUPABASE_ACCESS_TOKEN.",
            file=sys.stderr,
        )
        return 2

    sql_path = pathlib.Path(args.sql_file)
    if not sql_path.exists():
        print(f"SQL file not found: {sql_path}", file=sys.stderr)
        return 2

    sql = sql_path.read_text(encoding="utf-8", errors="replace").strip()
    if not sql:
        print(f"SQL file is empty: {sql_path}", file=sys.stderr)
        return 2

    url = f"{args.api_url.rstrip('/')}/v1/projects/{args.project_ref}/database/query"
    payload = {"query": sql, "read_only": bool(args.read_only)}
    try:
        proc = subprocess.run(
            [
                "curl",
                "-sS",
                "-X",
                "POST",
                url,
                "-H",
                f"Authorization: Bearer {token}",
                "-H",
                "Content-Type: application/json",
                "-H",
                "Accept: application/json",
                "--data-binary",
                "@-",
            ],
            input=json.dumps(payload).encode("utf-8"),
            capture_output=True,
            check=False,
        )
    except FileNotFoundError:
        print("Missing dependency: curl", file=sys.stderr)
        return 2

    if proc.returncode != 0:
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        print(f"curl failed (exit {proc.returncode})", file=sys.stderr)
        if stderr:
            print(stderr, file=sys.stderr)
        return 1

    body = proc.stdout.decode("utf-8", errors="replace").strip()
    print(body if body else "{}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
