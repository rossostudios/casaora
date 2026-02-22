"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "15h+", label: "Saved per week on admin workflows" },
  { value: "0%", label: "Double bookings across all channel sources" },
  { value: "40%", label: "Average revenue increase for owners" },
];

export function Stats() {
  return (
    <section className="relative overflow-hidden bg-background py-24 text-center md:py-32 dark:bg-black">
      {/* Background glow behind text */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mauve-500/20 blur-[120px]" />

      <div className="container relative z-10 mx-auto max-w-6xl px-4">
        <div className="mb-20">
          <motion.h2
            className="mb-4 font-bold text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Real results for{" "}
            <span className="font-serif text-mauve-500 italic">
              real managers.
            </span>
          </motion.h2>
        </div>

        <div className="relative grid gap-px overflow-hidden border-border border-y bg-border md:grid-cols-3 dark:border-white/10 dark:bg-white/10">
          {/* Shimmer effect over borders */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            className="absolute top-0 left-0 z-10 h-[1px] w-[50%] bg-gradient-to-r from-transparent via-mauve-500 to-transparent"
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 3,
              ease: "linear",
            }}
          />

          {stats.map((stat, idx) => (
            <motion.div
              className="flex flex-col items-center justify-center bg-background px-6 py-12 md:py-16 dark:bg-black"
              initial={{ opacity: 0, y: 20 }}
              key={stat.label}
              transition={{ delay: idx * 0.15, duration: 0.6 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4 font-medium text-6xl tracking-tighter drop-shadow-md md:text-7xl lg:text-8xl">
                <span className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent dark:from-white dark:to-white/40">
                  {stat.value}
                </span>
              </div>
              <p className="max-w-[200px] font-medium text-muted-foreground leading-relaxed dark:text-[#888]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
