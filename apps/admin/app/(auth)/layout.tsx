import { Building01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";

import { LanguageSelector } from "@/components/preferences/language-selector";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Icon } from "@/components/ui/icon";
import { getActiveLocale } from "@/lib/i18n/server";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getActiveLocale();
  const isEn = locale === "en-US";

  return (
    <div className="relative min-h-screen bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSelector className="w-[170px] bg-background/70 backdrop-blur" />
        <ThemeToggle locale={locale} />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center justify-center">
          <Link
            className="group inline-flex items-center gap-3 rounded-xl border bg-card/70 px-4 py-3 shadow-sm backdrop-blur"
            href="/login"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon={Building01Icon} size={18} />
            </span>
            <span className="text-left">
              <span className="block font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Puerta Abierta
              </span>
              <span className="block font-semibold text-sm leading-tight">
                {isEn ? "Admin console" : "Consola de administración"}
              </span>
            </span>
          </Link>
        </div>

        {children}

        <p className="mt-8 text-center text-muted-foreground text-xs">
          {isEn
            ? "Short-term rental operations in Paraguay, simplified."
            : "Operaciones de alquiler temporario en Paraguay, simplificadas."}
        </p>
      </div>
    </div>
  );
}
