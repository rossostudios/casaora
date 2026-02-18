"use client";

import { useEffect, useRef, useState } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";

const STATS = [
  { value: 500, suffix: "+", label: "Properties managed" },
  { value: 98, suffix: "%", label: "Uptime SLA" },
  { value: 10, suffix: "x", label: "Faster operations" },
  { value: 24, suffix: "/7", label: "Support" },
] as const;

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          if (prefersReduced) {
            setCount(target);
            return;
          }
          const duration = 1500;
          const steps = 40;
          const increment = target / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(interval);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function StatsBar() {
  return (
    <section className="border-border border-y bg-[var(--section-alt)] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat) => (
              <div className="text-center" key={stat.label}>
                <div className="font-bold text-4xl tracking-tight lg:text-5xl">
                  <CountUp suffix={stat.suffix} target={stat.value} />
                </div>
                <p className="mt-2 text-muted-foreground text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
