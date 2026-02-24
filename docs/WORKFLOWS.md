# Casaora Platform Workflows

> Comprehensive reference for all manual, AI agentic, and automated workflows across the platform.
> Generated from source analysis of 48 route files, 87 agent tools, 14+ scheduled jobs, and 94 admin pages.

---

## Table of Contents

1. [Property Management](#1-property-management)
2. [Units & Listings](#2-units--listings)
3. [Leasing & Applications](#3-leasing--applications)
4. [Reservations & Calendar](#4-reservations--calendar)
5. [Maintenance & Vendor Dispatch](#5-maintenance--vendor-dispatch)
6. [Financial Operations](#6-financial-operations)
7. [Guest & Tenant Management](#7-guest--tenant-management)
8. [Messaging & Notifications](#8-messaging--notifications)
9. [AI Agent System](#9-ai-agent-system)
10. [Voice Agent](#10-voice-agent)
11. [Vision AI (Inspections)](#11-vision-ai-inspections)
12. [IoT & Smart Lock](#12-iot--smart-lock)
13. [Portfolio Intelligence](#13-portfolio-intelligence)
14. [Predictive Intelligence](#14-predictive-intelligence)
15. [Autonomous Operations](#15-autonomous-operations)
16. [Platform Administration & Billing](#16-platform-administration--billing)
17. [Workflow Engine & Automation Rules](#17-workflow-engine--automation-rules)
18. [Background Scheduler](#18-background-scheduler)
19. [Appendix: Agent Tool → Approval Requirement Cross-Reference](#19-appendix-agent-tool--approval-requirement-cross-reference)

---

## 1. Property Management

**Summary:** Core property CRUD with hierarchy (floors, units, spaces, beds), CSV import, and multi-property portfolio support.

### Manual Workflows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/properties` | GET | List properties with filters |
| `/properties` | POST | Create new property |
| `/properties/import-csv` | POST | Bulk import properties from CSV |
| `/properties/{id}` | GET | Get property details |
| `/properties/{id}` | PATCH | Update property |
| `/properties/{id}` | DELETE | Delete property |
| `/properties/{id}/hierarchy` | GET | Get full property hierarchy (floors → units → spaces → beds) |

### Frontend Pages

- `/module/properties` — Property list with create/edit sheets

### Key Files

- `routes/properties.rs` — Property + unit CRUD routes
- `routes/mod.rs` — Route registration

---

## 2. Units & Listings

**Summary:** Unit management within properties, marketplace listings with readiness scoring, public booking pages, and iCal sync.

### Manual Workflows — Units

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/units` | GET | List units with filters |
| `/units` | POST | Create unit |
| `/units/{id}` | GET | Get unit details |
| `/units/{id}` | PATCH | Update unit |
| `/units/{id}` | DELETE | Delete unit |
| `/units/bulk-update` | POST | Bulk update units with dry-run support |

### Manual Workflows — Listings

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/listings` | GET | List org's listings |
| `/listings` | POST | Create listing |
| `/listings/{id}` | GET | Get listing detail |
| `/listings/{id}` | PATCH | Update listing |
| `/listings/{id}/readiness` | GET | Get listing readiness report |
| `/listings/{id}/publish` | POST | Publish listing |
| `/listings/slug-available` | GET | Check slug availability |
| `/public/listings` | GET | Public: browse published listings (cached) |
| `/public/listings/{slug}` | GET | Public: view listing by slug |
| `/public/listings/{slug}/availability` | GET | Public: availability calendar |
| `/public/listings/{slug}/inquire` | POST | Public: submit inquiry |
| `/public/listings/{slug}/apply-start` | POST | Public: track application start |
| `/public/listings/{slug}/contact-whatsapp` | POST | Public: track WhatsApp contact click |
| `/public/listings/applications` | POST | Public: submit application |
| `/public/saved-searches` | GET/POST/DELETE | Public: saved search management |

### Manual Workflows — Booking

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/booking/{org_slug}` | GET | Public: get booking page data |
| `/public/booking/{org_slug}/availability` | GET | Public: check availability for dates |
| `/public/booking/{org_slug}/calendar` | GET | Public: month calendar grid |
| `/public/booking/{org_slug}/reserve` | POST | Public: create booking + guest record |

### Frontend Pages

- `/module/units` — Unit list
- `/module/listings` — Listing management

### Key Files

- `routes/properties.rs` — Unit routes
- `routes/marketplace.rs` — Listing + public marketplace routes
- `routes/booking.rs` — Public booking engine

---

## 3. Leasing & Applications

**Summary:** Full leasing pipeline from application intake through screening, qualification, tour scheduling, offer generation, lease creation, renewal, and compliance checking. Supports Paraguayan regulatory requirements.

### Manual Workflows — Leases

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/leases` | GET | List leases with filters |
| `/leases` | POST | Create lease with optional charges and collection schedule |
| `/leases/rent-roll` | GET | Rent roll calendar view with turnover buffers |
| `/leases/{id}` | GET | Get lease with charges and collections |
| `/leases/{id}` | PATCH | Update lease, recalculate totals |
| `/leases/{id}/renew` | POST | Send renewal offer to tenant |
| `/leases/{id}/renewal-accept` | POST | Accept renewal and create new lease |

### Manual Workflows — Applications

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/applications` | GET | List applications with status/assignment filters |
| `/applications/{id}` | GET | Get application with event history |
| `/applications/{id}/status` | POST | Update application status with SLA tracking |
| `/applications/{id}/convert-to-lease` | POST | Convert application to active lease |

### AI Agentic Workflows — Leasing Agent

| Tool | Description | Approval |
|------|-------------|----------|
| `match_applicant_to_units` | Rank units by budget, bedrooms, amenities | No |
| `auto_qualify_lead` | Score lead on income-to-rent ratio, docs, employment, guarantor (40/25/20/15%) | No |
| `schedule_property_viewing` | Create tour, check conflicts, send confirmation | No |
| `send_tour_reminder` | WhatsApp reminder 24h before viewing | No |
| `advance_application_stage` | Move through funnel: screening → qualified → visit_scheduled → offer_sent → signed | No |
| `generate_lease_offer` | Calculate move-in costs from pricing template | No |
| `send_application_update` | Queue WhatsApp/email status update | No |
| `score_application` | Rule-based screening: income (30pt) + employment (25pt) + references (20pt) + guarantor (15pt) + completeness (10pt) | No |

### AI Agentic Workflows — Lease Abstraction

| Tool | Description | Approval |
|------|-------------|----------|
| `abstract_lease_document` | Extract 40+ fields from lease PDF via gpt-4o-mini | No |
| `check_lease_compliance` | Validate against 8 compliance rule categories | No |
| `check_paraguayan_compliance` | Paraguay-specific checks (RUC, IVA, guarantor, min term) | No |
| `track_lease_deadlines` | Create deadline alerts (expiry, renewal notice at 60d) | No |
| `auto_populate_lease_charges` | Generate charges from abstracted rent/deposit/IVA | **Yes** |
| `check_document_expiry` | Flag documents expiring within N days | No |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| Lease Renewal Scan | 07:00 | Daily | Check 60d/30d renewal milestones, send offers/reminders |
| Stalled Application Scan | 09:00 | Daily | Flag apps in 'new'/'submitted' status >48h |
| Lease Deadline Alert Scan | 08:30 | Daily | Paraguayan compliance deadline alerts |

### Frontend Pages

- `/module/leases` — Lease list and management
- `/module/applications` — Application pipeline

### Key Files

- `routes/leases.rs`, `routes/applications.rs`
- `services/leasing_agent.rs`, `services/lease_abstraction.rs`, `services/lease_renewal.rs`

---

## 4. Reservations & Calendar

**Summary:** Short-term reservation management with status transitions, deposit lifecycle, calendar blocking, cancellation policies, and guest portal access.

### Manual Workflows — Reservations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/reservations` | GET | List reservations with filters |
| `/reservations` | POST | Create reservation with overlap detection |
| `/reservations/{id}` | GET | Get reservation details |
| `/reservations/{id}` | PATCH | Update reservation |
| `/reservations/{id}/status` | POST | Transition status (auto-generates turnover tasks) |
| `/reservations/{id}/refund-deposit` | POST | Mark deposit as refunded |
| `/reservations/{id}/guest-portal-link` | POST | Generate and send guest portal magic link via WhatsApp |
| `/reservations/{id}/guests` | GET | List accompanying guests |
| `/reservations/{id}/guests` | POST | Add accompanying guest |
| `/reservations/{id}/guests/{rid}` | DELETE | Remove accompanying guest |

### Manual Workflows — Calendar

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/calendar/availability` | GET | Get unavailable periods (reservations + blocks) |
| `/calendar/blocks` | GET/POST | List/create calendar blocks with overlap detection |
| `/calendar/blocks/{id}` | GET/PATCH/DELETE | Calendar block CRUD |

### Manual Workflows — Deposits

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/deposits/reservation/{id}` | GET | Get deposit status and events |
| `/deposits/collect` | POST | Collect deposit |
| `/deposits/hold` | POST | Place hold on collected deposit |
| `/deposits/release/{id}` | POST | Release held deposit |
| `/deposits/forfeit/{id}` | POST | Forfeit deposit (non-refundable) |

### Manual Workflows — Cancellation Policies

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cancellation-policies` | GET/POST | List/create policies |
| `/cancellation-policies/{id}` | GET/PATCH | Policy detail/update |

### Frontend Pages

- `/module/reservations` — Reservation list
- `/module/calendar` — Calendar view with blocks

### Key Files

- `routes/reservations.rs`, `routes/calendar.rs`, `routes/deposits.rs`, `routes/cancellation_policies.rs`

---

## 5. Maintenance & Vendor Dispatch

**Summary:** Maintenance request lifecycle from submission through AI classification, vendor scoring (40/30/20/10 weighted formula), dispatch, SLA monitoring, and completion verification. Includes public tenant submission endpoint.

### Manual Workflows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/maintenance-requests` | GET | List maintenance requests with filters |
| `/maintenance-requests/{id}` | GET | Get maintenance request details |
| `/maintenance-requests/{id}` | PATCH | Update status, send WhatsApp notifications |
| `/public/maintenance-request` | POST | Public: tenant submits maintenance request |

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `classify_maintenance_request` | Keyword-based urgency/category classification (0.75 confidence) | No |
| `auto_assign_maintenance` | Weighted scoring: specialty 40% + rating 30% + availability 20% + proximity 10% | No |
| `create_maintenance_task` | Create task from request with urgency assessment | No |
| `dispatch_to_vendor` | Assign to vendor, create work order, send WhatsApp | **Yes** |
| `verify_completion` | Verify work order, update vendor stats (completion rate, avg rating) | **Yes** |
| `check_maintenance_sla` | Scan open requests for SLA breaches | No |
| `escalate_maintenance` | Escalate to critical urgency | No |
| `request_vendor_quote` | Queue WhatsApp/email quote request to vendor | No |
| `select_vendor` | List top 5 vendors by category, sorted by rating | No |
| `get_vendor_performance` | Get vendor metrics: rating, completion rate, response time | No |

### SLA Thresholds

| Urgency | Response SLA | Resolution SLA |
|---------|-------------|----------------|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 24 hours | 72 hours |
| Low | 48 hours | 168 hours |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| SLA Breach Scan | 05:00 | Daily | Flag tasks where `sla_due_at <= now()`, fire `task_overdue_24h` |
| Maintenance SLA Monitoring | 10:30 | Daily | Mark maintenance_requests with breached response/resolution SLAs |

### Frontend Pages

- `/module/maintenance` — Maintenance request list and management

### Key Files

- `routes/maintenance.rs`
- `services/maintenance_dispatch.rs`

---

## 6. Financial Operations

**Summary:** Collections lifecycle (D-3 activate → D-day due → D+3 late → D+7 escalate), expense tracking with multi-currency, bank reconciliation (3-pass fuzzy matching), dynamic ML pricing, owner statement generation, and payment processing (Stripe + Mercado Pago).

### Manual Workflows — Collections

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/collections` | GET | List collections with status/lease/date filters |
| `/collections` | POST | Create collection record |
| `/collections/{id}` | GET | Get collection with enriched lease data |
| `/collections/{id}/mark-paid` | POST | Mark paid, update lease status, trigger workflows |

### Manual Workflows — Expenses

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/expenses` | GET | List expenses with category/currency/date/vendor filters |
| `/expenses` | POST | Create expense with receipt, auto-categorization, FX rates |
| `/expenses/{id}` | GET/PATCH/DELETE | Expense CRUD |
| `/expenses/{id}/approve` | POST | Approve expense (owner_admin) |
| `/expenses/{id}/reject` | POST | Reject expense (owner_admin) |

### Manual Workflows — Owner Statements

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/owner-statements` | GET | List statements with status/property/unit filters |
| `/owner-statements` | POST | Create statement with breakdown (revenue, fees, expenses) |
| `/owner-statements/{id}` | GET | Get statement with line items and reconciliation |
| `/owner-statements/{id}/request-approval` | POST | Move draft → pending approval |
| `/owner-statements/{id}/approve` | POST | Approve (owner_admin) |
| `/owner-statements/{id}/finalize` | POST | Finalize (accountant/owner_admin) |

### Manual Workflows — Pricing

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pricing/templates` | GET/POST | List/create pricing templates with fee lines |
| `/pricing/templates/{id}` | GET/PATCH | Template CRUD |
| `/pricing/recommendations` | GET | List pricing recommendations |
| `/pricing/recommendations/{id}` | PATCH | Update recommendation status (approved/dismissed/applied) |

### Manual Workflows — Payments

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/collections/{id}/payment-link` | POST | Create payment instruction |
| `/payment-instructions` | GET | List payment instructions |
| `/public/payment/{ref}/checkout` | POST | Public: Stripe checkout session |
| `/public/payment/{ref}/mercado-pago` | POST | Public: Mercado Pago checkout |
| `/webhooks/stripe` | POST | Stripe webhook handler |
| `/webhooks/mercado-pago` | POST | Mercado Pago webhook handler |

### AI Agentic Workflows — Reconciliation

| Tool | Description | Approval |
|------|-------------|----------|
| `import_bank_transactions` | Import bank CSV as JSON array, skip duplicates | **Yes** |
| `auto_reconcile_batch` | 3-pass matching: exact ref → amount+date → fuzzy name | **Yes** |
| `auto_reconcile_all` | Reconcile all pending collections against payments | No |
| `handle_split_payment` | Match multiple bank txns to single collection | **Yes** |
| `reconcile_collections` | Match payments against expected amounts | No |
| `categorize_expense` | Categorize expense into standard PMS category | No |

### AI Agentic Workflows — Dynamic Pricing

| Tool | Description | Approval |
|------|-------------|----------|
| `generate_pricing_recommendations` | Analyze RevPAR/ADR, occupancy gaps, seasonal patterns | No |
| `apply_pricing_recommendation` | Apply recommendation to pricing template | No |
| `fetch_market_data` | Store competitor rates and demand indices | No |
| `simulate_rate_impact` | Revenue impact simulation (elasticity = -0.8) | No |

### AI Agentic Workflows — Financial Analytics

| Tool | Description | Approval |
|------|-------------|----------|
| `get_revenue_analytics` | RevPAN, ADR, occupancy rate, total revenue | No |
| `get_seasonal_demand` | Historical booking patterns for pricing optimization | No |
| `generate_owner_statement` | Generate draft owner statement for a month | No |
| `get_owner_statement_summary` | Summarize statements by status | No |
| `get_collections_risk` | Overdue/partially paid collection risk summary | No |

### 3-Pass Reconciliation Algorithm

| Pass | Method | Confidence |
|------|--------|-----------|
| 1 | Exact reference code match | 1.00 |
| 2 | Amount match (±0.01) + date within ±3 days | 0.85 |
| 3 | Amount within 5% + fuzzy tenant name in description | 0.70 |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| Daily Collection Cycle | 08:00 | Daily | D-3 activate, D-1/D-day/D+3 reminders, D+3 mark late, D+7 escalate |
| Daily Bank Reconciliation | 08:15 | Daily | Auto-reconcile pending collections (3-pass) |
| Daily Pricing Recommendations | 06:00 | Daily | ML pricing per active org (seasonal/demand/competitor) |
| Auto-Generate Owner Statements | 08:45 | Monthly (1st) | Generate monthly statements for all orgs |

### Frontend Pages

- `/module/collections` — Collection management
- `/module/expenses` — Expense tracking
- `/module/owner-statements` — Owner statement lifecycle
- `/module/pricing` — Pricing templates and recommendations

### Key Files

- `routes/collections.rs`, `routes/expenses.rs`, `routes/owner_statements.rs`, `routes/pricing.rs`, `routes/payments.rs`
- `services/reconciliation.rs`, `services/dynamic_pricing.rs`, `services/collection_cycle.rs`

---

## 7. Guest & Tenant Management

**Summary:** Guest lifecycle with verification (admin + self-service), background checks, tenant portal (magic-link auth) with payment submission, maintenance requests, and document access. Multi-portal architecture (guest, owner, vendor).

### Manual Workflows — Guests

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/guests` | GET/POST | List/create guests |
| `/guests/{id}` | GET/PATCH/DELETE | Guest CRUD |
| `/guests/{id}/background-check` | PATCH | Update background check status |
| `/guests/{id}/verification` | POST | Admin submits verification documents |
| `/guests/{id}/verification` | PATCH | Admin reviews/approves verification |
| `/public/guest-verification/{id}` | POST | Public: guest self-submits verification |

### Manual Workflows — Tenant Portal

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/tenant/request-access` | POST | Generate magic link for tenant portal |
| `/public/tenant/verify` | POST | Verify magic link token |
| `/tenant/me` | GET | Tenant dashboard (lease, property, unit, next payment) |
| `/tenant/payments` | GET | Payment history with instruction links |
| `/tenant/payment-instructions/{id}` | GET | Payment instructions and bank details |
| `/tenant/payments/{id}/submit` | POST | Submit payment reference/receipt, notify owner |
| `/tenant/maintenance-requests` | GET/POST | Tenant maintenance request list/create |
| `/tenant/documents` | GET | Lease-linked documents |
| `/tenant/messages` | GET | Message history |

### Manual Workflows — Guest Portal

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/guest/request-access` | POST | Request magic link |
| `/public/guest/verify` | POST | Verify token |
| `/guest/itinerary` | GET | Reservation, guest, unit, property info |
| `/guest/messages` | GET/POST | Message history, send message |
| `/guest/checkin-info` | GET | Check-in details (WiFi, lock codes, instructions) |
| `/guest/request-service` | POST | Submit service request (creates task) |
| `/guest/payment-info` | GET | Pending payment instructions |
| `/guest/access-codes` | GET | Access codes (checked_in only) |

### Manual Workflows — Owner Portal

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/owner/request-access` | POST | Request magic link |
| `/owner/dashboard` | GET | Summary, revenue, upcoming reservations |
| `/owner/statements` | GET | List owner statements |
| `/owner/statements/{id}` | GET | Statement detail with collections + expenses |
| `/owner/properties` | GET | Owner's properties |
| `/owner/reservations` | GET | Owner's reservations |
| `/owner/payout-history` | GET | Finalized statements with payouts |
| `/owner/property-performance` | GET | Per-property metrics (occupancy, ADR, RevPAR) |

### Manual Workflows — Vendor Portal

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/public/vendor/request-access` | POST | Generate vendor access link |
| `/vendor/jobs` | GET | List assigned maintenance tasks |
| `/vendor/jobs/{id}` | GET/PATCH | Job detail/update |
| `/vendor/jobs/{id}/complete` | POST | Mark job as complete |

### Frontend Pages

- `/module/guests` — Guest management

### Key Files

- `routes/guests.rs`, `routes/tenant.rs`, `routes/guest_portal.rs`, `routes/owner_portal.rs`, `routes/vendor_portal.rs`
- `services/tenant_screening.rs`

---

## 8. Messaging & Notifications

**Summary:** Omnichannel messaging (WhatsApp, email, SMS) with template variable substitution, communication sequences (drip campaigns), notification rules with event triggers, WhatsApp webhook inbound processing, and in-app notification center.

### Manual Workflows — Messaging

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/message-logs` | GET | List message logs (channel, status, direction, guest) |
| `/message-templates` | GET/POST | List/create message templates |
| `/message-templates/{id}` | GET | Get template |
| `/messages/send` | POST | Queue message for sending |
| `/webhooks/whatsapp` | GET/POST | WhatsApp webhook verify + inbound handler |

### Manual Workflows — Sequences

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/communication-sequences` | GET/POST | List/create communication sequences |
| `/communication-sequences/{id}` | GET/PATCH/DELETE | Sequence CRUD |
| `/communication-sequences/{id}/steps` | GET/POST | List/create sequence steps |
| `/sequence-steps/{id}` | PATCH/DELETE | Step CRUD |
| `/sequence-enrollments` | GET | List enrollments (entity_type, status) |

### Manual Workflows — Notification Rules

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/notification-rules` | GET/POST | List/create notification rules |
| `/notification-rules/metadata` | GET | Available trigger types and channels |
| `/notification-rules/{id}` | GET/PATCH | Rule CRUD |

### Manual Workflows — Notification Center

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/notifications` | GET | List user notifications |
| `/notifications/unread-count` | GET | Unread count |
| `/notifications/{id}/read` | POST | Mark read |
| `/notifications/read-all` | POST | Mark all read |
| `/push-tokens` | POST | Register mobile push token |
| `/push-tokens/deactivate` | POST | Deactivate push token |

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `send_message` | Send message via WhatsApp, email, or SMS | No |

### Internal Cron Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/internal/process-messages` | Process queued messages (retry up to 3x) |
| `/internal/collection-cycle` | Activate, remind, mark late, escalate collections |
| `/internal/sync-ical` | Sync all iCal integrations |
| `/internal/process-sequences` | Process communication sequences |
| `/internal/process-notifications` | Process notification rules |
| `/internal/notifications-retention` | Purge old notifications |

### Frontend Pages

- `/module/messaging` — Message logs
- `/module/notification-rules` — Notification rule management
- `/module/sequences` — Communication sequences
- `/module/notifications` — Notification settings

### Key Files

- `routes/messaging.rs`, `routes/sequences.rs`, `routes/notifications.rs`, `routes/notification_center.rs`
- `services/messaging.rs`

---

## 9. AI Agent System

**Summary:** Multi-agent chat system with 87 tools, agent delegation, memory (store/recall), execution plans, escalation thresholds, approval gates for mutation tools, and agent configuration management. Supports both JSON responses and SSE streaming.

### Manual Workflows — Agent Chat

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agent/capabilities` | GET | Get agent capabilities by role |
| `/agent/chat` | POST | Send message to Operations Copilot |
| `/agent/agents` | GET | List available agent definitions |
| `/agent/models` | GET | List available AI models |
| `/agent/chats` | GET/POST | List/create chat sessions |
| `/agent/chats/{id}` | GET/DELETE | Chat CRUD |
| `/agent/chats/{id}/preferences` | PATCH | Update chat preferences (model) |
| `/agent/chats/{id}/messages` | GET/POST | List/send messages |
| `/agent/chats/{id}/messages/stream` | POST | Stream message response via SSE |
| `/agent/chats/{id}/archive` | POST | Archive chat |
| `/agent/chats/{id}/restore` | POST | Restore archived chat |

### Manual Workflows — Agent Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ai-agents` | GET | List all agents with tool counts |
| `/ai-agents/{slug}` | GET/PATCH | Get/update agent config (prompt, tools, active) |
| `/ai-agents/dashboard/stats` | GET | Dashboard: agent counts, approval stats, recent activity |

### Manual Workflows — Agent Tools

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agent/tool-definitions` | GET | Get AI SDK 6 compatible tool schemas |
| `/agent/execute-tool` | POST | Execute named tool with audit logging |

### Manual Workflows — Approvals

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agent/approvals` | GET | List pending approvals |
| `/agent/approvals/{id}/approve` | POST | Approve and execute tool |
| `/agent/approvals/{id}/reject` | POST | Reject approval |
| `/agent/approval-policies` | GET | List approval policies |
| `/agent/approval-policies/{tool}` | PATCH | Update approval policy (required/auto) |

### Manual Workflows — Agent Inbox

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/agent/inbox` | GET | Combined inbox: approvals, anomalies, tasks, leases, applications |

### AI Agentic Workflows — Core

| Tool | Description | Approval |
|------|-------------|----------|
| `list_tables` | List accessible database tables | No |
| `get_org_snapshot` | High-level table counts | No |
| `list_rows` | List rows with optional filters | No |
| `get_row` | Get row by ID | No |
| `create_row` | Create row in table | **Policy** |
| `update_row` | Update row in table | **Policy** |
| `delete_row` | Delete row in table | **Policy** |
| `delegate_to_agent` | Delegate question to specialist agent | No |
| `classify_and_delegate` | Classify intent and auto-delegate | No |
| `recall_memory` | Recall stored memories | No |
| `store_memory` | Store fact in agent memory | No |
| `create_execution_plan` | Decompose goal into numbered steps | No |
| `check_escalation_thresholds` | Check if action exceeds thresholds | No |
| `summarize_conversation` | Compress conversation into summary | No |
| `search_knowledge` | Search knowledge base (RAG) | No |
| `get_regulatory_guidance` | Search knowledge for regulations | No |
| `get_staff_availability` | Task load per staff member | No |

### Frontend Pages

- `/app/agents` — Multi-agent chat interface
- `/app/chats` — Chat history
- `/module/agent-config` — Agent configuration management
- `/module/agent-dashboard` — Agent health and statistics

### Key Files

- `routes/ai_agent.rs`, `routes/agent_chats.rs`, `routes/agent_management.rs`, `routes/agent_tools.rs`, `routes/approvals.rs`, `routes/agent_inbox.rs`
- `services/ai_agent.rs` — Tool definitions (~line 919), execute_tool (~line 2278)

---

## 10. Voice Agent

**Summary:** Twilio-powered IVR for tenants with Whisper transcription (Spanish), intent classification, multi-agent routing, and ElevenLabs TTS response generation.

### Manual Workflows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/voice/incoming` | POST | Twilio webhook: incoming call handler (TwiML, Spanish) |
| `/voice/status` | POST | Twilio callback: call status updates |

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `voice_lookup_caller` | Find guest/tenant by phone number | No |
| `voice_check_reservation` | Look up reservations for caller | No |
| `voice_create_maintenance_request` | Create maintenance ticket from voice call | **Yes** |
| `log_voice_interaction` | Store call metadata (duration, language, actions) | No |

### Voice Pipeline

1. Incoming call → Twilio webhook → gather speech
2. Whisper API transcription (Spanish)
3. Intent classification → route to specialist agent (maintenance-triage, finance-agent, leasing-agent, guest-concierge, supervisor)
4. Agent processes request → ElevenLabs TTS response (stability 0.5, similarity 0.75)
5. Log interaction to `voice_interactions` table

### Frontend Pages

- `/module/voice` — Voice interaction logs and configuration

### Key Files

- `routes/voice_agent.rs`
- `services/voice_agent.rs`

---

## 11. Vision AI (Inspections)

**Summary:** GPT-4o-powered property inspection analysis with room-by-room condition scoring (1-5), defect detection, move-in baseline tracking, comparative degradation analysis, and post-cleaning QA verification.

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `analyze_inspection_photos` | Vision AI room condition scores, defect detection | No |
| `compare_inspections` | Compare current vs. move-in baseline, calculate degradation | No |
| `create_defect_tickets` | Auto-create maintenance requests from defects | **Yes** |
| `verify_cleaning` | Post-cleaning photo validation (pass if score ≥ 4) | No |

### Inspection Types

- **Move-in** — Creates condition baselines per room
- **Move-out** — Compares against baselines, identifies degradation
- **Routine** — Periodic condition assessment
- **Cleaning verification** — QA check after turnover cleaning

### Frontend Pages

- `/module/inspections` — Inspection reports and history

### Key Files

- `services/vision_ai.rs`

---

## 12. IoT & Smart Lock

**Summary:** Smart lock access code lifecycle (generate, send, revoke), IoT sensor event processing with threshold monitoring, and automatic maintenance ticket creation for critical alerts (water leak, smoke, extreme temperatures).

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `generate_access_code` | Create time-limited code (temporary, permanent, one-time) | **Yes** |
| `send_access_code` | Send code to guest via WhatsApp/SMS/email | **Yes** |
| `revoke_access_code` | Revoke code by ID or all codes for unit | **Yes** |
| `process_sensor_event` | Log IoT event, check thresholds, auto-create tickets | No |
| `get_device_status` | Device summary: online/offline, battery, last_seen | No |

### Critical Event Thresholds

- **Water leak** → Immediate high-urgency maintenance ticket
- **Smoke detected** → Immediate critical maintenance ticket
- **Temperature extreme** → Maintenance ticket based on severity

### Frontend Pages

- `/module/integrations` — IoT device dashboard (within integrations page)

### Key Files

- `services/iot.rs`

---

## 13. Portfolio Intelligence

**Summary:** Cross-property analytics with KPIs (occupancy, RevPAR, NOI), property comparison rankings, historical trend tracking, heatmap outlier detection, performance digests, renovation ROI projection, and stress test simulation.

### Manual Workflows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/portfolio/kpis` | GET | Cross-property KPIs: units, occupancy, revenue, expenses, NOI, RevPAR |
| `/portfolio/comparison` | GET | Per-property metrics, sorted by revenue (up to 50) |
| `/portfolio/snapshots` | GET | Historical snapshots (up to 365 days) |
| `/portfolio/simulate` | POST | Investment scenario simulation (ROI, cap rate, break-even) |

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `get_portfolio_kpis` | Cross-property portfolio KPIs | No |
| `get_property_comparison` | Compare performance across properties | No |
| `get_portfolio_trends` | N-month KPI trends with growth % | No |
| `get_property_heatmap` | Rank properties, identify outliers (>1.5x or <0.5x avg) | No |
| `generate_performance_digest` | Weekly/monthly structured digest | No |
| `simulate_investment_scenario` | Project cash flows, NOI, ROI | No |
| `simulate_renovation_roi` | Payback period, cumulative gains | No |
| `simulate_stress_test` | Market downturn portfolio simulation | No |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| Portfolio Snapshots | 10:00 | Daily | Capture nightly performance snapshot per org |

### Frontend Pages

- `/module/portfolio` — Portfolio dashboard and analytics
- `/app/portfolio` — Portfolio overview

### Key Files

- `routes/portfolio.rs`
- `services/portfolio.rs`, `services/scenario_simulation.rs`

---

## 14. Predictive Intelligence

**Summary:** ML-powered tenant risk scoring, demand forecasting (90-day occupancy/ADR), anomaly detection with learned baselines (2σ rule), and risk radar aggregation across all prediction categories.

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `get_risk_radar` | Aggregated risk: predictions, high-risk counts, demand, anomalies | No |
| `forecast_demand` | 90-day occupancy/ADR forecast from 12-month patterns | No |
| `get_occupancy_forecast` | Predicted occupancy for upcoming months | No |
| `get_anomaly_alerts` | Active anomaly alerts for organization | No |
| `get_today_ops_brief` | Arrivals, departures, overdue tasks | No |
| `get_lease_risk_summary` | Near-term expirations and delinquencies | No |

### Anomaly Detection Rules

| Check | Threshold | Alert |
|-------|-----------|-------|
| Revenue drop | Current < 70% of 3-month avg | Warning |
| Expense spike | > 2σ above 6-month mean | Warning |
| Overdue tasks | >5 tasks >7 days overdue | Warning |
| Deposit held | >45 days in 'held' status | Warning |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| Anomaly Scan | 06:00 | Daily | Run 4 anomaly checks per active org |
| Weekly Demand Forecast | 11:00 | Weekly (Sun) | Generate demand forecasts per org |

### Frontend Pages

- `/module/reports` — Reports and anomaly alerts
- `/module/operations` — Operations dashboard

### Key Files

- `services/anomaly_detection.rs`, `services/tenant_screening.rs`
- `routes/reports.rs`

---

## 15. Autonomous Operations

**Summary:** Agent playbook execution (sequences of messages or tool calls), agent response evaluation (accuracy/helpfulness/safety scoring), supervisor fallback routing, and daily health metrics collection.

### Manual Workflows — Playbooks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/internal/agent-playbooks/run` | POST | Execute agent playbook (internal API key) |

### AI Agentic Workflows

| Tool | Description | Approval |
|------|-------------|----------|
| `execute_playbook` | Run playbook: sequence of agent steps | **Yes** |
| `evaluate_agent_response` | Score accuracy, helpfulness, safety | No |
| `get_agent_health` | Success rates, avg scores, latency, cost | No |

### Scheduled Jobs

| Job | UTC | Frequency | Purpose |
|-----|-----|-----------|---------|
| Run Scheduled Agent Playbooks | 09:30 | Daily | Execute playbooks where `next_run_at <= now()` |
| Daily Agent Health Metrics | 11:30 | Daily | Collect agent performance metrics |

### Frontend Pages

- `/module/agent-dashboard` — Agent health dashboard
- `/module/automations` — Playbook builder UI

### Key Files

- `routes/agent_playbooks.rs`
- `services/ai_agent.rs` (evaluate_agent_response, get_agent_health)

---

## 16. Platform Administration & Billing

**Summary:** Multi-tenant platform management (org suspension, stats), subscription plans with usage tracking, organization CRUD with invite/member management, referral codes, contract templates, and audit logging.

### Manual Workflows — Platform Admin

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/platform/organizations` | GET | List all orgs (platform admin) with subscription data |
| `/platform/organizations/{id}/suspend` | POST | Suspend organization |
| `/platform/stats` | GET | Platform KPIs: orgs, users, subscriptions, conversion rate |

### Manual Workflows — Billing

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/subscription-plans` | GET | List active plans (authenticated) |
| `/public/subscription-plans` | GET | List plans (public) |
| `/billing/current` | GET | Current subscription with usage metrics |
| `/billing/subscribe` | POST | Create/update subscription |
| `/billing/cancel` | POST | Cancel subscription |
| `/billing/usage` | GET | Usage summary for billing period |

### Manual Workflows — Organizations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/organizations` | GET/POST | List user's orgs / create org |
| `/organizations/{id}` | GET/PATCH/DELETE | Org CRUD |
| `/organizations/{id}/invites` | GET/POST | List/create invites |
| `/organizations/{id}/invites/{invite_id}` | DELETE | Revoke invite |
| `/organization-invites/accept` | POST | Accept invite by token |
| `/organizations/{id}/members` | GET/POST | List/add members |
| `/organizations/{id}/members/{uid}` | PATCH/DELETE | Update role / remove member |

### Manual Workflows — Identity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/me` | GET | Current user profile, memberships, organizations |

### Manual Workflows — Contract Templates

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/contract-templates` | GET/POST | List/create templates |
| `/contract-templates/{id}` | GET/PATCH/DELETE | Template CRUD |
| `/contract-templates/{id}/render` | POST | Render template with lease data |

### Manual Workflows — Referrals

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/referrals/my-code` | GET | Get/create referral code |
| `/referrals/generate` | POST | Generate fresh code |
| `/referrals/validate` | GET | Public: validate code |
| `/referrals/redeem` | POST | Redeem referral code |
| `/referrals/history` | GET | Redemption history |

### Manual Workflows — Audit & Documents

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/audit-logs` | GET | List audit logs (action, entity filters) |
| `/audit-logs/{id}` | GET | Get audit log entry |
| `/documents` | GET/POST | List/create documents |
| `/documents/{id}` | GET/DELETE | Document CRUD |
| `/documents/{id}/process` | POST | Split into chunks + generate embeddings |
| `/knowledge-documents` | GET/POST | Knowledge document management |
| `/knowledge-documents/{id}` | GET/DELETE | Knowledge doc CRUD |
| `/knowledge-documents/{id}/chunks` | GET | List document chunks |

### Frontend Pages

- `/module/billing` — Subscription management
- `/module/audit-logs` — Audit trail
- `/module/documents` — Document management
- `/module/knowledge` — Knowledge base (RAG)
- `/settings/organization` — Organization settings
- `/settings/team` — Team / member management
- `/settings/security` — Security settings
- `/settings/notifications` — Notification preferences

### Key Files

- `routes/platform.rs`, `routes/subscriptions.rs`, `routes/organizations.rs`, `routes/identity.rs`
- `routes/documents.rs`, `routes/contract_templates.rs`, `routes/referrals.rs`

---

## 17. Workflow Engine & Automation Rules

**Summary:** Event-driven workflow engine with configurable triggers, 9 action types, template variable substitution, durable job queue with retry (3 attempts, exponential backoff), round-robin assignment, and validated status transitions.

### Manual Workflows

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workflow-rules` | GET/POST | List/create workflow rules |
| `/workflow-rules/metadata` | GET | Available triggers, actions, config schemas |
| `/workflow-rules/{id}` | GET/PATCH/DELETE | Rule CRUD |
| `/workflow-rules/{id}/runs` | GET | List execution runs for rule |

### Supported Actions

| Action Type | Purpose |
|-------------|---------|
| `create_task` | Generate task from event context |
| `send_notification` | Queue multi-channel message |
| `send_whatsapp` | Queue WhatsApp message |
| `update_status` | Transition entity status (validated transitions) |
| `create_expense` | Record expense transaction |
| `assign_task_round_robin` | Fair task distribution by role |
| `run_agent_playbook` | Queue agent playbook execution |
| `request_agent_approval` | Create approval gate |
| `invoke_agent` | Call agent with context |

### Validated Status Transitions

- **Reservation:** pending → confirmed/cancelled → checked_in/cancelled/no_show → checked_out
- **Lease:** draft → active/terminated → delinquent/terminated/completed
- **Task:** todo → in_progress/done/cancelled

### Retry Policy

- Max 3 attempts per job
- Exponential backoff: 30s → 60s → 120s → 240s → 480s → 900s (capped at 15 min)
- Job deduplication via SHA-256 hash

### Frontend Pages

- `/module/workflow-rules` — Workflow rule management

### Key Files

- `routes/workflows.rs`
- `services/workflows.rs`

---

## 18. Background Scheduler

**Summary:** All scheduled jobs executed by the background scheduler service. Jobs are categorized as polled (continuous), recurring, or daily (run once at specified UTC time).

### Daily Jobs

| # | Job | UTC Time | Frequency | Service Function |
|---|-----|----------|-----------|------------------|
| 1 | SLA Breach Scan | 05:00 | Daily | `run_sla_breach_scan()` |
| 2 | Daily Pricing Recommendations | 06:00 | Daily | `run_daily_pricing_recommendations()` |
| 3 | Anomaly Scan | 06:00 | Daily | `run_anomaly_scan_all_orgs()` |
| 4 | Lease Renewal Scan | 07:00 | Daily | `run_lease_renewal_scan()` |
| 5 | Daily Collection Cycle | 08:00 | Daily | `run_daily_collection_cycle()` |
| 6 | Daily Bank Reconciliation | 08:15 | Daily | `run_daily_reconciliation()` |
| 7 | Lease Deadline Alert Scan | 08:30 | Daily | `run_daily_deadline_scan()` |
| 8 | Auto-Generate Owner Statements | 08:45 | Monthly (1st) | `auto_generate_monthly_statements()` |
| 9 | Stalled Application Scan | 09:00 | Daily | `run_stalled_application_scan()` |
| 10 | Run Scheduled Agent Playbooks | 09:30 | Daily | `run_scheduled_agent_playbooks()` |
| 11 | Portfolio Snapshots | 10:00 | Daily | `run_portfolio_snapshots()` |
| 12 | Maintenance SLA Monitoring | 10:30 | Daily | `run_maintenance_sla_scan()` |
| 13 | Weekly Demand Forecast | 11:00 | Weekly (Sun) | `run_weekly_demand_forecast()` |
| 14 | Daily Agent Health Metrics | 11:30 | Daily | `collect_daily_agent_health()` |

### Polled Jobs (Continuous)

| Job | Interval | Service Function |
|-----|----------|------------------|
| Workflow Job Processor | 30s min | `process_workflow_jobs(pool, 100)` |
| iCal Sync | 5 min | `sync_all_ical_integrations()` |

### Key Files

- `services/scheduler.rs`

---

## 19. Appendix: Agent Tool → Approval Requirement Cross-Reference

### Tools Requiring Explicit Approval (12)

These tools always require human approval before execution:

| Tool | Domain |
|------|--------|
| `dispatch_to_vendor` | Maintenance |
| `verify_completion` | Maintenance |
| `create_defect_tickets` | Vision AI |
| `import_bank_transactions` | Reconciliation |
| `auto_reconcile_batch` | Reconciliation |
| `handle_split_payment` | Reconciliation |
| `auto_populate_lease_charges` | Lease Abstraction |
| `voice_create_maintenance_request` | Voice Agent |
| `generate_access_code` | IoT |
| `send_access_code` | IoT |
| `revoke_access_code` | IoT |
| `execute_playbook` | Autonomous Ops |

### Tools with Policy-Based Approval (3)

Approval controlled by `agent_approval_policies` table (can be set to `required` or `auto`):

| Tool | Domain |
|------|--------|
| `create_row` | Generic CRUD |
| `update_row` | Generic CRUD |
| `delete_row` | Generic CRUD |

### All Other Tools (72)

All remaining tools execute without approval. See individual domain sections above for the full list.

### Reports & Analytics Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/reports/owner-summary` | GET | Revenue, expenses, occupancy, net payout |
| `/reports/summary` | GET | Alias for owner summary |
| `/reports/operations-summary` | GET | Task/turnover metrics, reservation forecasts |
| `/reports/transparency-summary` | GET | Listing transparency, application, collection metrics |
| `/reports/finance-dashboard` | GET | 6 months revenue/expense breakdown |
| `/reports/kpi-dashboard` | GET | Collection, occupancy, maintenance KPIs |
| `/reports/occupancy-forecast` | GET | 1-6 month occupancy prediction |
| `/reports/anomalies` | GET | Active anomaly alerts |
| `/reports/anomalies/{id}/dismiss` | POST | Dismiss anomaly alert |
| `/reports/anomalies/scan` | POST | Trigger manual anomaly scan |
| `/reports/agent-performance` | GET | Agent usage stats (30 days) |
| `/reports/revenue-trend` | GET | Monthly revenue trend (6 months) |

### Additional Endpoints — Reviews

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/reviews` | GET | List reviews with response status/platform filters |
| `/reviews/{id}` | GET/PATCH | Review detail/update response |
| `/reviews/{id}/publish-response` | POST | Publish review response |

### Additional Endpoints — Integrations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/integrations` | GET/POST | List/create integrations |
| `/integrations/{id}` | GET/PATCH/DELETE | Integration CRUD |
| `/integrations/{id}/sync-ical` | POST | Sync iCal listings |
| `/integrations/{id}/sync-airbnb` | POST | Sync Airbnb listings |
| `/integrations/airbnb/auth-url` | POST | Generate Airbnb OAuth URL |
| `/integrations/airbnb/callback` | POST | Exchange OAuth code for tokens |
| `/integration-events` | GET/POST | List/create integration events |
| `/integration-events/{id}` | GET | Get event details |
| `/integrations/webhooks/{provider}` | POST | Ingest external webhook |

### Additional Endpoints — Tasks

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/tasks` | GET/POST | List/create tasks with SLA flagging |
| `/tasks/{id}` | GET/PATCH | Task detail/update |
| `/tasks/{id}/complete` | POST | Complete task (validates all items done) |
| `/tasks/{id}/items` | GET/POST | Task checklist items |
| `/tasks/{id}/items/{item_id}` | PATCH/DELETE | Item CRUD |

---

## Admin Frontend Page Index

### Dashboard & App Pages

| Path | Description |
|------|-------------|
| `/app` | Main dashboard |
| `/app/agents` | Multi-agent chat interface |
| `/app/agent` | Legacy agent chat |
| `/app/chats` | Chat history |
| `/app/portfolio` | Portfolio overview |

### Module Pages (36)

| Path | Description |
|------|-------------|
| `/module/properties` | Property management |
| `/module/units` | Unit management |
| `/module/leases` | Lease management |
| `/module/reservations` | Reservation management |
| `/module/calendar` | Calendar with blocks |
| `/module/maintenance` | Maintenance requests |
| `/module/tasks` | Task management |
| `/module/guests` | Guest management |
| `/module/expenses` | Expense tracking |
| `/module/collections` | Collection management |
| `/module/applications` | Application pipeline |
| `/module/documents` | Document management |
| `/module/listings` | Marketplace listings |
| `/module/owner-statements` | Owner statements |
| `/module/pricing` | Pricing templates & ML recommendations |
| `/module/reviews` | Review management |
| `/module/messaging` | Message logs |
| `/module/notification-rules` | Notification rules |
| `/module/notifications` | Notification settings |
| `/module/sequences` | Communication sequences |
| `/module/workflow-rules` | Workflow automation rules |
| `/module/knowledge` | Knowledge base (RAG) |
| `/module/audit-logs` | Audit trail |
| `/module/voice` | Voice interaction logs |
| `/module/inspections` | Vision AI inspections |
| `/module/integrations` | Integrations & IoT |
| `/module/portfolio` | Portfolio analytics |
| `/module/reports` | Reports & anomaly alerts |
| `/module/operations` | Operations dashboard |
| `/module/agent-config` | Agent configuration |
| `/module/agent-dashboard` | Agent health dashboard |
| `/module/automations` | Playbook builder |
| `/module/billing` | Subscription management |
| `/module/channels` | Channel management |
| `/module/transparency-summary` | Transparency metrics |
| `/module/[slug]` | Dynamic module router |

### Settings Pages

| Path | Description |
|------|-------------|
| `/settings/organization` | Organization settings |
| `/settings/team` | Team / member management |
| `/settings/security` | Security settings |
| `/settings/notifications` | Notification preferences |
