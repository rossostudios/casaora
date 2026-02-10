"use client";

import { useEffect } from "react";

import { addRecent } from "@/lib/shortcuts";

type RecordRecentProps = {
  href: string;
  label: string;
  meta?: string;
};

export function RecordRecent({ href, label, meta }: RecordRecentProps) {
  useEffect(() => {
    if (!(href && label)) return;
    addRecent({ href, label, meta });
  }, [href, label, meta]);

  return null;
}
