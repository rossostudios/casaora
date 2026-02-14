import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PropertyRelatedLink } from "../types";

type PropertyRelatedLinksProps = {
  links: PropertyRelatedLink[];
  isEn: boolean;
};

export function PropertyRelatedLinks({
  links,
  isEn,
}: PropertyRelatedLinksProps) {
  if (!links.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEn ? "Related" : "Relacionado"}</CardTitle>
        <CardDescription>
          {isEn
            ? "Jump directly to linked workflows."
            : "Salta directamente a flujos vinculados."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "max-w-full"
            )}
            href={link.href}
            key={link.href}
            prefetch={false}
          >
            {link.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
