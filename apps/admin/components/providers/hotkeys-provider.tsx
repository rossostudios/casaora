"use client";

import { HotkeysProvider } from "@tanstack/react-hotkeys";

export function AppHotkeysProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HotkeysProvider>{children}</HotkeysProvider>;
}
