-- Performance indexes for common query patterns
-- 2026-02-15

-- organization_members: used in every auth/membership check
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON organization_members (user_id);

-- tasks: task list queries filtered by org + status
CREATE INDEX IF NOT EXISTS idx_tasks_org_status
  ON tasks (organization_id, status);

-- audit_logs: audit queries filtered by org + time
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON audit_logs (organization_id, created_at DESC);

-- reservations: calendar and availability queries
CREATE INDEX IF NOT EXISTS idx_reservations_org_checkin
  ON reservations (organization_id, check_in_date);

-- collection_records: collection status queries
CREATE INDEX IF NOT EXISTS idx_collection_records_org_status
  ON collection_records (organization_id, status);

-- leases: active leases by org
CREATE INDEX IF NOT EXISTS idx_leases_org_status
  ON leases (organization_id, lease_status);

-- listings: marketplace active listings
CREATE INDEX IF NOT EXISTS idx_listings_org_active
  ON listings (organization_id) WHERE is_active = true;

-- units: property lookup
CREATE INDEX IF NOT EXISTS idx_units_property_id
  ON units (property_id);

-- integration_events: event lookup by provider
CREATE INDEX IF NOT EXISTS idx_integration_events_provider
  ON integration_events (provider, created_at DESC);

-- Drop duplicate index on calendar_blocks (identical to calendar_blocks_no_overlap constraint)
DROP INDEX IF EXISTS idx_calendar_blocks_period_gist;

-- ============================================================
-- Foreign key covering indexes (flagged by Supabase Performance Advisor)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_by ON ai_chat_messages (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chats_created_by ON ai_chats (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_application_events_actor ON application_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_application_submissions_assigned ON application_submissions (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_created_by ON calendar_blocks (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_created_by ON collection_records (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_records_lease_charge ON collection_records (lease_charge_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents (uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses (property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unit ON expenses (unit_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_org ON integration_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_leases_application ON leases (application_id);
CREATE INDEX IF NOT EXISTS idx_leases_created_by ON leases (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_leases_property ON leases (property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_task ON maintenance_requests (task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit ON maintenance_requests (unit_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_by ON marketplace_listings (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_listing ON marketplace_listings (listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_pricing_tpl ON marketplace_listings (pricing_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_property ON marketplace_listings (property_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_unit ON marketplace_listings (unit_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_guest ON message_logs (guest_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_reservation ON message_logs (reservation_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_template ON message_logs (template_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_template ON notification_rules (message_template_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_plan ON org_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_accepted_by ON organization_invites (accepted_by_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_created_by ON organization_invites (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_revoked_by ON organization_invites (revoked_by_user_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_property ON owner_statements (property_id);
CREATE INDEX IF NOT EXISTS idx_owner_statements_unit ON owner_statements (unit_id);
CREATE INDEX IF NOT EXISTS idx_payment_instructions_created_by ON payment_instructions (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_instructions_lease ON payment_instructions (lease_id);
CREATE INDEX IF NOT EXISTS idx_pricing_templates_created_by ON pricing_templates (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_listing ON reservations (listing_id);
CREATE INDEX IF NOT EXISTS idx_task_items_completed_by ON task_items (completed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_property ON tasks (property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_unit ON tasks (unit_id);
