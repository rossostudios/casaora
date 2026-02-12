import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.api.routers.applications import _qualification_from_row, list_applications


class ApplicationEnrichmentTest(unittest.TestCase):
    def test_qualification_score_uses_income_ratio_and_status_bonus(self):
        row = {
            "status": "qualified",
            "phone_e164": "+595981000000",
            "document_number": "1234567",
            "email": "tenant@example.com",
            "message": "I can move in this month.",
            "guarantee_choice": "guarantor_product",
            "monthly_income": 3600,
        }

        score, band, ratio = _qualification_from_row(row, monthly_recurring_total=1200)

        self.assertEqual(ratio, 3.0)
        self.assertGreaterEqual(score, 75)
        self.assertEqual(band, "strong")

    @patch("app.api.routers.applications.assert_org_member")
    @patch("app.api.routers.applications.ensure_applications_pipeline_enabled")
    @patch("app.api.routers.applications.list_rows")
    def test_list_applications_enriches_sla_alert_levels(
        self,
        mock_list_rows,
        mock_ensure_pipeline_enabled,
        mock_assert_org_member,
    ):
        del mock_ensure_pipeline_enabled

        now = datetime.now(timezone.utc)

        applications = [
            {
                "id": "application-warning",
                "organization_id": "org-1",
                "marketplace_listing_id": "listing-1",
                "full_name": "Warning Tenant",
                "email": "warning@example.com",
                "phone_e164": "+595981111111",
                "document_number": "1234567",
                "guarantee_choice": "guarantor_product",
                "message": "I can provide full references.",
                "status": "screening",
                "monthly_income": 3000,
                "assigned_user_id": "user-1",
                "created_at": (now - timedelta(minutes=100)).isoformat(),
            },
            {
                "id": "application-breached",
                "organization_id": "org-1",
                "marketplace_listing_id": "listing-1",
                "full_name": "Breached Tenant",
                "email": "breached@example.com",
                "status": "new",
                "monthly_income": 900,
                "created_at": (now - timedelta(minutes=150)).isoformat(),
            },
            {
                "id": "application-met",
                "organization_id": "org-1",
                "marketplace_listing_id": "listing-2",
                "full_name": "Met Tenant",
                "email": "met@example.com",
                "status": "qualified",
                "monthly_income": 3200,
                "created_at": (now - timedelta(minutes=100)).isoformat(),
                "first_response_at": (now - timedelta(minutes=70)).isoformat(),
            },
        ]

        listings = [
            {
                "id": "listing-1",
                "title": "Loft Centro",
                "monthly_recurring_total": 1000,
            },
            {
                "id": "listing-2",
                "title": "Villa Morra 2D",
                "monthly_recurring_total": 1200,
            },
        ]

        users = [
            {
                "id": "user-1",
                "full_name": "Ana Operator",
                "email": "ana@example.com",
            }
        ]

        def list_rows_side_effect(
            table: str,
            filters=None,
            limit: int = 50,
            offset: int = 0,
            order_by: str = "created_at",
            ascending: bool = False,
        ):
            del filters, limit, offset, order_by, ascending
            if table == "application_submissions":
                return [dict(row) for row in applications]
            if table == "marketplace_listings":
                return [dict(row) for row in listings]
            if table == "app_users":
                return [dict(row) for row in users]
            return []

        mock_list_rows.side_effect = list_rows_side_effect

        result = list_applications(
            org_id="org-1",
            status=None,
            assigned_user_id=None,
            listing_id=None,
            limit=250,
            user_id="user-123",
        )

        self.assertEqual(len(result["data"]), 3)

        by_id = {row["id"]: row for row in result["data"]}
        warning_row = by_id["application-warning"]
        breached_row = by_id["application-breached"]
        met_row = by_id["application-met"]

        self.assertEqual(warning_row["response_sla_status"], "pending")
        self.assertEqual(warning_row["response_sla_alert_level"], "warning")
        self.assertEqual(warning_row["assigned_user_name"], "Ana Operator")
        self.assertEqual(warning_row["qualification_band"], "strong")
        self.assertEqual(warning_row["income_to_rent_ratio"], 3.0)

        self.assertEqual(breached_row["response_sla_status"], "breached")
        self.assertEqual(breached_row["response_sla_alert_level"], "critical")
        self.assertEqual(breached_row["qualification_band"], "watch")

        self.assertEqual(met_row["response_sla_status"], "met")
        self.assertEqual(met_row["response_sla_alert_level"], "none")
        self.assertGreater(met_row["qualification_score"], 0)

        mock_assert_org_member.assert_called_once_with("user-123", "org-1")


if __name__ == "__main__":
    unittest.main()
