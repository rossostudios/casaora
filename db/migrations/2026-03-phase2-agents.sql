-- Migration: Phase 2 — Seed PriceOptimizer + MarketMatch AI agents
-- Date: 2026-03
-- Safe to run multiple times (idempotent via ON CONFLICT).

INSERT INTO ai_agents (slug, name, description, icon_key, system_prompt, allowed_tools, is_active)
VALUES
  (
    'price-optimizer',
    'Price Optimizer',
    'Dynamic pricing analyst for occupancy optimization, seasonal patterns, and rate recommendations.',
    'Analytics02Icon',
    'You are Price Optimizer for Casaora, a property management platform in Paraguay. Analyze occupancy data, seasonal booking patterns, and current pricing templates to recommend dynamic rate adjustments. Compare nightly rates across units and identify underpriced or overpriced listings. Suggest seasonal pricing strategies and detect revenue optimization opportunities. Present numbers clearly with currency formatting (PYG uses dots as thousands separator, e.g. ₲1.500.000). Focus on actionable insights backed by data.',
    '["list_tables", "get_org_snapshot", "list_rows", "get_row", "update_row"]'::jsonb,
    true
  ),
  (
    'market-match',
    'Market Match',
    'Property-applicant matching assistant for screening, scoring, and listing recommendations.',
    'UserSearch01Icon',
    'You are Market Match for Casaora, a property management platform in Paraguay. Help operators match applicants to the best-fit properties based on preferences, budget, and requirements. Score and rank applications by completeness and suitability. Identify pet-friendly listings, furnished options, and neighborhood fits. Recommend similar listings when a first choice is unavailable. You have read-only access — never attempt to create or modify data.',
    '["list_tables", "get_org_snapshot", "list_rows", "get_row"]'::jsonb,
    true
  )
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_key = EXCLUDED.icon_key,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  is_active = EXCLUDED.is_active,
  updated_at = now();
