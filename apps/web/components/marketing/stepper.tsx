"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Connect your properties & channels",
    description:
      "Import your listings from Airbnb, Booking.com, and VRBO in seconds. Setup is seamless.",
  },
  {
    number: "02",
    title: "Automate your operations",
    description:
      "Set up auto-messaging for guests, and automatically dispatch cleaning teams when guests check out.",
  },
  {
    number: "03",
    title: "Grow and delight owners",
    description:
      "Watch your occupancy rise with zero double bookings, while generating transparent monthly owner statements instantly.",
  },
];

export function Stepper() {
  return (
    <section className="bg-background py-24">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-16">
          <motion.h2
            className="mb-4 font-bold text-3xl tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            From chaotic to{" "}
            <span className="font-serif text-accent italic">seamless</span> in
            three steps.
          </motion.h2>
        </div>

        <div className="relative ml-6 space-y-12 border-border/50 border-l pb-8 md:ml-10">
          {steps.map((step, idx) => (
            <motion.div
              className="relative pl-10 md:pl-16"
              initial={{ opacity: 0, x: -20 }}
              key={step.title}
              transition={{ delay: idx * 0.2, duration: 0.6 }}
              viewport={{ once: true, margin: "-150px" }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <div className="absolute top-1 -left-[1.35rem] z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-border bg-surface-subtle font-bold text-sm shadow-sm">
                {step.number}
              </div>
              <h3 className="mb-3 font-semibold text-2xl">{step.title}</h3>
              <p className="max-w-2xl text-muted-foreground text-xl leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
