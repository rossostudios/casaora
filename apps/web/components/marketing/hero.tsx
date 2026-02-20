"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, Inbox, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { sidebarNav, TAB_ICONS } from "./hero-data";
import { containerVariants, getModuleContent } from "./hero-modules";

const PRIMARY_TABS = [
  { key: "Home", icon: Home },
  { key: "Chat", icon: MessageSquare },
  { key: "Inbox", icon: Inbox },
] as const;

export function Hero() {
  const [activeTab, setActiveTab] = useState("Home");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const ActiveIcon = TAB_ICONS[activeTab] ?? Home;

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
      <div className="absolute inset-0 z-0 bg-hero-glow" />

      <div className="container relative z-10 mx-auto max-w-[1400px] px-4">
        {/* Hero text */}
        <div className="mb-16 max-w-4xl text-left">
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 font-bold text-5xl tracking-tight md:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            Short-term rental operations in Paraguay,{" "}
            <span className="font-serif text-primary italic">simplified.</span>
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl text-lg text-muted-foreground md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            The all-in-one platform for property managers and real estate
            companies. Manage channels, reservations, and owner statements from
            a single, beautiful dashboard.
          </motion.p>
        </div>

        {/* Dashboard mockup */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto w-full max-w-[1400px]"
          initial={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <div className="flex h-[700px] flex-col overflow-hidden rounded-2xl border border-border bg-[#fafafa] font-sans text-sm shadow-2xl dark:bg-black/90">
            <div className="flex flex-1 overflow-hidden">
              {/* ── Sidebar ── */}
              <div className="flex w-64 flex-col overflow-y-hidden border-border border-r bg-[#fafafa] dark:bg-[#111]">
                {/* Org header */}
                <div className="flex items-center gap-3 p-4">
                  <div className="h-8 w-8 shrink-0 rounded bg-border" />
                  <div className="leading-tight">
                    <div className="font-semibold text-sm">
                      Christopher Rosso
                    </div>
                    <div className="text-muted-foreground text-xs">Agency</div>
                  </div>
                </div>

                {/* Primary tabs */}
                <div className="px-4 pb-2">
                  <div className="flex items-center space-x-1 rounded-md p-1">
                    {PRIMARY_TABS.map((tab) => (
                      <button
                        className={`flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-center font-medium text-xs transition-colors ${
                          activeTab === tab.key
                            ? tab.key === "Home"
                              ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                              : "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        type="button"
                      >
                        {activeTab === tab.key && (
                          <tab.icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        )}
                        {tab.key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module nav */}
                <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto px-4 py-2">
                  {sidebarNav.map((section) => (
                    <div className="space-y-1" key={section.section}>
                      <div className="mb-2 flex items-center gap-1 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                        <span className="relative -top-[1px] w-2 opacity-50">
                          ↓
                        </span>{" "}
                        {section.section}
                      </div>
                      {section.items.map((item) => (
                        <button
                          className={`-mx-2 flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                            activeTab === item.name
                              ? "bg-muted text-foreground"
                              : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                          }`}
                          key={item.name}
                          onClick={() => setActiveTab(item.name)}
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <item.icon
                              className={`h-4 w-4 shrink-0 ${
                                activeTab === item.name
                                  ? "text-foreground/70"
                                  : "text-muted-foreground/50"
                              }`}
                            />
                            {item.name}
                          </div>
                          {item.badge && (
                            <div
                              className={`rounded px-1.5 py-0.5 text-[10px] ${
                                item.badgeColor ||
                                (activeTab === item.name
                                  ? "bg-foreground/10 text-foreground"
                                  : "bg-muted text-muted-foreground")
                              }`}
                            >
                              {item.badge}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Bottom */}
                <div className="mt-auto border-border border-t p-4">
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-white py-2 font-medium text-sm transition-colors hover:bg-muted/50 dark:bg-[#1a1a1a]"
                    type="button"
                  >
                    <span className="text-red-500">+</span> New chat
                  </button>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground text-xs">
                      CH
                    </div>
                    <div className="text-xs leading-none">
                      <div className="font-medium">Christopher</div>
                      <div className="w-32 truncate text-[10px] text-muted-foreground">
                        chrisrossonyc@gmail.com
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Main content ── */}
              <div className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-[#0a0a0a]">
                {/* Top bar */}
                <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-border border-b bg-white/80 px-6 backdrop-blur dark:bg-[#0a0a0a]/80">
                  <ActiveIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">
                    {activeTab === "Home" ? "Dashboard" : activeTab}
                  </span>
                </div>

                {/* Content area */}
                <div className="max-w-5xl flex-1 p-8">
                  {isMounted && (
                    <AnimatePresence mode="wait">
                      <motion.div
                        animate="visible"
                        className="h-full"
                        exit="exit"
                        initial="hidden"
                        key={activeTab}
                        variants={containerVariants}
                      >
                        {getModuleContent(activeTab)}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
            </div>

            {/* Shimmer styles — hardcoded CSS, no user input */}
            <style>{`
              .shimmer-card::after {
                content: '';
                position: absolute;
                top: 0; left: -100%; right: 0; bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shimmer 3s infinite;
                z-index: 0;
              }
              .dark .shimmer-card::after {
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
              }
              @keyframes shimmer { 100% { left: 100%; } }
              .scrollbar-hide::-webkit-scrollbar { display: none; }
              .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
