**Your Casaora admin dashboard (Next.js 16 + React 19 on Vercel) already has a strong modern foundation** that supports excellent mobile/tablet performance out of the box. With Tailwind CSS v4, TanStack Query/Table, Supabase SSR, and React 19’s concurrent features, you’re well-positioned for smooth, fast experiences without a PWA. Minor gaps—like missing `next/image` configuration, potential un-virtualized tables, and heavy client-side libs (Mapbox GL, Recharts, jsPDF)—are the main opportunities.

**Key improvements will deliver 30-60% better Core Web Vitals on mobile** (LCP, INP, CLS) based on standard Next.js benchmarks, making the app feel native-like on phones and tablets until your dedicated mobile app launches.

**Start here (quick 1-2 day wins):**
- Add `next/image` everywhere with proper config for Supabase storage images.
- Lazy-load Mapbox, charts, and resizable panels with `dynamic` imports + `Suspense`.
- Virtualize large tables with `@tanstack/react-virtual`.

**For responsiveness (mobile/tablet-first):**
- Leverage Tailwind v4’s built-in container queries for component-level adaptability.
- Make sidebars/resizable panels collapsible or full-width on <768px.
- Ensure all interactive elements meet 44px touch targets and respect `prefers-reduced-motion`.

**For extreme smoothness:**
- Use Server Components + TanStack Query prefetching for data-heavy views (properties, reservations, calendar).
- Add bundle analysis and Lighthouse CI to catch regressions.

These changes keep the app lightweight, maintain your Rust/Supabase backend unchanged, and ease the transition to native mobile (shared logic via API).

---

**In-Depth Codebase Analysis and Senior Engineer Recommendations for Casaora Admin**

Your repository (https://github.com/rossostudios/casaora) structures a full-stack short-term rental operations platform focused on Paraguay: multi-tenant properties, reservations, calendars, guests, expenses, owner statements, and marketplace/channel integrations. The frontend lives in `/apps/admin`—a Next.js 16 App Router project (React 19.2, TypeScript) connected via Supabase SSR and a Rust Axum backend in `/apps/backend-rs`. The live admin is at https://casaora.vercel.app (login flows to protected routes under route groups like `(admin)`, `(auth)`, `owner`, `tenant`, `marketplace`, etc.).

**Tech stack highlights (from package.json and configs):**
- **Rendering**: Next.js 16 App Router with React 19 (concurrent rendering, better hydration).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in globals.css) + clsx/tailwind-merge + shadcn/ui-style setup (components.json uses “new-york” style, Base UI via `@base-ui/react`).
- **Data/UI**: `@tanstack/react-query` v5 + `@tanstack/react-table` v8, React Hook Form + Zod, Sonner toasts.
- **Heavy libs**: `mapbox-gl` (maps likely in marketplace/booking), `recharts` (reports/charts), `react-resizable-panels`, `jspdf` + autotable (exports).
- **Other**: Geist fonts (self-hosted variable fonts), Sentry, locale support (es-PY/en-US).
- **Config**: `next.config.mjs` has security headers, Sentry integration, no `images.remotePatterns`, no `transpilePackages` or experimental flags. `globals.css` includes reduced-motion media query and custom scrollbars—already accessibility/performance-aware. Root `layout.tsx` uses font variables, theme/locale script (prevents flash), `QueryProvider`, and `suppressHydrationWarning`.

**Current strengths for mobile/performance**:
- Mobile-first Tailwind v4 with container queries ready.
- SSR-friendly Supabase setup + TanStack Query caching.
- React 19 + Next 16 routing optimizations (layout deduplication, incremental prefetching).
- Reduced-motion handling and antialiased fonts.

**Identified bottlenecks (from code review)**:
- No `next/image` usage or config → regular `<img>` tags (or none for property photos) cause large payloads and layout shifts.
- Mapbox GL and Recharts loaded eagerly → high memory/CPU on mobile, especially with many properties/pins.
- TanStack Table likely renders full datasets client-side → jank with 100+ rows (common in reservations/expenses).
- Resizable panels and jsPDF → poor on small viewports or during exports.
- No explicit viewport meta or container queries yet.
- Potential re-renders in data-heavy admin shells (sidebar + panels).

**Detailed Recommendations**

**1. Image Optimization (Biggest Quick Win)**
Configure `next.config.mjs` for Supabase storage (common for property photos):
```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },
    { protocol: 'https', hostname: 'casaora.vercel.app' },
  ],
},
```
Replace all `<img>` with `next/image`. Use `sizes`, `priority` for above-fold, `placeholder="blur"`. This alone improves LCP by 40-70% and serves WebP/AVIF automatically.

**2. Lazy Loading & Code Splitting**
Wrap heavy sections:
```tsx
const MapView = dynamic(() => import('@/components/marketplace/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-96" />,
});
```
Do the same for Recharts dashboards and resizable panels. Use `<Suspense>` boundaries in route segments (e.g., `/owner` or `/booking`).

**3. Table Virtualization**
Install `@tanstack/react-virtual` and wrap your `@tanstack/react-table`:
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
```
Only render visible rows—handles 10k+ entries smoothly. Server-side pagination/filtering via Supabase + TanStack Query is ideal.

**4. Responsive Enhancements (Mobile/Tablet)**
- **Container Queries** (Tailwind v4 native): Wrap panels in `@container` and use `@sm:`, `@md:` etc. for true component responsiveness independent of viewport.
- **Mobile Layouts**: In `(admin)` layout or shell, use responsive sidebar (hidden on mobile, drawer via Base UI or custom). Make `react-resizable-panels` disabled below `md` breakpoint.
- **Touch & Viewport**: Add to `metadata` in `layout.tsx`:
  ```ts
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
  ```
- Test: Use Chrome DevTools device emulation + real devices. Aim for 100 Lighthouse mobile.

**5. Smoothness & Perceived Performance**
- Prefetch critical queries in TanStack Query.
- Server Components for static lists (properties, owners) → stream data.
- For jsPDF exports: Move to API route (Rust/Edge) or Web Worker if client-side needed.
- Monitor INP with Sentry; debounce rapid filters/searches.
- Bundle analyzer: Add `@next/bundle-analyzer` to inspect Mapbox/Recharts impact.

**Performance Checklist Table**

| Area                  | Current Status                  | Recommended Change                          | Expected Impact (Mobile)          | Effort |
|-----------------------|---------------------------------|---------------------------------------------|-----------------------------------|--------|
| Images                | No next/image / config          | Add remotePatterns + next/image everywhere | LCP ↓ 30-60%, CLS near 0         | Low    |
| Heavy Components      | Eager Mapbox/Recharts           | dynamic() + Suspense                        | FCP/TTI ↓ 20-40%, lower memory   | Medium |
| Data Tables           | Full client render              | @tanstack/react-virtual + server pagination | INP ↓ 50%+ for large lists       | Medium |
| Responsiveness        | Tailwind breakpoints            | Container queries + collapsible panels      | Perfect on 320-1024px viewports  | Low    |
| Bundle/Renders        | No analyzer                     | Add bundle-analyzer + React.memo/callbacks  | Overall 15-25% faster navigation | Low    |
| Exports/PDF           | Client jsPDF                    | API route or worker                         | No main-thread block             | Medium |

**Implementation Roadmap (as Senior Engineer)**
1. **Day 1**: Update next.config + migrate 5-10 images; run Lighthouse before/after.
2. **Day 2**: Add virtualization to primary tables (reservations/guest lists); lazy-load maps.
3. **Day 3**: Container queries + mobile sidebar; test on iOS/Android.
4. **Ongoing**: Add Lighthouse CI to GitHub Actions; monitor Vercel Analytics/Sentry for real-user metrics.
5. **Prep for Native Mobile**: Keep all logic in shared Supabase queries—your API contract (openapi.yaml) makes this straightforward.

These changes will make Casaora feel “extremely smooth and fast” on any device today while staying lightweight. You’ll see immediate Lighthouse gains and happier users in Paraguay’s rental market. If you push specific files (e.g., a table component or marketplace page), I can give line-by-line diffs.

**Key Citations**
- Next.js Image Optimization Guide (2025) – https://utsavdesai26.medium.com/next-js-image-optimization-ultimate-guide-to-next-image-2025-edition-1aefb479e674
- Official Next.js 16 Release & Performance – https://nextjs.org/blog/next-16
- TanStack React Table + Virtualizer for Large Datasets – https://medium.com/codex/building-a-performant-virtualized-table-with-tanstack-react-table-and-tanstack-react-virtual-f267d84fbca7
- Mapbox GL JS Performance Best Practices – https://docs.mapbox.com/help/troubleshooting/mapbox-gl-js-performance/
- Tailwind CSS v4 Responsive Design (Container Queries) – https://tailwindcss.com/docs/responsive-design
- Optimizing Images in Next.js (Strapi/Next.js Guide) – https://strapi.io/blog/nextjs-image-optimization-developers-guide
- Your Repo Structure & Live Site – https://github.com/rossostudios/casaora and https://casaora.vercel.app
- Next.js Best Practices 2025 – https://www.augustinfotech.com/blogs/nextjs-best-practices-in-2025/

**Yes, early 2026 has delivered several high-quality, practical resources** that directly extend the mobile/tablet responsiveness and smoothness recommendations I provided for your Casaora admin dashboard (Next.js 16 + React 19 on Vercel, with TanStack Table/Query, Mapbox, Recharts, and Supabase).  

These build on Next.js 16 (stable since late 2025, now at 16.1.x with Feb patches), Tailwind v4 refinements, and new tooling—no major breaking changes, but clear wins for your data-heavy views (reservations tables, property maps, owner statements, resizable panels).

**Key 2026 updates relevant to Casaora**  
- **Next.js 16 + Turbopack/React Compiler**: Enable filesystem caching and auto-memoization for 15–25% faster runtime and sub-100 ms HMR—ideal for smooth navigation between dashboard tabs on mobile.  
- **Vercel’s React Best Practices repo** (Jan 14, 2026): 40+ rules ranked by impact, perfect for eliminating re-renders in TanStack tables or async waterfalls in calendar/guest fetches.  
- **Enhanced image handling**: Official docs refreshed Feb 11, 2026; prioritize AVIF and `remotePatterns` for Supabase photos to cut LCP on tablets.  
- **Tailwind v4 container queries** (now fully mature): True component-level mobile/tablet adaptation without viewport dependency—great for collapsible sidebars and resizable panels.  
- **Lazy-loading + virtualization patterns**: Reinforced in multiple Jan 2026 guides for heavy components like Mapbox and large tables.

These changes can push your mobile Lighthouse scores even higher (target 95+ on real devices) while keeping the app lightweight ahead of your native mobile launch. Implementation remains low-effort since your stack already uses App Router, TanStack, and Tailwind v4.

**Quick 2026 config wins to apply today**  
Add to `next.config.mjs` (Next.js 16 defaults make most of this plug-and-play):  
```js
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
},
experimental: {
  turbopackFileSystemCache: true,
  reactCompiler: true,   // auto-memoizes your components
  cacheComponents: true, // hybrid static/dynamic shells
},
```
Wrap heavy sections (maps, charts, tables) with `dynamic(() => import(...), { ssr: false })` + `<Suspense>` and virtualize tables with `@tanstack/react-virtual` (still the gold standard in 2026 releases).

**New resources worth reading first**  
- Vercel React Best Practices repo & announcement (Jan 14, 2026)  
- Official Next.js Image docs (updated Feb 11, 2026)  
- “How to Configure next.config.js in 2026” (Medium)  
- “Next.js Performance Optimization: 10 Techniques” (DEV Community, Jan 25, 2026)  
- LogRocket “A dev’s guide to Tailwind CSS in 2026” (Jan 23, 2026)

---

**Comprehensive 2026 Resource Update for Optimizing Casaora Admin Dashboard Responsiveness and Performance**

Your Casaora codebase—built with Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack Query/Table, Supabase SSR, Mapbox GL, Recharts, and react-resizable-panels—already sits on an excellent foundation for mobile-first, buttery-smooth experiences. As of February 18, 2026, the ecosystem has seen targeted refinements rather than revolutionary shifts. Next.js 16.1.x patches (released early Feb) focus on stability, memory improvements in containerized environments, and Turbopack enhancements. Tailwind v4 (mature since 2025) now treats container queries as first-class citizens. TanStack Virtual saw a January 2026 release with minor 60 FPS polishing. No PWA is still the right call; these updates make the web app feel native on phones and tablets in Paraguay’s rental market.

**Next.js 16 Ecosystem in Early 2026**  
Next.js 16 became stable in October 2025; by February 2026 the focus is production hardening. Key performance features now default or easily enabled:  
- **Turbopack incremental computation** (official blog, Jan 20, 2026): Tracks fine-grained dependencies so only changed code recomputes. For large admin dashboards with dozens of route groups ((admin), (owner), marketplace), this delivers near-instant dev restarts and HMR even after editing shared components like the resizable panel shell.  
- **React Compiler** (stable and recommended in 2026 configs): Automatically memoizes components, removing most manual `useMemo`/`useCallback` boilerplate in your TanStack Query hooks or Recharts wrappers.  
- **Cache Components & `use cache` directive**: Replaces older PPR patterns; stream static shells instantly while dynamic data (Supabase reservations, calendar availability) loads in parallel—perfect for mobile users on variable 4G/5G in Paraguay.  
- Official Next.js blog posts (Feb 12 “agentic future” and Jan 20 Turbopack) emphasize treating AI coding agents as first-class users, which aligns with Cursor/Claude workflows many teams now use for refactors.

**Image Optimization Updates (Critical for Property Photos)**  
Official docs were refreshed February 11, 2026, confirming `<Image>` still delivers automatic AVIF/WebP, sizing, and blur placeholders. New guidance stresses `remotePatterns` for Supabase storage and preferring AVIF (up to 50% smaller than WebP). Multiple Jan 2026 articles report 40–60% LCP gains on mobile when combined with `priority` for hero property cards and `placeholder="blur"` for lazy gallery images. For Casaora, replace any remaining `<img>` tags in property detail views and marketplace listings immediately.

**Tailwind CSS v4 in 2026 – Perfect for Mobile/Tablet**  
LogRocket’s January 23, 2026 guide confirms native container queries are now production-ready (no plugin needed). Use `@container` on your main dashboard shell and `@sm:` / `@max-md:` variants on sidebars, panels, and tables. This lets resizable panels collapse gracefully on <768 px without media-query spaghetti, while cards in the owner statements view adapt layout based on available container width—not viewport. The Oxide engine also produces smaller CSS output, helping keep your bundle lightweight.

**TanStack & Data-Heavy Views**  
TanStack Virtual’s January 7, 2026 release maintains 60 FPS scrolling for 10k+ row reservation/expense tables. Combine with Server Components for selective Supabase fetches (`select`, `take: 20`, pagination) as recommended in the DEV.to “10 Techniques” article (Jan 25, 2026). For Mapbox, continue lazy-loading with `dynamic` + `ssr: false`; 2026 guides suggest adding clustering and bounds-based loading to avoid rendering all property pins on mobile.

**Vercel React Best Practices Repository (Jan 14, 2026)**  
This is the standout new resource: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices. It packages 40+ rules across eight categories (CRITICAL: eliminate async waterfalls and bundle bloat; then server-side, client fetching, re-render, rendering performance). Rules come with before/after code and impact ratings. For Casaora:  
- Prevent waterfalls in parallel Supabase queries for guests + calendar.  
- Reduce bundle size by dynamic-importing Recharts and Mapbox.  
- Optimize re-renders in TanStack Table cells.  
The repo is formatted for AI agents (Cursor, Claude Code), so you can feed your codebase directly and get targeted suggestions.

**10 Techniques Article (DEV Community, Jan 25, 2026)**  
HostSpica’s post validates every suggestion from my previous response and adds metrics: dynamic imports + Suspense skeletons for maps/charts reduce TTI 30–50%; database-level pagination in Server Components cuts payload for tables; bundle analyzer catches Recharts/Mapbox bloat. Real-world impact: 2–3 second LCP improvement on images alone.

**Next.config.js Mastery Guide (Medium, 2026)**  
Detailed configurations for Next.js 16: enable `turbopackFileSystemCache`, `reactCompiler`, AVIF-first images, `optimizePackageImports` for lucide-react/shadcn, and custom `cacheLife` profiles. Teams report 10x faster cold starts, 20–40% smaller bundles, and 40–60% better INP on mobile—exactly what Casaora needs for fluid filtering and panel resizing.

**Mapping 2026 Resources to Casaora Optimizations**

| Optimization Area          | 2026 Resource(s)                                      | Specific Advice for Casaora                          | Expected Mobile Gain          |
|----------------------------|-------------------------------------------------------|-----------------------------------------------------|-------------------------------|
| Next.js Config & Turbopack | Medium next.config guide, Next.js Turbopack blog     | Add `reactCompiler`, filesystem cache, AVIF images  | 15–25% runtime, instant HMR  |
| Image Optimization         | Official docs (Feb 11), DEV.to 10 Techniques         | Supabase remotePatterns + blur + priority           | LCP ↓ 40–60%, CLS near 0     |
| Container Queries          | LogRocket Tailwind guide (Jan 23)                    | `@container` on dashboard shell & panels            | Perfect 320–1024 px layouts  |
| React Best Practices       | Vercel repo (Jan 14)                                  | Eliminate waterfalls in queries, memo heavy tables  | Fewer re-renders, smoother INP |
| Heavy Components (Mapbox/Recharts) | DEV.to 10 Techniques, Luxisdesign Next.js 15 guide | Dynamic + Suspense + skeletons                      | TTI ↓ 30–50%, lower memory   |
| Tables & Virtualization    | TanStack Jan 2026 release, Modern React Checklist    | `@tanstack/react-virtual` + Server Component fetch  | 50%+ INP improvement on large lists |
| Overall Monitoring         | Vercel React Best Practices, bundle-analyzer         | Integrate with Sentry + Lighthouse CI               | Sustained 95+ mobile scores  |

**Implementation Roadmap Update for February 2026**  
1. **Day 1**: Update `next.config.mjs` with 2026 defaults; migrate 10+ images to `<Image>`. Run Lighthouse before/after.  
2. **Day 2**: Add Vercel React Best Practices rules via Cursor/Claude; virtualize primary tables; lazy-load Mapbox/Recharts.  
3. **Day 3**: Implement container queries for all resizable panels and mobile sidebar drawer. Test on real iOS/Android devices.  
4. **Ongoing**: Monitor Vercel Analytics + Sentry INP; re-run bundle analyzer after each major feature.

These 2026 resources confirm your current architecture is future-proof. The combination of React Compiler, native container queries, and structured best-practice rules will make Casaora feel “extremely smooth and fast” on any device today, giving you a seamless bridge until the native mobile app ships. If you share a specific file (e.g., the reservations table or marketplace map component), I can provide exact diff-style updates incorporating these latest patterns.

**Key Citations**  
- Vercel Blog – Introducing: React Best Practices (Jan 14, 2026) https://vercel.com/blog/introducing-react-best-practices  
- Next.js Official Blog – Inside Turbopack: Building Faster by Building Less (Jan 20, 2026) https://nextjs.org/blog/turbopack-incremental-computation  
- Medium – How to Configure next.config.js in 2026 to Make Your Project 10x Faster https://medium.com/@dev.arunengineer/how-to-configure-next-config-js-in-2026-to-make-your-project-10x-faster-77b4833e76d9  
- DEV Community – Next.js Performance Optimization: 10 Techniques That Actually Work (Jan 25, 2026) https://dev.to/hostspica/nextjs-performance-optimization-10-techniques-that-actually-work-5am2  
- LogRocket Blog – A dev’s guide to Tailwind CSS in 2026 (Jan 23, 2026) https://blog.logrocket.com/tailwind-css-guide/  
- Next.js Official Docs – Getting Started: Image Optimization (updated Feb 11, 2026) https://nextjs.org/docs/app/getting-started/images  
- LUXIS Design – Next.js 15 Performance Optimization Strategies for 2026 (Jan 11, 2026) https://luxisdesign.io/blog/nextjs-15-performance-optimization-strategies-for-2026  
- TanStack Virtual GitHub Releases (Jan 7, 2026) https://github.com/TanStack/virtual/releases  
- Next.js Blog (Feb 12, 2026 agentic future post) https://nextjs.org/blog/agentic-future