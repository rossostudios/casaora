import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 3600;

// Placeholder — will be replaced with Sanity query + generateStaticParams
type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title,
    description: `Read "${title}" on the Casaora blog.`,
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <article className="py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          className="mb-8 inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
          href="/blog"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <header>
          <p className="text-muted-foreground text-sm">February 2026</p>
          <h1 className="mt-2 font-bold text-3xl tracking-tight lg:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-muted-foreground">By Casaora Team</p>
        </header>

        <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
          <p>
            This is a placeholder blog post. Once Sanity is connected, the
            content will be rendered using Portable Text with{" "}
            <code>@portabletext/react</code>.
          </p>
          <p>
            The blog supports rich text, images, code blocks, and embedded
            components — all managed through the Sanity Studio at{" "}
            <code>/studio</code>.
          </p>
        </div>
      </div>
    </article>
  );
}
