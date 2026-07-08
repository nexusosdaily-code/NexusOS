# SEO Strategy

## In scope
- Public marketing, science, funding, protocol, and documentation pages
- Public custom-domain landing pages selected by hostname
- Public route discovery assets such as `robots.txt`, `sitemap.xml`, and potential `llms.txt`

## Out of scope
- Authenticated dashboard and workspace routes
- Logged-in user tools that are intentionally private
- Admin-only routes
- User-specific or record-specific entity routes such as `/profile/:username`, `/app/:slug`, and `/passport` until the product intentionally promotes them as search landing pages

Private routes remain out of scope for content-quality review, but they are still in scope for crawlability checks if the server exposes them as indexable public URLs.

## Target audience
- Developers, researchers, funders, and technically curious readers evaluating NexusOS, WNSP, and related photonic-computing concepts

## Primary keywords
- NexusOS
- WNSP
- WavelengthScript
- photonic computing
- spectral communication
- physics-based blockchain
- CE-SE pipeline

## Durable notes
- The canonical public channel model is 51,200 orthogonal Ψ channels (`256 WDM × 50 OAM × 2 polarisations × 2 propagation directions`). Public SEO copy, structured data, and AI-crawl assets should align to that number.
- The canonical public host is `https://wnsp.io`. Discovery assets, fallback shell metadata, social URLs, and structured data should not drift onto `wnsp.tech` unless the whole SEO layer changes with them.
- Branded microsites should not self-canonicalize away from `https://wnsp.io` unless the project explicitly decides they are independent SEO properties. If they stay secondary brand domains, their canonicals, structured data, robots targets, sitemap entries, and `llms.txt` references should consolidate to the intended `wnsp.io` landing page.
- Public marketing and science pages should not use `/`, `/hub`, or private `/spectral-db?...` tabs as their primary internal-link destinations because those surfaces are intentionally private/noindex.
- If `/protocol` or `/wnsp-paper` remain noindex, public landing pages should not use them as prominent reference links. If we want them linked as SEO targets, they need to become indexable first.

- New public React routes must be wired into the server allowlist, `ROUTE_META`, and `sitemap.xml` together. If any one of those is skipped, the page can become invisible or inconsistent to crawlers.
- Public alias routes should resolve to one canonical URL. Only the primary URL should appear in the sitemap; aliases should redirect or canonicalize to that primary path.

## Dismissed categories
- None yet
