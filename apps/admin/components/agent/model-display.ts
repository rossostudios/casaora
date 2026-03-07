const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "openai:gpt-5.2": "OpenAI GPT-5.2",
  "openai:gpt-5-mini": "OpenAI GPT-5 mini",
  "openai:gpt-5.4": "OpenAI GPT-5.4",
  "openai:gpt-5.4-pro": "OpenAI GPT-5.4 Pro",
  "openai:gpt-4o": "OpenAI GPT-4o",
  "openai:gpt-4o-mini": "OpenAI GPT-4o mini",
  "anthropic:claude-sonnet-4-6": "Claude Sonnet 4.6",
  "anthropic:claude-haiku-4-5": "Claude Haiku 4.5",
  "gpt-5.2": "GPT-5.2",
  "gpt-5-mini": "GPT-5 mini",
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-pro": "GPT-5.4 Pro",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-haiku-4-5": "Claude Haiku 4.5",
};

export function getModelDisplayName(id: string): string {
  return MODEL_DISPLAY_NAMES[id] ?? id;
}

const MODEL_SHORT_NAMES: Record<string, string> = {
  "openai:gpt-5.2": "GPT-5.2",
  "openai:gpt-5.4": "GPT-5.4",
  "openai:gpt-5.4-pro": "GPT-5.4 Pro",
  "openai:gpt-5-mini": "GPT-5 mini",
  "openai:gpt-4o": "GPT-4o",
  "openai:gpt-4o-mini": "GPT-4o mini",
  "anthropic:claude-sonnet-4-6": "Sonnet 4.6",
  "anthropic:claude-haiku-4-5": "Haiku 4.5",
  "gpt-5.2": "GPT-5.2",
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-pro": "GPT-5.4 Pro",
  "gpt-5-mini": "GPT-5 mini",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "claude-sonnet-4-6": "Sonnet 4.6",
  "claude-haiku-4-5": "Haiku 4.5",
};

export function getModelShortName(id: string): string {
  return MODEL_SHORT_NAMES[id] ?? id;
}
