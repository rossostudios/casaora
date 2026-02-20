import { useHotkey } from "@tanstack/react-hotkeys";
import type { RefObject } from "react";

/**
 * A hook to enable `Mod+Enter` (Cmd+Enter on Mac, Ctrl+Enter elsewhere)
 * to submit a form, commonly used in modals or full-page editors.
 */
export function useFormSubmitHotkey(
  formRef: RefObject<HTMLFormElement | null>,
  enabled = true
) {
  useHotkey("Mod+Enter", (e) => {
    if (!enabled) return;
    // We intentionally don't check isInputFocused() because
    // we want the user to be able to submit while focused on an input.
    e.preventDefault();
    formRef.current?.requestSubmit();
  });
}
