// ── Blog ──
export const blogPostsQuery = `*[_type == "blogPost"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  featuredImage,
  "author": author->{ name, photo },
  "category": category->{ title, slug }
}`;

export const blogPostBySlugQuery = `*[_type == "blogPost" && slug.current == $slug][0] {
  _id,
  title,
  slug,
  excerpt,
  body,
  publishedAt,
  featuredImage,
  seo,
  "author": author->{ name, role, photo, bio },
  "category": category->{ title, slug }
}`;

export const blogPostSlugsQuery = `*[_type == "blogPost" && defined(slug.current)][].slug.current`;

// ── Testimonials ──
export const testimonialsQuery = `*[_type == "testimonial"] | order(order asc) {
  _id,
  quote,
  author,
  role,
  photo
}`;

// ── Team ──
export const teamMembersQuery = `*[_type == "teamMember"] | order(order asc) {
  _id,
  name,
  role,
  photo,
  bio
}`;

// ── Pricing ──
export const pricingTiersQuery = `*[_type == "pricingTier"] | order(order asc) {
  _id,
  name,
  description,
  monthlyPrice,
  annualPrice,
  features,
  popular,
  ctaLabel
}`;

// ── FAQ ──
export const faqItemsQuery = `*[_type == "faqItem"] | order(order asc) {
  _id,
  question,
  answer,
  category
}`;

export const faqItemsByCategoryQuery = `*[_type == "faqItem" && category == $category] | order(order asc) {
  _id,
  question,
  answer
}`;
