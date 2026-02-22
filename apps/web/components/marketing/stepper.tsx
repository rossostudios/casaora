"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Connect channels",
    description: "Import listings from Airbnb, Booking.com, and VRBO.",
  },
  {
    number: "02",
    title: "Automate operations",
    description: "Auto-messaging and cleaning dispatch.",
  },
  {
    number: "03",
    title: "Delight owners",
    description: "Rise in occupancy and transparent statements.",
  },
];

export function Stepper() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return (
    <section
      className="relative overflow-hidden bg-background py-24 md:py-32 dark:bg-black"
      ref={containerRef}
    >
      <div className="container mx-auto max-w-[1400px] px-4 md:px-8">
        {/* Header - Split Layout */}
        <div className="mb-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <h2 className="mb-6 font-medium text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl dark:text-white">
              From chaotic to{" "}
              <span className="font-serif text-mauve-500 italic">seamless</span>{" "}
              in three steps.
            </h2>
          </motion.div>
          <motion.div
            className="max-w-md"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-lg text-muted-foreground leading-relaxed md:text-xl dark:text-[#888]">
              We've distilled property management into a streamlined workflow.
              Set up once, and let Casaora handle the heavy lifting while you
              scale.
            </p>
          </motion.div>
        </div>

        {/* Big Product Window Mockup */}
        <motion.div
          className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl dark:border-white/10 dark:bg-[#0a0a0a] dark:shadow-none"
          initial={{ opacity: 0, scale: 0.95 }}
          style={{ y, opacity }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
          whileInView={{ opacity: 1, scale: 1 }}
        >
          {/* Subtle top glow */}
          <div className="absolute top-0 left-1/2 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-mauve-500/50 to-transparent" />
          <div className="pointer-events-none absolute top-0 left-1/2 h-24 w-1/2 -translate-x-1/2 rounded-full bg-mauve-500/10 blur-[80px]" />

          {/* Window Header (Browser/App bar) */}
          <div className="flex items-center border-border border-b bg-muted/30 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-black/10 dark:bg-white/10" />
            </div>
            <div className="mx-auto rounded-md border border-border bg-background px-4 py-1.5 font-mono text-[10px] text-muted-foreground tracking-wider dark:border-white/5 dark:bg-white/5 dark:text-white/40">
              CASAORA.APP / DASHBOARD
            </div>
          </div>

          {/* Abstract UI Inside Window */}
          <div className="relative flex aspect-auto min-h-[500px] flex-col items-center justify-center p-8 md:p-12 lg:p-16">
            {/* Dynamic background grid or lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

            {/* UI Elements representation */}
            <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((step, idx) => (
                <motion.div
                  className="flex flex-col rounded-xl border border-border bg-background/80 p-6 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#111]/80 dark:shadow-none"
                  initial={{ opacity: 0, y: 20 }}
                  key={step.number}
                  transition={{ delay: 0.3 + idx * 0.15, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full border border-mauve-500/20 bg-gradient-to-br from-mauve-500/20 to-transparent">
                    <span className="font-mono text-mauve-500 text-sm">
                      {step.number}
                    </span>
                  </div>
                  <h4 className="mb-2 font-medium text-foreground dark:text-white">
                    {step.title}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed dark:text-[#666]">
                    {step.description}
                  </p>

                  {/* Mock progress/data bar */}
                  <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-white/5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-mauve-500/50 to-mauve-500"
                      initial={{ width: "0%" }}
                      transition={{
                        delay: 0.8 + idx * 0.2,
                        duration: 1.5,
                        ease: "easeOut",
                      }}
                      viewport={{ once: true }}
                      whileInView={{
                        width: idx === 0 ? "100%" : idx === 1 ? "60%" : "30%",
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Central floating abstract elements to simulate data/charts */}
            <div className="relative mt-12 flex h-48 w-full max-w-4xl items-end justify-between gap-2 overflow-hidden rounded-xl border border-border bg-muted/10 p-6 shadow-inner dark:border-white/5 dark:bg-white/[0.01] dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-t from-mauve-500/5 to-transparent mix-blend-overlay" />
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  className="w-full rounded-t-sm bg-foreground/10 dark:bg-white/10"
                  initial={{ height: 0 }}
                  // biome-ignore lint/suspicious/noArrayIndexKey: purely decorative static loop
                  key={i}
                  transition={{
                    delay: 0.5 + i * 0.05,
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                  viewport={{ once: true }}
                  whileInView={{ height: `${30 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
