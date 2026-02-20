"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { type AnchorHTMLAttributes, type MouseEvent, useRef } from "react";

type IntentPrefetchLinkProps = Omit<LinkProps, "href" | "prefetch"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

export function IntentPrefetchLink({
  href,
  onMouseEnter,
  onFocus,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchedRef = useRef(false);

  function prefetchOnce() {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      onFocus={(event) => {
        prefetchOnce();
        onFocus?.(event);
      }}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetchOnce();
        onMouseEnter?.(event);
      }}
      prefetch={false}
      {...props}
    />
  );
}
