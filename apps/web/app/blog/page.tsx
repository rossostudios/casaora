import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/layout/section";
import { ScrollReveal } from "@/components/scroll-reveal";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, guides, and updates from the Casaora team on property management, technology, and the Latin American rental market.",
};

// Placeholder posts — will be replaced with Sanity query
const POSTS = [
  {
    slug: "getting-started-with-casaora",
    title: "Getting started with Casaora",
    excerpt:
      "A step-by-step guide to setting up your first property portfolio on the platform.",
    date: "2026-02-15",
    author: "Casaora Team",
  },
  {
    slug: "property-management-trends-2026",
    title: "Property management trends in 2026",
    excerpt:
      "How AI, automation, and transparency are reshaping the rental industry in Latin America.",
    date: "2026-02-10",
    author: "Casaora Team",
  },
  {
    slug: "owner-statements-guide",
    title: "The complete guide to owner statements",
    excerpt:
      "Everything you need to know about generating accurate, timely owner statements.",
    date: "2026-02-05",
    author: "Casaora Team",
  },
];

export const revalidate = 600;

export default function BlogPage() {
  return (
    <Section>
      <ScrollReveal className="mx-auto max-w-3xl text-center">
        <h1 className="font-bold text-4xl tracking-tight lg:text-6xl">Blog</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Insights and updates from the Casaora team.
        </p>
      </ScrollReveal>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((post, i) => (
          <ScrollReveal delay={i * 100} key={post.slug}>
            <Link
              className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              href={`/blog/${post.slug}`}
            >
              {/* Image placeholder */}
              <div className="aspect-[16/9] bg-muted" />

              <div className="flex flex-1 flex-col p-5">
                <p className="text-muted-foreground text-xs">{post.date}</p>
                <h2 className="mt-2 font-semibold transition-colors group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-2 flex-1 text-muted-foreground text-sm">
                  {post.excerpt}
                </p>
                <p className="mt-4 text-muted-foreground text-xs">
                  By {post.author}
                </p>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </Section>
  );
}
