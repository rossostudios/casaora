"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function Pricing() {
  return (
    <section className="bg-background py-24">
      <div className="container relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border bg-card px-4 shadow-2xl">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute top-0 right-0 -mt-40 -mr-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-0 left-0 -mb-40 -ml-40 h-[500px] w-[500px] rounded-full bg-accent/5 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center justify-between gap-12 p-10 text-center md:flex-row md:p-16 md:text-left">
          <div className="max-w-lg flex-1">
            <motion.h2
              className="mb-6 font-bold text-4xl tracking-tight md:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              Ready to{" "}
              <span className="font-serif text-accent italic">elevate</span>{" "}
              your rental business?
            </motion.h2>
            <motion.p
              className="mb-8 text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              Join the fastest-growing network of hospitality professionals in
              Paraguay. Set up in minutes.
            </motion.p>

            <motion.ul
              className="mb-8 space-y-3 text-left md:mb-0"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1 }}
            >
              {[
                "Multi-currency support (PYG, USD, EUR)",
                "2-way calendar sync with Airbnb/Booking",
                "Automated guest messaging",
              ].map((item) => (
                <li className="flex items-center gap-3" key={item}>
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="font-medium text-foreground">{item}</span>
                </li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            className="flex w-full flex-col items-center gap-4 md:w-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, scale: 1 }}
          >
            <Link
              className="group flex w-full items-center justify-center gap-3 rounded-full bg-primary px-8 py-5 font-bold text-lg text-primary-foreground shadow-casaora transition-all hover:bg-primary/90 md:w-auto"
              href="/demo"
            >
              Request a Demo
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-muted-foreground text-sm">
              No credit card required. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
