---
name: SEO work (Tasks 117–118, June–July 2026)
description: What SEO changes were made, what rules apply going forward
---

## What was done
- **Task #117 — Public Page Semantics**: Added descriptive `alt` text to images, accessible button
  labels for screen readers. Semantic HTML improvements across public-facing pages.
- **Task #118 — Structured Data + Social Cards**: JSON-LD schemas and social card meta tags in
  `server/seo-meta.ts`. All `og:title`, `og:description`, `twitter:title`, `twitter:description`
  fields verified to meet SERP limits (title ≤60 chars, description ≤160 chars).
- Fixed noindex/suppressed internal links → replaced with correct public destination URLs.
- Updated OG image for improved social sharing previews.
- `seo-meta.ts` is the server-side meta source — `ogType` is valid there (server interface).
  `ogType` is NOT valid in the client-side `usePageMeta` hook — causes TypeScript error.

## Canonical domain rule (always applies)
- Primary: **wnsp.io** — all canonicals, OG, Twitter cards, JSON-LD, sitemap, robots.txt
- wnsp.tech redirects to wnsp.io — NEVER use wnsp.tech as canonical

## What not to touch
- `og:image` and `twitter:image` — keep in place, never remove
- `twitter:site` — keep as `@replit` unless explicitly instructed otherwise

## Campaign period note
Broadcasting (Telegram + Nostr) was paused during the SEO work period (approx June–July 2026).
Campaign resumed July 16, 2026 with the July 2026 update (TG msg 287, Nostr published).
