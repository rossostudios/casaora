"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import Image from "next/image";

const testimonials = [
  {
    quote:
      "Casaora transformed how we manage our 20+ units in San Bernardino. Our owners love the transparency and beautiful reports.",
    author: "Maria C.",
    role: "Property Manager, Asunción",
    image: "https://i.pravatar.cc/150?u=maria",
  },
  {
    quote:
      "The unified inbox alone is worth the price. No more jumping between 3 different apps while guests are waiting for a reply.",
    author: "Carlos G.",
    role: "Real Estate Investor",
    image: "https://i.pravatar.cc/150?u=carlos",
  },
];

export function Testimonials() {
  return (
    <section className="border-border border-b bg-section-alt py-24">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-16 text-center">
          <motion.h2
            className="font-bold text-3xl tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Loved by{" "}
            <span className="font-serif text-primary italic">top managers</span>
          </motion.h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-casaora md:p-10"
              initial={{ opacity: 0, y: 20 }}
              key={testimonial.author}
              transition={{ delay: idx * 0.2, duration: 0.5 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <Quote className="absolute top-8 right-8 h-12 w-12 text-muted/50 transition-colors group-hover:text-primary/10" />
              <p className="relative z-10 mb-8 font-serif text-foreground text-xl leading-relaxed md:text-2xl">
                "{testimonial.quote}"
              </p>
              <div className="relative z-10 flex items-center gap-4">
                <Image
                  alt={testimonial.author}
                  className="h-12 w-12 rounded-full border border-border object-cover"
                  height={48}
                  src={testimonial.image}
                  width={48}
                />
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
