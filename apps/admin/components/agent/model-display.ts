const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gpt-5.2": "GPT-5.2",
};

export function getModelDisplayName(id: string): string {
  return MODEL_DISPLAY_NAMES[id] ?? id;
}
