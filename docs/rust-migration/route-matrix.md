# Rust Migration Route Matrix

- Generated from: `apps/backend/app/api/routers`
- Total endpoints discovered: **123**
- Priority-domain endpoints: **34**
- Marked migrated to Rust: **121**

## Endpoint Inventory

| Migrated | Priority | Method | Path | Status | Auth | Org Role | Request Schema | Success Shape | Error Statuses | Source | Function |
|---|---|---|---|---:|---|---|---|---|---|---|---|
| x | x | GET | `/agent/agents` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `get_agent_definitions` |
| x | x | GET | `/agent/capabilities` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/ai_agent.py` | `get_agent_capabilities` |
| x | x | POST | `/agent/chat` | 200 | `require_user_id` | `org_member` | `AgentChatInput` | `object` | `-` | `apps/backend/app/api/routers/ai_agent.py` | `ai_agent_chat` |
| x | x | GET | `/agent/chats` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `get_agent_chats` |
| x | x | POST | `/agent/chats` | 200 | `require_user_id` | `org_member` | `CreateAgentChatInput` | `dynamic` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `create_agent_chat` |
| x | x | DELETE | `/agent/chats/{chat_id}` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `delete_agent_chat` |
| x | x | GET | `/agent/chats/{chat_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `get_agent_chat` |
| x | x | POST | `/agent/chats/{chat_id}/archive` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `archive_agent_chat` |
| x | x | GET | `/agent/chats/{chat_id}/messages` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `get_agent_chat_messages` |
| x | x | POST | `/agent/chats/{chat_id}/messages` | 200 | `require_user_id` | `org_member` | `SendAgentMessageInput` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `post_agent_chat_message` |
| x | x | POST | `/agent/chats/{chat_id}/restore` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/agent_chats.py` | `restore_agent_chat` |
| x |   | GET | `/applications` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/applications.py` | `list_applications` |
| x |   | GET | `/applications/{application_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/applications.py` | `get_application` |
| x |   | POST | `/applications/{application_id}/convert-to-lease` | 200 | `require_user_id` | `none` | `ConvertApplicationToLeaseInput` | `object` | `400` | `apps/backend/app/api/routers/applications.py` | `convert_application_to_lease` |
| x |   | POST | `/applications/{application_id}/status` | 200 | `require_user_id` | `none` | `ApplicationStatusInput` | `dynamic` | `400` | `apps/backend/app/api/routers/applications.py` | `update_application_status` |
| x |   | GET | `/audit-logs` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/integrations.py` | `list_audit_logs` |
| x |   | GET | `/audit-logs/{log_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `403,404,502` | `apps/backend/app/api/routers/integrations.py` | `get_audit_log` |
| x |   | GET | `/calendar/availability` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/calendar.py` | `calendar_availability` |
| x |   | GET | `/calendar/blocks` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/calendar.py` | `list_calendar_blocks` |
| x |   | POST | `/calendar/blocks` | 201 | `require_user_id` | `none` | `CreateCalendarBlockInput` | `dynamic` | `400,409` | `apps/backend/app/api/routers/calendar.py` | `create_calendar_block` |
| x |   | DELETE | `/calendar/blocks/{block_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/calendar.py` | `delete_calendar_block` |
| x |   | GET | `/calendar/blocks/{block_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/calendar.py` | `get_calendar_block` |
| x |   | PATCH | `/calendar/blocks/{block_id}` | 200 | `require_user_id` | `none` | `UpdateCalendarBlockInput` | `dynamic` | `400` | `apps/backend/app/api/routers/calendar.py` | `update_calendar_block` |
| x |   | GET | `/channels` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/channels.py` | `list_channels` |
| x |   | POST | `/channels` | 201 | `require_user_id` | `none` | `CreateChannelInput` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `create_channel` |
| x |   | DELETE | `/channels/{channel_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `delete_channel` |
| x |   | GET | `/channels/{channel_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `get_channel` |
| x |   | PATCH | `/channels/{channel_id}` | 200 | `require_user_id` | `none` | `UpdateChannelInput` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `update_channel` |
| x |   | GET | `/collections` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/collections.py` | `list_collections` |
| x |   | POST | `/collections` | 201 | `require_user_id` | `none` | `CreateCollectionInput` | `dynamic` | `400` | `apps/backend/app/api/routers/collections.py` | `create_collection` |
| x |   | GET | `/collections/{collection_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/collections.py` | `get_collection` |
| x |   | POST | `/collections/{collection_id}/mark-paid` | 200 | `require_user_id` | `none` | `MarkCollectionPaidInput` | `dynamic` | `-` | `apps/backend/app/api/routers/collections.py` | `mark_collection_paid` |
|   |   | POST | `/demo/seed` | 201 | `require_user_id` | `none` | `none` | `object` | `400,409` | `apps/backend/app/api/routers/demo.py` | `seed_demo` |
| x |   | GET | `/expenses` | 200 | `require_user_id` | `org_member` | `none` | `object` | `502` | `apps/backend/app/api/routers/expenses.py` | `list_expenses` |
| x |   | POST | `/expenses` | 201 | `require_user_id` | `none` | `CreateExpenseInput` | `dynamic` | `400` | `apps/backend/app/api/routers/expenses.py` | `create_expense` |
| x |   | DELETE | `/expenses/{expense_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/expenses.py` | `delete_expense` |
| x |   | GET | `/expenses/{expense_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/expenses.py` | `get_expense` |
| x |   | PATCH | `/expenses/{expense_id}` | 200 | `require_user_id` | `none` | `UpdateExpenseInput` | `dynamic` | `400` | `apps/backend/app/api/routers/expenses.py` | `update_expense` |
| x |   | GET | `/guests` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/guests.py` | `list_guests` |
| x |   | POST | `/guests` | 201 | `require_user_id` | `none` | `CreateGuestInput` | `dynamic` | `-` | `apps/backend/app/api/routers/guests.py` | `create_guest` |
| x |   | DELETE | `/guests/{guest_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/guests.py` | `delete_guest` |
| x |   | GET | `/guests/{guest_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/guests.py` | `get_guest` |
| x |   | PATCH | `/guests/{guest_id}` | 200 | `require_user_id` | `none` | `UpdateGuestInput` | `dynamic` | `-` | `apps/backend/app/api/routers/guests.py` | `update_guest` |
| x |   | GET | `/health` | 200 | `none` | `none` | `none` | `object` | `-` | `apps/backend/app/api/routers/health.py` | `health` |
| x |   | GET | `/integration-events` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/integrations.py` | `list_integration_events` |
| x |   | POST | `/integration-events` | 201 | `require_user_id` | `none` | `none` | `dynamic` | `400` | `apps/backend/app/api/routers/integrations.py` | `create_integration_event` |
| x |   | GET | `/integration-events/{event_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `403` | `apps/backend/app/api/routers/integrations.py` | `get_integration_event` |
| x |   | POST | `/integrations/webhooks/{provider}` | 201 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/integrations.py` | `ingest_integration_webhook` |
| x |   | GET | `/leases` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/leases.py` | `list_leases` |
| x |   | POST | `/leases` | 201 | `require_user_id` | `none` | `CreateLeaseInput` | `object` | `-` | `apps/backend/app/api/routers/leases.py` | `create_lease` |
| x |   | GET | `/leases/{lease_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/leases.py` | `get_lease` |
| x |   | PATCH | `/leases/{lease_id}` | 200 | `require_user_id` | `none` | `UpdateLeaseInput` | `dynamic` | `-` | `apps/backend/app/api/routers/leases.py` | `update_lease` |
| x |   | GET | `/listings` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/channels.py` | `list_listings` |
| x |   | POST | `/listings` | 201 | `require_user_id` | `none` | `CreateListingInput` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `create_listing` |
| x |   | DELETE | `/listings/{listing_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `delete_listing` |
| x |   | GET | `/listings/{listing_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `get_listing` |
| x |   | PATCH | `/listings/{listing_id}` | 200 | `require_user_id` | `none` | `UpdateListingInput` | `dynamic` | `-` | `apps/backend/app/api/routers/channels.py` | `update_listing` |
|   |   | POST | `/listings/{listing_id}/sync-ical` | 202 | `require_user_id` | `none` | `none` | `object` | `502` | `apps/backend/app/api/routers/channels.py` | `sync_listing_ical` |
| x | x | GET | `/marketplace/listings` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/marketplace.py` | `list_marketplace_listings` |
| x | x | POST | `/marketplace/listings` | 201 | `require_user_id` | `none` | `CreateMarketplaceListingInput` | `dynamic` | `400` | `apps/backend/app/api/routers/marketplace.py` | `create_marketplace_listing` |
| x | x | GET | `/marketplace/listings/{marketplace_listing_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/marketplace.py` | `get_marketplace_listing` |
| x | x | PATCH | `/marketplace/listings/{marketplace_listing_id}` | 200 | `require_user_id` | `none` | `UpdateMarketplaceListingInput` | `dynamic` | `400` | `apps/backend/app/api/routers/marketplace.py` | `update_marketplace_listing` |
| x | x | POST | `/marketplace/listings/{marketplace_listing_id}/publish` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/marketplace.py` | `publish_marketplace_listing` |
| x |   | GET | `/me` | 200 | `require_supabase_user` | `none` | `none` | `object` | `-` | `apps/backend/app/api/routers/identity.py` | `me` |
| x |   | GET | `/message-templates` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/messaging.py` | `list_templates` |
| x |   | POST | `/message-templates` | 201 | `require_user_id` | `none` | `CreateMessageTemplateInput` | `dynamic` | `-` | `apps/backend/app/api/routers/messaging.py` | `create_template` |
| x |   | GET | `/message-templates/{template_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/messaging.py` | `get_template` |
| x |   | POST | `/messages/send` | 202 | `require_user_id` | `none` | `SendMessageInput` | `dynamic` | `-` | `apps/backend/app/api/routers/messaging.py` | `send_message` |
| x |   | POST | `/organization-invites/accept` | 200 | `require_supabase_user` | `none` | `AcceptOrganizationInviteInput` | `object` | `400,403,404,409,410,500,502` | `apps/backend/app/api/routers/organizations.py` | `accept_invite` |
| x |   | GET | `/organizations` | 200 | `require_supabase_user` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/organizations.py` | `list_organizations` |
| x |   | POST | `/organizations` | 201 | `require_supabase_user` | `none` | `CreateOrganizationInput` | `dynamic` | `-` | `apps/backend/app/api/routers/organizations.py` | `create_organization` |
| x |   | DELETE | `/organizations/{org_id}` | 200 | `require_supabase_user` | `none` | `none` | `dynamic` | `403` | `apps/backend/app/api/routers/organizations.py` | `delete_organization` |
| x |   | GET | `/organizations/{org_id}` | 200 | `require_supabase_user` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/organizations.py` | `get_organization` |
| x |   | PATCH | `/organizations/{org_id}` | 200 | `require_supabase_user` | `none` | `UpdateOrganizationInput` | `dynamic` | `403` | `apps/backend/app/api/routers/organizations.py` | `update_organization` |
| x |   | GET | `/organizations/{org_id}/invites` | 200 | `require_supabase_user` | `none` | `none` | `object` | `-` | `apps/backend/app/api/routers/organizations.py` | `list_invites` |
| x |   | POST | `/organizations/{org_id}/invites` | 201 | `require_supabase_user` | `none` | `CreateOrganizationInviteInput` | `dynamic` | `400,409` | `apps/backend/app/api/routers/organizations.py` | `create_invite` |
| x |   | DELETE | `/organizations/{org_id}/invites/{invite_id}` | 200 | `require_supabase_user` | `none` | `none` | `dynamic` | `404` | `apps/backend/app/api/routers/organizations.py` | `revoke_invite` |
| x |   | GET | `/organizations/{org_id}/members` | 200 | `require_supabase_user` | `org_member` | `none` | `object` | `502` | `apps/backend/app/api/routers/organizations.py` | `list_members` |
| x |   | POST | `/organizations/{org_id}/members` | 201 | `require_supabase_user` | `none` | `CreateOrganizationMemberInput` | `dynamic` | `-` | `apps/backend/app/api/routers/organizations.py` | `add_member` |
| x |   | DELETE | `/organizations/{org_id}/members/{member_user_id}` | 200 | `require_supabase_user` | `none` | `none` | `dynamic` | `403,404,409,502` | `apps/backend/app/api/routers/organizations.py` | `delete_member` |
| x |   | PATCH | `/organizations/{org_id}/members/{member_user_id}` | 200 | `require_supabase_user` | `none` | `UpdateOrganizationMemberInput` | `dynamic` | `403,404,502` | `apps/backend/app/api/routers/organizations.py` | `update_member` |
| x | x | GET | `/owner-statements` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/owner_statements.py` | `list_owner_statements` |
| x | x | POST | `/owner-statements` | 201 | `require_user_id` | `none` | `CreateOwnerStatementInput` | `dynamic` | `-` | `apps/backend/app/api/routers/owner_statements.py` | `create_owner_statement` |
| x | x | GET | `/owner-statements/{statement_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/owner_statements.py` | `get_owner_statement` |
| x | x | POST | `/owner-statements/{statement_id}/finalize` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/owner_statements.py` | `finalize_owner_statement` |
| x |   | GET | `/pricing/templates` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/pricing.py` | `list_pricing_templates` |
| x |   | POST | `/pricing/templates` | 201 | `require_user_id` | `none` | `CreatePricingTemplateInput` | `dynamic` | `-` | `apps/backend/app/api/routers/pricing.py` | `create_pricing_template` |
| x |   | GET | `/pricing/templates/{template_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/pricing.py` | `get_pricing_template` |
| x |   | PATCH | `/pricing/templates/{template_id}` | 200 | `require_user_id` | `none` | `UpdatePricingTemplateInput` | `dynamic` | `-` | `apps/backend/app/api/routers/pricing.py` | `update_pricing_template` |
| x |   | GET | `/properties` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/properties.py` | `list_properties` |
| x |   | POST | `/properties` | 201 | `require_user_id` | `none` | `CreatePropertyInput` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `create_property` |
| x |   | DELETE | `/properties/{property_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `delete_property` |
| x |   | GET | `/properties/{property_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `get_property` |
| x |   | PATCH | `/properties/{property_id}` | 200 | `require_user_id` | `none` | `UpdatePropertyInput` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `update_property` |
| x |   | GET | `/public/ical/{token}.ics` | 200 | `none` | `none` | `none` | `dynamic` | `400,404` | `apps/backend/app/api/routers/public_ical.py` | `export_ical` |
| x | x | POST | `/public/marketplace/applications` | 201 | `none` | `none` | `PublicMarketplaceApplicationInput` | `object` | `400` | `apps/backend/app/api/routers/marketplace.py` | `submit_public_marketplace_application` |
| x | x | GET | `/public/marketplace/listings` | 200 | `none` | `none` | `none` | `object` | `-` | `apps/backend/app/api/routers/marketplace.py` | `list_public_marketplace_listings` |
| x | x | GET | `/public/marketplace/listings/{slug}` | 200 | `none` | `none` | `none` | `dynamic` | `404` | `apps/backend/app/api/routers/marketplace.py` | `get_public_marketplace_listing` |
| x | x | POST | `/public/marketplace/listings/{slug}/apply-start` | 200 | `none` | `none` | `none` | `object` | `404` | `apps/backend/app/api/routers/marketplace.py` | `start_public_marketplace_application` |
| x | x | POST | `/public/marketplace/listings/{slug}/contact-whatsapp` | 200 | `none` | `none` | `none` | `object` | `404` | `apps/backend/app/api/routers/marketplace.py` | `track_public_marketplace_whatsapp_contact` |
| x | x | GET | `/reports/operations-summary` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/reports.py` | `operations_summary_report` |
| x | x | GET | `/reports/owner-summary` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/reports.py` | `owner_summary_report` |
| x | x | GET | `/reports/summary` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/reports.py` | `owner_summary_report` |
| x | x | GET | `/reports/transparency-summary` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/reports.py` | `transparency_summary_report` |
| x | x | GET | `/reservations` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/reservations.py` | `list_reservations` |
| x | x | POST | `/reservations` | 201 | `require_user_id` | `none` | `CreateReservationInput` | `dynamic` | `409` | `apps/backend/app/api/routers/reservations.py` | `create_reservation` |
| x | x | GET | `/reservations/{reservation_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/reservations.py` | `get_reservation` |
| x | x | PATCH | `/reservations/{reservation_id}` | 200 | `require_user_id` | `none` | `UpdateReservationInput` | `dynamic` | `-` | `apps/backend/app/api/routers/reservations.py` | `update_reservation` |
| x | x | POST | `/reservations/{reservation_id}/status` | 200 | `require_user_id` | `none` | `ReservationStatusInput` | `dynamic` | `422` | `apps/backend/app/api/routers/reservations.py` | `transition_status` |
| x |   | GET | `/tasks` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/tasks.py` | `list_tasks` |
| x |   | POST | `/tasks` | 201 | `require_user_id` | `none` | `CreateTaskInput` | `dynamic` | `-` | `apps/backend/app/api/routers/tasks.py` | `create_task` |
| x |   | GET | `/tasks/{task_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/tasks.py` | `get_task` |
| x |   | PATCH | `/tasks/{task_id}` | 200 | `require_user_id` | `none` | `UpdateTaskInput` | `dynamic` | `-` | `apps/backend/app/api/routers/tasks.py` | `update_task` |
| x |   | POST | `/tasks/{task_id}/complete` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `400` | `apps/backend/app/api/routers/tasks.py` | `complete_task` |
| x |   | GET | `/tasks/{task_id}/items` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/tasks.py` | `list_task_items` |
| x |   | POST | `/tasks/{task_id}/items` | 201 | `require_user_id` | `none` | `CreateTaskItemInput` | `dynamic` | `400` | `apps/backend/app/api/routers/tasks.py` | `create_task_item` |
| x |   | DELETE | `/tasks/{task_id}/items/{item_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `404` | `apps/backend/app/api/routers/tasks.py` | `delete_task_item` |
| x |   | PATCH | `/tasks/{task_id}/items/{item_id}` | 200 | `require_user_id` | `none` | `UpdateTaskItemInput` | `dynamic` | `400,404` | `apps/backend/app/api/routers/tasks.py` | `update_task_item` |
| x |   | GET | `/units` | 200 | `require_user_id` | `org_member` | `none` | `object` | `-` | `apps/backend/app/api/routers/properties.py` | `list_units` |
| x |   | POST | `/units` | 201 | `require_user_id` | `none` | `CreateUnitInput` | `dynamic` | `400,409` | `apps/backend/app/api/routers/properties.py` | `create_unit` |
| x |   | DELETE | `/units/{unit_id}` | 200 | `require_user_id` | `none` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `delete_unit` |
| x |   | GET | `/units/{unit_id}` | 200 | `require_user_id` | `org_member` | `none` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `get_unit` |
| x |   | PATCH | `/units/{unit_id}` | 200 | `require_user_id` | `none` | `UpdateUnitInput` | `dynamic` | `-` | `apps/backend/app/api/routers/properties.py` | `update_unit` |

## Notes

- `Migrated` is derived from a curated Rust migration allowlist in `scripts/migration/build_route_matrix.py`.
- This matrix is generated from live FastAPI router source and is the canonical migration checklist.
