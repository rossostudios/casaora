"use client";

import { motion } from "framer-motion";
import {
  ChannelManagerIcon,
  OperationsIcon,
  UnifiedInboxIcon,
} from "./feature-icons";

const features = [
  {
    fig: "FIG 0.1",
    icon: ChannelManagerIcon,
    title: "Channel Manager",
    description:
      "Sync Airbnb, Booking & VRBO in real-time. No more double bookings.",
  },
  {
    fig: "FIG 0.2",
    icon: UnifiedInboxIcon,
    title: "Unified Inbox",
    description:
      "All guest communications in one place. Automated replies save hours.",
  },
  {
    fig: "FIG 0.3",
    icon: OperationsIcon,
    title: "Finance & Reports",
    description:
      "Generate beautiful, accurate financial reports for property owners in one click.",
  },
];

export function Features() {
  return (
    <section className="bg-section-alt py-24 md:py-32 dark:bg-black">
      <div className="container mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-20 max-w-4xl">
          <motion.h2
            className="mb-6 font-medium text-4xl text-foreground tracking-tight md:text-5xl lg:text-6xl dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Everything you need to{" "}
            <span className="font-serif text-mauve-500 italic">scale</span> your
            hospitality business.
          </motion.h2>
          <motion.p
            className="max-w-3xl text-lg text-muted-foreground md:text-xl dark:text-white/50"
            initial={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.1 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            Managing multiple properties means juggling channels, cleaning
            schedules, and owner reports. Stop drowning in spreadsheets and
            WhatsApp messages.
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                className="group relative flex min-h-[450px] flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-muted/50 dark:border-white/5 dark:bg-[#0a0a0a] dark:hover:bg-[#111]"
                initial={{ opacity: 0, y: 20 }}
                key={feature.title}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                {/* Top Left FIG Label */}
                <div className="absolute top-6 left-6 font-mono text-[10px] text-muted-foreground uppercase tracking-widest dark:text-[#555]">
                  {feature.fig}
                </div>

                {/* Isometric SVG Illustration */}
                <div className="flex min-h-[250px] flex-1 items-center justify-center p-8 pt-16 md:min-h-[300px]">
                  <Icon className="h-full w-full max-w-[280px] text-foreground/10 transition-colors duration-500 group-hover:text-foreground/20 dark:text-white/20 dark:group-hover:text-white/40" />
                </div>

                {/* Text Content */}
                <div className="mt-auto p-6 md:p-8">
                  <h3 className="mb-3 font-medium text-foreground text-lg dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed dark:text-[#888]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
