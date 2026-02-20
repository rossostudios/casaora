"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "15h+", label: "Saved per week on admin workflows" },
  { value: "0%", label: "Double bookings across all synced channels" },
  { value: "40%", label: "Average increase in direct bookings" },
];

export function Stats() {
  return (
    <section className="bg-primary py-24 text-primary-foreground">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-16 text-center">
          <motion.h2
            className="mb-4 font-bold text-3xl text-white tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Real results for{" "}
            <span className="font-serif text-accent italic">
              real managers.
            </span>
          </motion.h2>
        </div>

        <div className="grid gap-8 divide-y divide-primary-foreground/20 md:grid-cols-3 md:divide-x md:divide-y-0">
          {stats.map((stat, idx) => (
            <motion.div
              className="flex flex-col items-center px-4 pt-8 text-center md:pt-0"
              initial={{ opacity: 0, scale: 0.9 }}
              key={stat.label}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, scale: 1 }}
            >
              <div className="mb-4 font-bold text-6xl text-white tracking-tighter drop-shadow-md md:text-7xl">
                {stat.value}
              </div>
              <p className="px-6 font-medium text-lg text-primary-foreground/80">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
