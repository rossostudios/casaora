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
  {
    quote:
      "Setup was incredibly smooth. We synced Airbnb and Booking in minutes. I wish we had found this sooner.",
    author: "Lucia V.",
    role: "Hospitality Group Lead",
    image: "https://i.pravatar.cc/150?u=lucia",
  },
  {
    quote:
      "Finally, a dashboard that doesn't look like it was built in 2010. A joy to use every single day.",
    author: "Diego R.",
    role: "Boutique Hotel Owner",
    image: "https://i.pravatar.cc/150?u=diego",
  },
];

// Duplicate for infinite scroll effect
const duplicatedTestimonials = [...testimonials, ...testimonials];

export function Testimonials() {
  return (
    <section className="overflow-hidden border-border border-t bg-section-alt py-24 md:py-32 dark:border-white/5 dark:bg-black">
      <div className="container mx-auto mb-20 px-4 text-center">
        <motion.h2
          className="font-medium text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Loved by{" "}
          <span className="font-serif text-mauve-500 italic">top managers</span>
        </motion.h2>
      </div>

      <div className="group relative flex overflow-x-hidden">
        {/* Fading edges for marquee */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-32 bg-gradient-to-r from-section-alt to-transparent dark:from-black dark:to-transparent" />
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-32 bg-gradient-to-l from-section-alt to-transparent dark:from-black dark:to-transparent" />

        <div className="flex w-max shrink-0 animate-marquee items-center py-8 group-hover:[animation-play-state:paused]">
          {duplicatedTestimonials.map((testimonial, idx) => (
            <div
              className="relative mx-4 w-[350px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card p-8 transition-colors hover:bg-muted/50 md:w-[450px] md:p-10 dark:border-white/10 dark:bg-[#111] dark:hover:bg-[#151515]"
              key={`${testimonial.author}-${idx}`}
            >
              <Quote className="absolute top-8 right-8 h-8 w-8 text-black/5 dark:text-white/5" />
              <p className="relative z-10 mb-8 font-serif text-foreground text-lg leading-relaxed md:text-xl dark:text-[#ececec]">
                "{testimonial.quote}"
              </p>
              <div className="relative z-10 flex items-center gap-4">
                <Image
                  alt={testimonial.author}
                  className="h-10 w-10 rounded-full border border-border object-cover opacity-80 dark:border-white/10"
                  height={40}
                  src={testimonial.image}
                  width={40}
                />
                <div>
                  <div className="font-medium text-foreground text-sm dark:text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-muted-foreground text-xs dark:text-[#888]">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
