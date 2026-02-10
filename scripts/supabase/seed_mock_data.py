#!/usr/bin/env python3
"""Seed mock operational data into Supabase for local development.

This script is intentionally simple and uses the Supabase Management API
to execute SQL against the project's database.

It will:
- Insert 1 property + 2 units
- Insert 2 channels (Airbnb + Booking.com)
- Insert 2 listings (one per unit/channel)
- Insert 1 guest
- Insert 1 reservation + 1 calendar block
- Insert 1 task + 2 checklist items
- Insert 1 expense

Usage:
  python3 scripts/supabase/seed_mock_data.py --project-ref thzhbiojhdeifjqhhzli --org-id <uuid>

Auth:
  Same as scripts/supabase/execute_sql.py:
  - --access-token
  - env SUPABASE_ACCESS_TOKEN
  - ~/.codex/config.toml SUPABASE_ACCESS_TOKEN = '...'
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import subprocess
import sys
import uuid
from typing import Any


def _read_access_token(cli_token: str | None) -> str | None:
    if cli_token:
        return cli_token.strip()

    env_token = os.environ.get("SUPABASE_ACCESS_TOKEN")
    if env_token:
        return env_token.strip()

    codex_config = pathlib.Path.home() / ".codex" / "config.toml"
    if codex_config.exists():
        match = re.search(
            r"SUPABASE_ACCESS_TOKEN\s*=\s*'([^']+)'",
            codex_config.read_text(encoding="utf-8", errors="replace"),
        )
        if match:
            return match.group(1).strip()

    return None


def _execute_sql(*, api_url: str, project_ref: str, token: str, query: str) -> Any:
    url = f"{api_url.rstrip('/')}/v1/projects/{project_ref}/database/query"
    payload = json.dumps({"query": query, "read_only": False}).encode("utf-8")

    proc = subprocess.run(
        [
            "curl",
            "--fail-with-body",
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
        input=payload,
        capture_output=True,
        check=False,
    )

    if proc.returncode != 0:
        stdout = proc.stdout.decode("utf-8", errors="replace").strip()
        stderr = proc.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(stderr or stdout or f"curl failed (exit {proc.returncode})")

    stdout = proc.stdout.decode("utf-8", errors="replace").strip()
    if not stdout:
        return []

    try:
        parsed = json.loads(stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"Non-JSON response from Supabase API: {stdout[:300]}")

    if isinstance(parsed, dict) and parsed.get("message"):
        raise RuntimeError(str(parsed["message"]))

    return parsed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--org-id", required=True, help="Existing organizations.id to seed data into")
    parser.add_argument("--access-token", default=None)
    parser.add_argument("--api-url", default=os.environ.get("SUPABASE_API_URL", "https://api.supabase.com"))
    args = parser.parse_args()

    token = _read_access_token(args.access_token)
    if not token:
        print("Missing Supabase access token.", file=sys.stderr)
        return 2

    org_id = args.org_id

    try:
        uuid.UUID(org_id)
    except ValueError:
        print(f"Invalid org id (expected uuid): {org_id}", file=sys.stderr)
        return 2

    # Ensure the org exists before seeding rows that depend on it.
    try:
        org_check = _execute_sql(
            api_url=args.api_url,
            project_ref=args.project_ref,
            token=token,
            query=f"select 1 as ok from organizations where id = '{org_id}' limit 1;",
        )
    except FileNotFoundError:
        print("Missing dependency: curl", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1

    if not isinstance(org_check, list) or len(org_check) == 0:
        print(f"Organization not found: {org_id}", file=sys.stderr)
        print("Create it first (or use the existing DEFAULT_ORG_ID from apps/admin/.env.local).", file=sys.stderr)
        return 2

    # Deterministic IDs so repeated runs don't create duplicates.
    namespace = uuid.UUID(org_id)
    property_id = uuid.uuid5(namespace, "seed:property:vm-hq")
    unit_a_id = uuid.uuid5(namespace, "seed:unit:vm-hq:A1")
    unit_b_id = uuid.uuid5(namespace, "seed:unit:vm-hq:B1")
    airbnb_id = uuid.uuid5(namespace, "seed:channel:airbnb")
    booking_id = uuid.uuid5(namespace, "seed:channel:bookingcom")
    listing_a_id = uuid.uuid5(namespace, "seed:listing:airbnb:A1")
    listing_b_id = uuid.uuid5(namespace, "seed:listing:bookingcom:B1")
    guest_id = uuid.uuid5(namespace, "seed:guest:ana-perez")
    reservation_id = uuid.uuid5(namespace, "seed:reservation:ana-perez:A1")
    block_id = uuid.uuid5(namespace, "seed:block:maintenance:A1")
    task_id = uuid.uuid5(namespace, "seed:task:turnover:A1")
    task_item_1 = uuid.uuid5(namespace, "seed:task_item:turnover:1")
    task_item_2 = uuid.uuid5(namespace, "seed:task_item:turnover:2")
    expense_id = uuid.uuid5(namespace, "seed:expense:supplies:A1")

    seed_sql = f"""
    -- Properties + Units
    INSERT INTO properties (id, organization_id, name, code, status, address_line1, city, country_code)
    VALUES ('{property_id}', '{org_id}', 'Villa Morra HQ', 'VM-HQ', 'active', 'Av. Example 123', 'Asuncion', 'PY')
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          code = EXCLUDED.code,
          status = EXCLUDED.status,
          address_line1 = EXCLUDED.address_line1,
          city = EXCLUDED.city,
          country_code = EXCLUDED.country_code;

    INSERT INTO units (id, organization_id, property_id, code, name, max_guests, bedrooms, bathrooms, default_nightly_rate, default_cleaning_fee, currency)
    VALUES
      ('{unit_a_id}', '{org_id}', '{property_id}', 'A1', 'Departamento A1', 2, 1, 1.0, 250000, 80000, 'PYG'),
      ('{unit_b_id}', '{org_id}', '{property_id}', 'B1', 'Departamento B1', 4, 2, 1.0, 380000, 120000, 'PYG')
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          property_id = EXCLUDED.property_id,
          code = EXCLUDED.code,
          name = EXCLUDED.name,
          max_guests = EXCLUDED.max_guests,
          bedrooms = EXCLUDED.bedrooms,
          bathrooms = EXCLUDED.bathrooms,
          default_nightly_rate = EXCLUDED.default_nightly_rate,
          default_cleaning_fee = EXCLUDED.default_cleaning_fee,
          currency = EXCLUDED.currency;

    -- Channels
    INSERT INTO channels (id, organization_id, kind, name, is_active)
    VALUES
      ('{airbnb_id}', '{org_id}', 'airbnb', 'Airbnb', true),
      ('{booking_id}', '{org_id}', 'bookingcom', 'Booking.com', true)
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          kind = EXCLUDED.kind,
          name = EXCLUDED.name,
          is_active = EXCLUDED.is_active;

    -- Listings
    INSERT INTO listings (id, organization_id, unit_id, channel_id, external_listing_id, public_name, is_active)
    VALUES
      ('{listing_a_id}', '{org_id}', '{unit_a_id}', '{airbnb_id}', 'airbnb-VM-A1', 'VM A1 (Airbnb)', true),
      ('{listing_b_id}', '{org_id}', '{unit_b_id}', '{booking_id}', 'booking-VM-B1', 'VM B1 (Booking)', true)
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          unit_id = EXCLUDED.unit_id,
          channel_id = EXCLUDED.channel_id,
          external_listing_id = EXCLUDED.external_listing_id,
          public_name = EXCLUDED.public_name,
          is_active = EXCLUDED.is_active;

    -- Guest
    INSERT INTO guests (id, organization_id, full_name, email, phone_e164, preferred_language)
    VALUES ('{guest_id}', '{org_id}', 'Ana Perez', 'ana.perez@example.com', '+595981000000', 'es')
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone_e164 = EXCLUDED.phone_e164,
          preferred_language = EXCLUDED.preferred_language;

    -- Reservation (next week, 3 nights)
    INSERT INTO reservations (
      id, organization_id, unit_id, listing_id, channel_id, guest_id,
      status, source, check_in_date, check_out_date,
      currency, nightly_rate, cleaning_fee, tax_amount, extra_fees, discount_amount, total_amount, amount_paid, platform_fee, owner_payout_estimate
    )
    VALUES (
      '{reservation_id}', '{org_id}', '{unit_a_id}', '{listing_a_id}', '{airbnb_id}', '{guest_id}',
      'confirmed', 'manual', (current_date + 7), (current_date + 10),
      'PYG', 250000, 80000, 0, 0, 0, 830000, 0, 0, 830000
    )
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          unit_id = EXCLUDED.unit_id,
          listing_id = EXCLUDED.listing_id,
          channel_id = EXCLUDED.channel_id,
          guest_id = EXCLUDED.guest_id,
          status = EXCLUDED.status,
          source = EXCLUDED.source,
          check_in_date = EXCLUDED.check_in_date,
          check_out_date = EXCLUDED.check_out_date,
          currency = EXCLUDED.currency,
          nightly_rate = EXCLUDED.nightly_rate,
          cleaning_fee = EXCLUDED.cleaning_fee,
          tax_amount = EXCLUDED.tax_amount,
          extra_fees = EXCLUDED.extra_fees,
          discount_amount = EXCLUDED.discount_amount,
          total_amount = EXCLUDED.total_amount,
          amount_paid = EXCLUDED.amount_paid,
          platform_fee = EXCLUDED.platform_fee,
          owner_payout_estimate = EXCLUDED.owner_payout_estimate;

    -- Calendar block (maintenance between +14 and +16)
    INSERT INTO calendar_blocks (id, organization_id, unit_id, source, starts_on, ends_on, reason)
    VALUES ('{block_id}', '{org_id}', '{unit_a_id}', 'manual', (current_date + 14), (current_date + 16), 'Maintenance')
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          unit_id = EXCLUDED.unit_id,
          source = EXCLUDED.source,
          starts_on = EXCLUDED.starts_on,
          ends_on = EXCLUDED.ends_on,
          reason = EXCLUDED.reason;

    -- Task + checklist
    INSERT INTO tasks (id, organization_id, unit_id, reservation_id, type, status, priority, title, due_at)
    VALUES (
      '{task_id}', '{org_id}', '{unit_a_id}', '{reservation_id}',
      'cleaning', 'todo', 'high', 'Turnover cleaning for Ana Perez',
      (now() + interval '7 days')
    )
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          unit_id = EXCLUDED.unit_id,
          reservation_id = EXCLUDED.reservation_id,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          title = EXCLUDED.title,
          due_at = EXCLUDED.due_at;

    INSERT INTO task_items (id, task_id, sort_order, label, is_required, is_completed)
    VALUES
      ('{task_item_1}', '{task_id}', 1, 'Replace towels', true, false),
      ('{task_item_2}', '{task_id}', 2, 'Restock toilet paper', true, false)
    ON CONFLICT (id) DO UPDATE
      SET task_id = EXCLUDED.task_id,
          sort_order = EXCLUDED.sort_order,
          label = EXCLUDED.label,
          is_required = EXCLUDED.is_required,
          is_completed = EXCLUDED.is_completed;

    -- Expense
    INSERT INTO expenses (id, organization_id, unit_id, category, expense_date, amount, currency, payment_method, vendor_name, notes)
    VALUES ('{expense_id}', '{org_id}', '{unit_a_id}', 'supplies', current_date, 45000, 'PYG', 'cash', 'Supermercado', 'Starter supplies')
    ON CONFLICT (id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id,
          unit_id = EXCLUDED.unit_id,
          category = EXCLUDED.category,
          expense_date = EXCLUDED.expense_date,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          payment_method = EXCLUDED.payment_method,
          vendor_name = EXCLUDED.vendor_name,
          notes = EXCLUDED.notes;
    """.strip()

    try:
        _execute_sql(api_url=args.api_url, project_ref=args.project_ref, token=token, query=seed_sql)
    except FileNotFoundError:
        print("Missing dependency: curl", file=sys.stderr)
        return 2
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        return 1

    print("Seed complete.")
    print(f"property_id={property_id}")
    print(f"unit_a_id={unit_a_id}")
    print(f"unit_b_id={unit_b_id}")
    print(f"reservation_id={reservation_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
