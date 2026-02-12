import unittest
from types import SimpleNamespace
from unittest.mock import patch

from pydantic import ValidationError

from app.api.routers.organizations import create_organization, update_organization
from app.schemas.domain import CreateOrganizationInput, UpdateOrganizationInput


class OrganizationProfileTypeTest(unittest.TestCase):
    def test_create_schema_defaults_profile_type(self):
        payload = CreateOrganizationInput(name="Puerta Abierta")
        self.assertEqual(payload.profile_type, "management_company")

    def test_create_schema_rejects_invalid_profile_type(self):
        with self.assertRaises(ValidationError):
            CreateOrganizationInput(name="Puerta Abierta", profile_type="invalid")

    def test_update_schema_rejects_invalid_profile_type(self):
        with self.assertRaises(ValidationError):
            UpdateOrganizationInput(profile_type="invalid")

    @patch("app.api.routers.organizations.write_audit_log")
    @patch("app.api.routers.organizations.ensure_org_membership")
    @patch("app.api.routers.organizations.create_row")
    @patch("app.api.routers.organizations.ensure_app_user")
    def test_create_router_persists_profile_type(
        self,
        mock_ensure_app_user,
        mock_create_row,
        mock_ensure_org_membership,
        mock_write_audit_log,
    ):
        del mock_ensure_app_user, mock_ensure_org_membership, mock_write_audit_log

        mock_create_row.return_value = {
            "id": "org-1",
            "owner_user_id": "user-1",
            "profile_type": "owner_operator",
        }

        payload = CreateOrganizationInput(
            name="Puerta Abierta",
            profile_type="owner_operator",
        )
        create_organization(payload, user=SimpleNamespace(id="user-1"))

        args, _kwargs = mock_create_row.call_args
        self.assertEqual(args[0], "organizations")
        self.assertEqual(args[1]["profile_type"], "owner_operator")

    @patch("app.api.routers.organizations.write_audit_log")
    @patch("app.api.routers.organizations.update_row")
    @patch("app.api.routers.organizations.get_row")
    @patch("app.api.routers.organizations.ensure_app_user")
    def test_update_router_persists_profile_type(
        self,
        mock_ensure_app_user,
        mock_get_row,
        mock_update_row,
        mock_write_audit_log,
    ):
        del mock_ensure_app_user, mock_write_audit_log

        mock_get_row.return_value = {
            "id": "org-1",
            "owner_user_id": "user-1",
            "profile_type": "owner_operator",
        }
        mock_update_row.return_value = {
            "id": "org-1",
            "owner_user_id": "user-1",
            "profile_type": "management_company",
        }

        payload = UpdateOrganizationInput(profile_type="management_company")
        updated = update_organization(
            "org-1", payload, user=SimpleNamespace(id="user-1")
        )

        args, _kwargs = mock_update_row.call_args
        self.assertEqual(args[0], "organizations")
        self.assertEqual(args[1], "org-1")
        self.assertEqual(args[2]["profile_type"], "management_company")
        self.assertEqual(updated["profile_type"], "management_company")


if __name__ == "__main__":
    unittest.main()
