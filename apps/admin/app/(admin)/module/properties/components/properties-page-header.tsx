import { Add01Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type PropertiesPageHeaderProps = {
  title: string;
  description: string;
  recordCount: number;
  recordsLabel: string;
  newPropertyLabel: string;
  onOpenCreate: () => void;
  onOpenImport?: () => void;
  importLabel?: string;
};

export function PropertiesPageHeader({
  title,
  description,
  recordCount,
  recordsLabel,
  newPropertyLabel,
  onOpenCreate,
  onOpenImport,
  importLabel,
}: PropertiesPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-2xl text-foreground tracking-tight">
            {title}
          </h1>
          <Badge
            className="h-5 border-primary/20 bg-primary/10 px-1.5 font-bold text-[10px] text-primary uppercase tracking-wider"
            variant="secondary"
          >
            {recordCount} {recordsLabel}
          </Badge>
        </div>
        <p className="font-medium text-muted-foreground text-sm">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {onOpenImport ? (
          <Button
            className="h-9 rounded-xl"
            onClick={onOpenImport}
            type="button"
            variant="outline"
          >
            {importLabel ?? "Import"}
          </Button>
        ) : null}
        <Button
          className="h-9 rounded-xl bg-primary px-4 font-semibold text-white transition-all hover:bg-primary/90"
          onClick={onOpenCreate}
          type="button"
        >
          <Icon icon={Add01Icon} size={16} />
          {newPropertyLabel}
        </Button>
      </div>
    </header>
  );
}
