"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      closeButton
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
