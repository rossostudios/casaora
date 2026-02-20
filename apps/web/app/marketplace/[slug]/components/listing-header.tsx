import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";

type ListingHeaderProps = {
  isEn: boolean;
  title: string;
  city: string;
  neighborhood: string;
  summary: string;
  specsLong: string;
};

export function ListingHeader({
  isEn,
  title,
  city,
  neighborhood,
  summary,
  specsLong,
}: ListingHeaderProps) {
  return (
    <header className="space-y-4">
      <Link
        className="inline-flex items-center gap-1.5 text-[var(--marketplace-text-muted)] text-sm transition-colors hover:text-primary"
        href="/marketplace"
      >
        <Icon icon={ArrowLeft02Icon} size={14} />
        {isEn ? "Back to listings" : "Volver a anuncios"}
      </Link>

      <p className="font-medium text-[var(--marketplace-text-muted)] text-xs uppercase tracking-widest">
        {neighborhood ? `${neighborhood} · ${city}` : city}
      </p>

      <h1 className="font-medium font-serif text-3xl text-[var(--marketplace-text)] tracking-tight lg:text-4xl">
        {title}
      </h1>

      {summary ? (
        <p className="max-w-3xl text-[var(--marketplace-text-muted)] text-base">
          {summary}
        </p>
      ) : null}

      {specsLong ? (
        <p className="text-[var(--marketplace-text-muted)] text-sm">
          {specsLong}
        </p>
      ) : null}
    </header>
  );
}
