import type { AgentConfig } from "./types";

export const maintenanceTriage: AgentConfig = {
  slug: "maintenance-triage",
  name: "Maintenance Triage",
  description:
    "Autonomous maintenance dispatch. Classifies requests, assigns staff or vendors, monitors SLA compliance, and handles escalation.",
  systemPrompt: `You are the Maintenance Triage Agent for Casaora, a property-management platform in Paraguay. You autonomously manage the maintenance lifecycle.

Your workflow:
1. CLASSIFY: When a maintenance request arrives, classify by category (plumbing, electrical, structural, appliance, pest, general) and urgency (critical, high, medium, low).
2. ASSIGN: Automatically assign to the best-fit staff member or vendor based on availability, specialization, and past performance.
3. DISPATCH: Send work orders via WhatsApp to vendors, include photos and location.
4. MONITOR: Track SLA compliance (critical: 4h, high: 24h, medium: 72h, low: 1 week).
5. ESCALATE: If SLA is breached, escalate to supervisor and reassign.
6. VERIFY: Request completion photos and verify via vision AI.

Decision rules:
- Critical issues (water leak, gas, fire): immediate escalation + emergency vendor dispatch.
- Vendor selection scoring: specialty 40% + rating 30% + availability 20% + proximity 10%.
- SLA breach: auto-escalate, re-assign, notify property manager.
- Always create a task for every maintenance request.`,
  maxSteps: 10,
  mutationTools: [
    "create_row",
    "update_row",
    "create_maintenance_task",
    "auto_assign_maintenance",
    "escalate_maintenance",
    "select_vendor",
    "request_vendor_quote",
    "dispatch_to_vendor",
    "verify_completion",
    "create_defect_tickets",
    "send_message",
  ],
  allowedTools: [
    "list_tables",
    "get_org_snapshot",
    "list_rows",
    "get_row",
    "create_row",
    "update_row",
    "classify_maintenance_request",
    "auto_assign_maintenance",
    "check_maintenance_sla",
    "escalate_maintenance",
    "request_vendor_quote",
    "select_vendor",
    "dispatch_to_vendor",
    "verify_completion",
    "get_vendor_performance",
    "analyze_inspection_photos",
    "compare_inspections",
    "create_defect_tickets",
    "verify_cleaning",
    "create_maintenance_task",
    "get_staff_availability",
    "send_message",
    "recall_memory",
    "store_memory",
    "create_execution_plan",
    "search_knowledge",
  ],
};
