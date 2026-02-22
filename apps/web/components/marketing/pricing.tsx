"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function Pricing() {
  return (
    <section className="relative overflow-hidden bg-background py-24 md:py-32 dark:bg-black">
      {/* Massive radial brand glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mauve-500/10 blur-[150px]" />

      <div className="container relative z-10 mx-auto max-w-5xl px-4 text-center">
        <motion.div
          className="relative flex flex-col items-center overflow-hidden rounded-[2.5rem] border border-border bg-card/50 p-10 shadow-2xl backdrop-blur-xl md:p-20 dark:border-white/10 dark:bg-[#0a0a0a]/80"
          initial={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          {/* Subtle inner top highlight */}
          <div className="absolute top-0 left-1/2 h-px w-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/20" />

          <h2 className="mb-6 font-medium text-4xl text-foreground tracking-tight md:text-6xl lg:text-7xl dark:text-white">
            Ready to{" "}
            <span className="font-serif text-mauve-500 italic">elevate</span>{" "}
            your rental business?
          </h2>

          <p className="mb-12 max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl dark:text-[#888]">
            Join the fastest-growing network of hospitality professionals in
            Paraguay. Set up in minutes and watch your occupancy scale.
          </p>

          <div className="mb-12 flex flex-col items-center gap-6 md:flex-row">
            {[
              "Multi-currency support",
              "2-way calendar sync",
              "Automated messaging",
            ].map((item, idx) => (
              <motion.div
                className="flex items-center gap-2 text-foreground/80 dark:text-[#ccc]"
                initial={{ opacity: 0 }}
                key={item}
                transition={{ delay: 0.3 + idx * 0.1 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1 }}
              >
                <CheckCircle2 className="h-5 w-5 text-mauve-500" />
                <span className="font-medium">{item}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <Link
              className="group relative flex items-center justify-center gap-3 rounded-full bg-mauve-500 px-10 py-5 font-medium text-lg text-white shadow-[0_0_40px_-10px_var(--color-mauve-500)] transition-all hover:bg-[#ff7b2e] hover:shadow-[0_0_60px_-10px_var(--color-mauve-600)]"
              href="/demo"
            >
              <span className="relative z-10">Request a Demo</span>
              <ArrowRight className="relative z-10 h-5 w-5 transition-transform group-hover:translate-x-1" />
              {/* Inner button glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-0 mix-blend-overlay transition-opacity group-hover:opacity-100" />
            </Link>
            <p className="font-medium text-muted-foreground text-sm tracking-wide dark:text-[#666]">
              No credit card required. Cancel anytime.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
