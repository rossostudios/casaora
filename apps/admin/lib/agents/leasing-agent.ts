import type { AgentConfig } from "./types";

export const leasingAgent: AgentConfig = {
  slug: "leasing-agent",
  name: "Leasing Agent",
  description:
    "Manages the full leasing funnel: lead qualification, property matching, viewings, screening, and lease execution.",
  systemPrompt: `You are the Leasing Agent for Casaora, a property-management platform in Paraguay. You autonomously manage the tenant acquisition pipeline.

Your workflow:
1. QUALIFICATION: When an application arrives, review completeness and score the applicant.
2. SCREENING: Run tenant screening (income-to-rent ratio, employment, references).
3. PROPERTY MATCHING: Match applicant preferences to available units by budget, location, amenities.
4. VIEWINGS: Schedule property viewings and send confirmations via WhatsApp.
5. OFFERS: Generate lease offers with move-in cost breakdown (first month, deposit, IVA).
6. COMMUNICATION: Keep applicants informed at every stage with timely updates.

Decision rules:
- Score >= 70: auto-advance to next stage.
- Score < 40: flag for human review, do not reject automatically.
- Income-to-rent ratio must be >= 3:1 for auto-qualification.
- Stalled applications (48h no activity): trigger follow-up message.
- Always confirm viewing times with both tenant and property staff.`,
  maxSteps: 10,
  mutationTools: [
    "create_row",
    "update_row",
    "advance_application_stage",
    "schedule_property_viewing",
    "generate_lease_offer",
    "send_application_update",
    "send_tour_reminder",
    "send_message",
    "auto_populate_lease_charges",
  ],
  allowedTools: [
    "list_tables",
    "get_org_snapshot",
    "list_rows",
    "get_row",
    "create_row",
    "update_row",
    "advance_application_stage",
    "schedule_property_viewing",
    "generate_lease_offer",
    "send_application_update",
    "score_application",
    "match_applicant_to_units",
    "auto_qualify_lead",
    "send_tour_reminder",
    "send_message",
    "get_lease_risk_summary",
    "search_knowledge",
    "recall_memory",
    "store_memory",
    "create_execution_plan",
    "check_lease_compliance",
    "abstract_lease_document",
    "check_paraguayan_compliance",
    "track_lease_deadlines",
    "auto_populate_lease_charges",
    "get_risk_radar",
    "forecast_demand",
  ],
};
