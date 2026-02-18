import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { _type } = body;

  if (!_type) {
    return NextResponse.json(
      { message: "Missing document type" },
      { status: 400 }
    );
  }

  const tagMap: Record<string, string> = {
    blogPost: "blog",
    testimonial: "testimonials",
    pricingTier: "pricing",
    teamMember: "team",
    faqItem: "faq",
  };

  const tag = tagMap[_type];

  if (tag) {
    revalidateTag(tag, "max");
    return NextResponse.json({ revalidated: true, tag });
  }

  return NextResponse.json(
    { message: `No tag mapping for type: ${_type}` },
    { status: 400 }
  );
}
