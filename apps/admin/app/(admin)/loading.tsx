import { Spinner } from "@/components/ui/spinner";
import { getActiveLocale } from "@/lib/i18n/server";

export default async function Loading() {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 shadow-sm backdrop-blur">
        <Spinner size="md" />
        <p className="text-muted-foreground text-sm">
          {isEn ? "Loading…" : "Cargando…"}
        </p>
      </div>
    </div>
  );
}
