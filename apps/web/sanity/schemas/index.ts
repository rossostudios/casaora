import { blockContent } from "./block-content";
import { blogPost } from "./blog-post";
import { category } from "./category";
import { faqItem } from "./faq-item";
import { pricingTier } from "./pricing-tier";
import { seo } from "./seo";
import { teamMember } from "./team-member";
import { testimonial } from "./testimonial";

export const schemaTypes = [
  // Documents
  blogPost,
  teamMember,
  testimonial,
  pricingTier,
  faqItem,
  category,
  // Objects
  blockContent,
  seo,
];
