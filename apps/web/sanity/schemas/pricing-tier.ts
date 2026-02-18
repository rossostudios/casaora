import { defineField, defineType } from "sanity";

export const pricingTier = defineType({
  name: "pricingTier",
  title: "Pricing Tier",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Plan Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "string",
    }),
    defineField({
      name: "monthlyPrice",
      title: "Monthly Price (USD)",
      type: "number",
      description: "Leave empty for custom/enterprise pricing",
    }),
    defineField({
      name: "annualPrice",
      title: "Annual Price (USD/mo)",
      type: "number",
    }),
    defineField({
      name: "features",
      title: "Features",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "popular",
      title: "Most Popular",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA Label",
      type: "string",
      initialValue: "Get started",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "monthlyPrice",
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? `$${subtitle}/mo` : "Custom",
      };
    },
  },
});
