import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://casaora.co";

const STATIC_PAGES = [
  "",
  "/features",
  "/pricing",
  "/about",
  "/blog",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  // TODO: Fetch blog slugs from Sanity when connected
  // Make this function async and add:
  // const slugs = await sanityClient.fetch<string[]>(blogPostSlugsQuery);

  return [...staticEntries];
}
