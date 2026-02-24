/** Shared types for the Casaora AI agent framework. */

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  needsApproval?: boolean;
};

export type AgentConfig = {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  /** Max tool loop iterations before forcing a response */
  maxSteps: number;
  /** Tool names that require user approval before execution */
  mutationTools: string[];
  /** Subset of tools this agent should have access to (empty = all) */
  allowedTools?: string[];
};

export type ExecuteToolRequest = {
  org_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  allow_mutations?: boolean;
  confirm_write?: boolean;
  agent_slug?: string;
  chat_id?: string;
};

export type ExecuteToolResponse = {
  organization_id: string;
  tool_name: string;
  ok: boolean;
  result: unknown;
};
