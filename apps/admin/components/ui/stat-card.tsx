import type { IconSvgElement } from "@hugeicons/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type StatCardProps = {
  label: string;
  value: string;
  helper?: string;
  icon?: IconSvgElement;
};

export function StatCard({ label, value, helper, icon }: StatCardProps) {
  return (
    <Card
      aria-label={`${label}: ${value}`}
      className="overflow-hidden transition-shadow duration-150 hover:shadow-md"
    >
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1.5 font-medium text-[11px] uppercase tracking-wide">
          {icon ? (
            <Icon className="text-muted-foreground" icon={icon} size={14} />
          ) : null}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {helper ? (
        <CardContent className="pt-0 text-muted-foreground text-xs">
          {helper}
        </CardContent>
      ) : null}
    </Card>
  );
}
