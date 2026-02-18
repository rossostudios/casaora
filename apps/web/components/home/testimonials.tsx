import { ScrollReveal } from "@/components/scroll-reveal";

const TESTIMONIALS = [
  {
    quote:
      "Casaora replaced three different tools we were using. The unified dashboard alone saves us hours every week.",
    author: "Maria G.",
    role: "Property Manager, Asuncion",
  },
  {
    quote:
      "The owner portal gives me complete transparency into how my properties are performing. I love the automated statements.",
    author: "Carlos R.",
    role: "Property Owner",
  },
  {
    quote:
      "Finding my apartment was so easy through the marketplace. The whole process was smooth and transparent.",
    author: "Sophie L.",
    role: "Tenant",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-semibold text-3xl tracking-tight lg:text-5xl">
            Loved by property teams
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            See what our users have to say about their experience.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <ScrollReveal delay={i * 100} key={t.author}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
                <blockquote className="flex-1 text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6 border-border border-t pt-4">
                  <p className="font-semibold text-sm">{t.author}</p>
                  <p className="text-muted-foreground text-sm">{t.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
