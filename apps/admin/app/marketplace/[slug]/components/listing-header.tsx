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
        className="inline-flex items-center gap-1.5 text-sm text-[var(--marketplace-text-muted)] transition-colors hover:text-primary"
        href="/marketplace"
      >
        <Icon icon={ArrowLeft02Icon} size={14} />
        {isEn ? "Back to listings" : "Volver a anuncios"}
      </Link>

      <p className="text-xs font-medium uppercase tracking-widest text-[var(--marketplace-text-muted)]">
        {neighborhood ? `${neighborhood} · ${city}` : city}
      </p>

      <h1 className="font-serif text-3xl font-medium tracking-tight text-[var(--marketplace-text)] lg:text-4xl">
        {title}
      </h1>

      {summary ? (
        <p className="max-w-3xl text-base text-[var(--marketplace-text-muted)]">
          {summary}
        </p>
      ) : null}

      {specsLong ? (
        <p className="text-sm text-[var(--marketplace-text-muted)]">
          {specsLong}
        </p>
      ) : null}
    </header>
  );
}
