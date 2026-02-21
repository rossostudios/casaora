const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "chatgpt-5.2": "ChatGPT 5.2",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o mini",
  "gpt-4.1": "GPT-4.1",
  "gpt-4.1-mini": "GPT-4.1 mini",
  "gpt-4.1-nano": "GPT-4.1 nano",
  "o3": "o3",
  "o3-mini": "o3 mini",
  "o4-mini": "o4 mini",
  "claude-sonnet-4-5-20250514": "Claude Sonnet 4.5",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
};

export function getModelDisplayName(id: string): string {
  return MODEL_DISPLAY_NAMES[id] ?? id;
}
