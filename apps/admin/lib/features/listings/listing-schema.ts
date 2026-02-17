import { z } from "zod/v4";

export const listingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  public_slug: z.string().min(1, "Slug is required"),
  city: z.string().min(1, "City is required"),
  neighborhood: z.string(),
  property_type: z.string(),
  description: z.string(),
  summary: z.string(),
  bedrooms: z.coerce.number().optional(),
  bathrooms: z.coerce.number().optional(),
  square_meters: z.coerce.number().optional(),
  furnished: z.boolean(),
  pet_policy: z.string(),
  parking_spaces: z.coerce.number().optional(),
  available_from: z.string(),
  minimum_lease_months: z.coerce.number().optional(),
  maintenance_fee: z.coerce.number().optional(),
  cover_image_url: z.string(),
  gallery_image_urls: z.array(z.string()),
  amenities: z.array(z.string()),
  currency: z.string(),
  pricing_template_id: z.string(),
  property_id: z.string(),
  unit_id: z.string(),
  country_code: z.string(),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;
