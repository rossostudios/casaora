"use client";

import { Mail, MessageCircle, Send } from "lucide-react";
import { useState } from "react";

import { ScrollReveal } from "@/components/scroll-reveal";

export function ContactPageClient() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <h1 className="font-bold text-4xl tracking-tight lg:text-6xl">
            Get in touch
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Have questions or ready to get started? We&apos;d love to hear from
            you.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-12 lg:grid-cols-2">
          {/* Contact form */}
          <ScrollReveal>
            {submitted ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Message sent!</h2>
                <p className="mt-2 text-muted-foreground text-sm">
                  We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form className="space-y-5">
                <div>
                  <label
                    className="mb-1.5 block font-medium text-sm"
                    htmlFor="name"
                  >
                    Name
                  </label>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    id="name"
                    placeholder="Your name"
                    required
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium text-sm"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    id="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </div>

                <div>
                  <label
                    className="mb-1.5 block font-medium text-sm"
                    htmlFor="message"
                  >
                    Message
                  </label>
                  <textarea
                    className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    id="message"
                    placeholder="Tell us about your properties and what you're looking for..."
                    required
                  />
                </div>

                <button
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-6 font-medium text-background text-sm transition-opacity hover:opacity-90"
                  onClick={() => setSubmitted(true)}
                  type="button"
                >
                  Send message
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </ScrollReveal>

          {/* Contact links */}
          <ScrollReveal delay={100}>
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold">WhatsApp</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  Chat with us directly for quick questions.
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                  href="https://wa.me/595981000000"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open WhatsApp
                </a>
              </div>

              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Email</h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  For detailed inquiries and partnership opportunities.
                </p>
                <a
                  className="mt-3 inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                  href="mailto:info@casaora.co"
                >
                  info@casaora.co
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
