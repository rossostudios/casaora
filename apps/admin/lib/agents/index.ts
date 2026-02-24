// biome-ignore lint/performance/noBarrelFile: agent registry barrel is intentional
export { buildSystemPrompt, buildToolsFromDefinitions } from "./base-agent";
export { financeAgent } from "./finance-agent";
export { guestConcierge } from "./guest-concierge";
export { leasingAgent } from "./leasing-agent";
export { maintenanceTriage } from "./maintenance-triage";
export { supervisor } from "./supervisor";
export { executeToolOnBackend, fetchToolDefinitions } from "./tool-client";
export type {
  AgentConfig,
  ExecuteToolRequest,
  ExecuteToolResponse,
  ToolDefinition,
} from "./types";

import { financeAgent } from "./finance-agent";
import { guestConcierge } from "./guest-concierge";
import { leasingAgent } from "./leasing-agent";
import { maintenanceTriage } from "./maintenance-triage";
import { supervisor } from "./supervisor";
import type { AgentConfig } from "./types";

/** Registry of all agent configs by slug. */
export const agentRegistry: Record<string, AgentConfig> = {
  "guest-concierge": guestConcierge,
  "maintenance-triage": maintenanceTriage,
  "finance-agent": financeAgent,
  "leasing-agent": leasingAgent,
  supervisor,
};

/** Get agent config by slug, falling back to guest-concierge. */
export function getAgentConfig(slug: string): AgentConfig {
  return agentRegistry[slug] ?? guestConcierge;
}
