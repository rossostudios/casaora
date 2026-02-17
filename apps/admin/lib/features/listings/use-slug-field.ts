"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSlugAvailable } from "./listings-api";
import { slugify } from "./slugify";

type SlugFieldState = {
  slug: string;
  setSlug: (value: string) => void;
  isAvailable: boolean | null;
  isChecking: boolean;
  generateFromTitle: (title: string) => void;
};

export function useSlugField(
  orgId: string,
  excludeListingId?: string
): SlugFieldState {
  const [slug, setSlugRaw] = useState("");
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const userEdited = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setIsAvailable(null);
        return;
      }
      setIsChecking(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const result = await fetchSlugAvailable(
            value,
            orgId,
            excludeListingId
          );
          setIsAvailable(result.available);
        } catch {
          setIsAvailable(null);
        } finally {
          setIsChecking(false);
        }
      }, 500);
    },
    [orgId, excludeListingId]
  );

  const setSlug = useCallback(
    (value: string) => {
      userEdited.current = true;
      setSlugRaw(value);
      checkAvailability(value);
    },
    [checkAvailability]
  );

  const generateFromTitle = useCallback(
    (title: string) => {
      if (userEdited.current) return;
      const generated = slugify(title);
      setSlugRaw(generated);
      checkAvailability(generated);
    },
    [checkAvailability]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { slug, setSlug, isAvailable, isChecking, generateFromTitle };
}
