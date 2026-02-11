import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.api.routers.marketplace import submit_public_marketplace_application
from app.schemas.domain import PublicMarketplaceApplicationInput


class MarketplaceSubmissionAlertingTest(unittest.TestCase):
    def _payload(self) -> PublicMarketplaceApplicationInput:
        return PublicMarketplaceApplicationInput(
            listing_slug="depto-centro",
            full_name="Ada Lovelace",
            email="ada@example.com",
            phone_e164="+595981000111",
            source="marketplace",
        )

    @patch("app.api.routers.marketplace.write_analytics_event")
    @patch("app.api.routers.marketplace.write_alert_event")
    @patch("app.api.routers.marketplace.create_row")
    @patch("app.api.routers.marketplace.list_rows")
    @patch("app.api.routers.marketplace.ensure_marketplace_public_enabled")
    def test_submission_failure_emits_alert_event(
        self,
        mock_flag,
        mock_list_rows,
        mock_create_row,
        mock_write_alert_event,
        mock_write_analytics_event,
    ):
        del mock_flag, mock_write_analytics_event

        mock_list_rows.return_value = [
            {
                "id": "listing-1",
                "organization_id": "org-1",
                "public_slug": "depto-centro",
                "is_published": True,
            }
        ]
        mock_create_row.side_effect = HTTPException(
            status_code=502,
            detail="Supabase request failed.",
        )

        with self.assertRaises(HTTPException) as captured:
            submit_public_marketplace_application(self._payload())

        self.assertEqual(captured.exception.status_code, 502)
        self.assertEqual(mock_write_alert_event.call_count, 1)
        _, kwargs = mock_write_alert_event.call_args
        self.assertEqual(kwargs["organization_id"], "org-1")
        self.assertEqual(kwargs["event_type"], "application_submit_failed")
        self.assertEqual(kwargs["severity"], "error")

    @patch("app.api.routers.marketplace.write_analytics_event")
    @patch("app.api.routers.marketplace.write_alert_event")
    @patch("app.api.routers.marketplace.create_row")
    @patch("app.api.routers.marketplace.list_rows")
    @patch("app.api.routers.marketplace.ensure_marketplace_public_enabled")
    def test_event_insert_failure_does_not_block_application_success(
        self,
        mock_flag,
        mock_list_rows,
        mock_create_row,
        mock_write_alert_event,
        mock_write_analytics_event,
    ):
        del mock_flag

        mock_list_rows.return_value = [
            {
                "id": "listing-1",
                "organization_id": "org-1",
                "public_slug": "depto-centro",
                "is_published": True,
            }
        ]
        mock_create_row.side_effect = [
            {
                "id": "application-1",
                "marketplace_listing_id": "listing-1",
                "status": "new",
                "source": "marketplace",
            },
            HTTPException(status_code=502, detail="application_events insert failed"),
        ]

        result = submit_public_marketplace_application(self._payload())

        self.assertEqual(result["id"], "application-1")
        self.assertEqual(result["status"], "new")
        self.assertEqual(mock_write_alert_event.call_count, 1)
        _, kwargs = mock_write_alert_event.call_args
        self.assertEqual(kwargs["organization_id"], "org-1")
        self.assertEqual(kwargs["event_type"], "application_event_write_failed")
        self.assertEqual(kwargs["severity"], "warning")
        self.assertEqual(mock_write_analytics_event.call_count, 1)


if __name__ == "__main__":
    unittest.main()
