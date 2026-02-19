"use client";

import { PinIcon, PinOffIcon } from "@hugeicons/core-free-icons";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getPins, subscribeShortcuts, togglePin } from "@/lib/shortcuts";

type PinButtonProps = ButtonProps & {
  href: string;
  label: string;
  meta?: string;
};

export function PinButton({
  href,
  label,
  meta,
  children,
  ...props
}: PinButtonProps) {
  const [pinned, setPinned] = useState(() =>
    typeof window !== "undefined"
      ? getPins().some((it) => it.href === href)
      : false
  );

  useEffect(() => {
    const sync = () => setPinned(getPins().some((it) => it.href === href));
    return subscribeShortcuts(sync);
  }, [href]);

  const onClick = () => {
    const result = togglePin({ href, label, meta });
    setPinned(result.pinned);
    toast.success(result.pinned ? "Fijado" : "Desfijado", {
      description: label,
    });
  };

  return (
    <Button
      onClick={onClick}
      size="sm"
      type="button"
      variant="outline"
      {...props}
    >
      <Icon icon={pinned ? PinOffIcon : PinIcon} size={16} />
      {children ?? (pinned ? "Desfijar" : "Fijar")}
    </Button>
  );
}
