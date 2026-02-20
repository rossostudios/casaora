"use client";

import { ArrowRight01Icon, Folder01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";

export function RelationDrawerCard({
  label,
  slug,
  isEn,
  children,
}: {
  label: string;
  slug: string;
  isEn: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="group flex items-center justify-between rounded-2xl border border-border/40 bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-[var(--shadow-floating)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-primary/5 p-2 text-primary">
            <Icon icon={Folder01Icon} size={20} />
          </div>
          <span className="font-medium text-foreground text-sm transition-colors group-hover:text-primary">
            {label}
          </span>
        </div>
        <Icon
          className="text-muted-foreground opacity-50 transition-all group-hover:translate-x-1 group-hover:opacity-100"
          icon={ArrowRight01Icon}
          size={16}
        />
      </button>

      <Sheet
        description={
          isEn
            ? "View and manage related records."
            : "Ver y administrar registros relacionados."
        }
        onOpenChange={setOpen}
        open={open}
        title={
          <div className="flex items-center gap-3">
            <Badge
              className="text-[10px] uppercase tracking-widest"
              variant="outline"
            >
              {slug}
            </Badge>
            <span>{label}</span>
          </div>
        }
      >
        {children}
      </Sheet>
    </>
  );
}
