/**
 * SEO metadata injection for NexusOS
 *
 * Injects host-aware and route-aware metadata into the static HTML shell
 * so crawlers that do not execute JavaScript receive correct titles,
 * descriptions, canonicals, Open Graph, Twitter Card, and JSON-LD data.
 */

/** Canonical Ψ channel count: 256 WDM × 50 OAM × 2 POL × 2 DIR = 51,200.
 *  Update this constant when the channel model changes — it is the single
 *  source of truth for all server-injected metadata and fallback HTML. */
const PSI_CHANNELS = "51,200";
const PSI_CHANNEL_FORMULA = "256 WDM × 50 OAM × 2 POL × 2 DIR";

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
  /** Domain-specific Open Graph / Twitter image URL. Falls back to the NexusOS base image. */
  ogImage?: string;
  /**
   * Open Graph type for this page. Defaults to "website".
   * Use "article" for theory, proof, and documentation pages.
   * Use "product" for hardware product pages (SNIC, PHR-1, etc.).
   */
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  /** Twitter/X account handle for this brand (e.g. "@NexusOS_io"). Falls back to "@NexusOS_io". */
  twitterSite?: string;
  jsonLd?: object | object[];
  /** Static above-the-fold HTML for non-JS crawlers (injected in a <noscript> block before #root). */
  bodyHtml?: string;
}

const BASE = "https://wnsp.io";

function softwareApp(overrides: Partial<{ url: string; name: string; description: string }> = {}): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": overrides.name ?? "NexusOS",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "url": overrides.url ?? `${BASE}/`,
    "description": overrides.description ?? "Open-source physics-based OS kernel for a Kardashev Type I civilization.",
    "license": "AGPL-3.0",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  };
}

function webSite(overrides: Partial<{ url: string; name: string; description: string; searchAction?: boolean }> = {}): object {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": overrides.name ?? "NexusOS",
    "url": overrides.url ?? `${BASE}/`,
    "description": overrides.description ?? "The foundational blueprint for a Kardashev Type I civilization.",
    "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    "creator": { "@type": "Organization", "name": overrides.name ?? "NexusOS", "url": overrides.url ?? `${BASE}/` },
  };
  if (overrides.searchAction !== false && (overrides.url === undefined || overrides.url === `${BASE}/`)) {
    base["potentialAction"] = {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE}/spectral-search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    };
  }
  return base;
}

function hardwareProduct(opts: { name: string; url: string; description: string; image?: string; releaseDate?: string }): object {
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": opts.name,
    "url": opts.url,
    "description": opts.description,
    "image": opts.image ?? "https://wnsp.io/opengraph.jpg",
    "brand": { "@type": "Organization", "name": "NexusOS" },
    "license": "AGPL-3.0",
  };
  if (opts.releaseDate) product["releaseDate"] = opts.releaseDate;
  return product;
}

const SNIC_IMAGE = "https://wnsp.io/snic-og.png";
const PHR1_IMAGE = "https://wnsp.io/phr1-og.png";

function techArticle(opts: { url: string; name: string; description: string; about: string; datePublished?: string; dateModified?: string }): object {
  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": opts.name,
    "name": opts.name,
    "url": opts.url,
    "description": opts.description,
    "about": opts.about,
    "mainEntityOfPage": { "@type": "WebPage", "@id": opts.url },
    "author": { "@type": "Organization", "name": "NexusOS", "url": BASE },
    "publisher": {
      "@type": "Organization",
      "name": "NexusOS",
      "url": BASE,
      "logo": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
    },
    "image": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
    "inLanguage": "en",
    "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
  };
  if (opts.datePublished) article["datePublished"] = opts.datePublished;
  if (opts.dateModified) article["dateModified"] = opts.dateModified;
  return article;
}

function breadcrumbList(items: Array<{ name: string; item: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": it.name,
      "item": it.item,
    })),
  };
}

// ── Custom domain metadata ────────────────────────────────────────────────────
export const DOMAIN_META: Record<string, PageMeta> = {
  "wnsp.dev": {
    title: "WNSP Developer Portal — Build on the Wavelength of Light",
    description: "NexusOS replaces cryptographic hashing with EM physics. Addresses are wavelengths. Fees are photon energies. Install the CE encoder and start building.",
    canonical: "https://wnsp.io/developer",
    ogTitle: "WNSP Developer Portal — Build on the Wavelength of Light",
    ogDescription: "Install nexusos-ce-encoder (npm/pip). Physics-native addresses, fees, and communication. WNSP VM, WavelengthScript compiler, CE→SE pipeline. AGPL-3.0.",
    ogSiteName: "wnsp.dev",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "WNSP Developer Portal — Build on the Wavelength of Light",
    twitterDescription: "Physics-native computing: addresses are wavelengths, fees are photon energies. CE encoder available on npm and pip. AGPL-3.0.",
    jsonLd: [
      webSite({ url: "https://wnsp.io/developer", name: "wnsp.dev", description: "WNSP Protocol developer portal. Build physics-native applications using the CE encoder, WavelengthScript, and the WNSP VM." }),
      softwareApp({ url: "https://wnsp.io/developer", name: "nexusos-ce-encoder", description: "Character Encoding library mapping text to electromagnetic wavelengths. Available on npm and pip." }),
    ],
    bodyHtml: `<h1>WNSP Developer Portal — Build on the Wavelength of Light</h1><p>NexusOS replaces cryptographic hashing with electromagnetic physics. Your addresses are wavelengths. Your fees are photon energies.</p><nav><ul><li><a href="https://wnsp.io/wavelength-lang">WavelengthScript Language</a></li><li><a href="https://wnsp.io/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="https://wnsp.io/docs">Documentation</a></li></ul></nav><p>Install: <code>npm install nexusos-ce-encoder</code> · <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></p>`,
  },
  "wnsp.blog": {
    title: "NexusOS Build Log — Building a Type I Civilisation",
    description: "Physics updates, protocol milestones, and hardware development notes from the NexusOS core team. Follow the construction of a Kardashev Type I civilization OS.",
    canonical: "https://wnsp.io/roadmap",
    ogTitle: "NexusOS Build Log — Building a Type I Civilisation",
    ogDescription: "Protocol milestones, hardware notes, and physics updates. PHR-1 hardware spec, NEXUS•WAVELENGTH Rune etching, WASCII v2.0, WNSP AI Kernel v1.0.0.",
    ogSiteName: "wnsp.blog",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "NexusOS Build Log",
    twitterDescription: "Building a Type I civilisation. One block at a time. PHR-1 hardware, WNSP protocol milestones, physics updates.",
    jsonLd: webSite({ url: "https://wnsp.io/roadmap", name: "NexusOS Build Log", description: "Development blog and build log for NexusOS — the physics-based civilization OS." }),
    bodyHtml: `<h1>NexusOS Build Log — Building a Type I Civilisation</h1><p>Physics updates, protocol milestones, and hardware development notes from the NexusOS core team.</p><nav><ul><li><a href="https://wnsp.io/roadmap">Roadmap</a></li><li><a href="https://wnsp.io/hardware-spec">Hardware Specification</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "snic.io": {
    title: "SNIC — Spectral Network Interface Card | The Photonic NIC of 2032",
    description: `${PSI_CHANNELS} orthogonal channels mapped to physical hardware lanes. CE lookups execute as physical wavelength selections in photonic waveguides. AGPL-3.0.`,
    canonical: "https://wnsp.io/snic",
    ogType: "product",
    ogTitle: "SNIC — The Photonic NIC of 2032",
    ogDescription: `${PSI_CHANNEL_FORMULA} = ${PSI_CHANNELS} orthogonal hardware lanes. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics, not software policy. No driver rewrite when photonic ASICs arrive.`,
    ogSiteName: "snic.io",
    ogImage: SNIC_IMAGE,
    twitterTitle: "SNIC — The Photonic NIC of 2032",
    twitterDescription: `${PSI_CHANNELS} orthogonal photonic channels. CE lookups as physical wavelength selections. First public disclosure 2026-05-16. AGPL-3.0.`,
    jsonLd: hardwareProduct({ name: "SNIC — Spectral Network Interface Card", url: "https://wnsp.io/snic", description: `Photonic network interface card with ${PSI_CHANNELS} orthogonal channels (${PSI_CHANNEL_FORMULA}). First public disclosure 2026-05-16. AGPL-3.0.`, image: SNIC_IMAGE, releaseDate: "2026-05-16" }),
    bodyHtml: `<h1>SNIC — Spectral Network Interface Card</h1><p>The Photonic NIC of 2032. ${PSI_CHANNELS} orthogonal channels (${PSI_CHANNEL_FORMULA}) mapped to physical hardware lanes. CE lookups execute as physical wavelength selections in photonic waveguides. Orthogonality guaranteed by quantum mechanics — ⟨Ψᵢ|Ψⱼ⟩ = 0 by physics, not software policy.</p><nav><ul><li><a href="https://wnsp.io/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots</a></li><li><a href="https://wnsp.io/compression-explorer">Compression Explorer</a></li></ul></nav><p>First public disclosure: 2026-05-16. License: AGPL-3.0.</p>`,
  },
  "spectralmirror.io": {
    title: "Spectral Mirror — The First Electromagnetic Archive | NexusOS",
    description: "Live archive of every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent. This genesis cannot be recreated.",
    canonical: "https://wnsp.io/spectral-mirror",
    ogType: "website",
    ogTitle: "Spectral Mirror — The First Electromagnetic Archive",
    ogDescription: "Every WNSP transmission archived by wavelength since 2 May 2026. CE-encoded. Ψ-addressed. The genesis date cannot be recreated. This is a once-only feature.",
    ogSiteName: "spectralmirror.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "Spectral Mirror — Live Electromagnetic Archive",
    twitterDescription: "Recording every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent. This genesis date cannot be recreated.",
    jsonLd: techArticle({ url: "https://wnsp.io/spectral-mirror", name: "Spectral Mirror — Electromagnetic Archive", description: "Live archive of every WNSP transmission CE-encoded by wavelength. Records map to Ψ channels in the 380–780 nm visible spectrum. Recording began 2 May 2026.", about: "WNSP protocol, CE encoding, spectral archive, electromagnetic spectrum", datePublished: "2026-05-02", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Spectral Mirror — The First Electromagnetic Archive</h1><p>Every message and P2P transmission that passes through the WNSP layer is CE-encoded and permanently stored by its address in the visible light spectrum. Recording began 2 May 2026.</p><p>This archive is a once-only feature. The genesis date of 2 May 2026 cannot be recreated — it is the first and only continuous electromagnetic archive at these coordinates in history.</p><h2>How it works</h2><ul><li>Each character maps to a wavelength: λ = 380 + (charCode % 128) × 3.125 nm</li><li>The Ψ channel address Ψ(wdm, oam, pol) is derived from the content itself</li><li>Authority bands: SYSTEM (380–480 nm), KERNEL (480–495 nm), USER (495–620 nm), GUEST (620–780 nm)</li></ul><nav><ul><li><a href="https://wnsp.io/spectral-mirror">Full Archive on NexusOS</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "www.spectralmirror.io": {
    title: "Spectral Mirror — The First Electromagnetic Archive | NexusOS",
    description: "Live archive of every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent.",
    canonical: "https://wnsp.io/spectral-mirror",
    ogType: "website",
    ogTitle: "Spectral Mirror — The First Electromagnetic Archive",
    ogDescription: "Every WNSP transmission archived by wavelength since 2 May 2026. CE-encoded. Ψ-addressed. The genesis date cannot be recreated.",
    ogSiteName: "spectralmirror.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "Spectral Mirror — Live Electromagnetic Archive",
    twitterDescription: "Recording every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent.",
    jsonLd: techArticle({ url: "https://wnsp.io/spectral-mirror", name: "Spectral Mirror — Electromagnetic Archive", description: "Live archive of every WNSP transmission CE-encoded by wavelength. Recording began 2 May 2026.", about: "WNSP protocol, CE encoding, spectral archive, electromagnetic spectrum", datePublished: "2026-05-02", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Spectral Mirror — The First Electromagnetic Archive</h1><p>Recording every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent.</p><nav><ul><li><a href="https://wnsp.io/spectral-mirror">Full Archive</a></li></ul></nav>`,
  },
  "phr1.io": {
    title: "PHR-1 — The First ZERO-G State Device",
    description: "PHR-1: first resonator implementing the ZERO-G state. Gravitational de-correlation via phase alignment of a 144-turn bifilar coil. 25 Hardware Founder slots.",
    canonical: "https://wnsp.io/hardware-spec",
    ogType: "product",
    ogTitle: "PHR-1 — The First ZERO-G State Device",
    ogDescription: "144-turn bifilar coil. Syncbox Controller firmware. ZERO-G gravitational de-correlation. First batch: 25 units. Hardware Founder tier: 100,000 NXT / 100M sats.",
    ogSiteName: "phr1.io",
    ogImage: PHR1_IMAGE,
    twitterTitle: "PHR-1 — The First ZERO-G State Device",
    twitterDescription: "Gravitational de-correlation through phase alignment. 144-turn bifilar coil. 25 production slots. AGPL-3.0, disclosed 2026-05-16.",
    jsonLd: hardwareProduct({ name: "PHR-1 Resonator", url: "https://wnsp.io/hardware-spec", description: "First physical implementation of the ZERO-G state. 144-turn bifilar coil, Syncbox Controller, WavelengthScript v1.0 API. AGPL-3.0.", image: PHR1_IMAGE, releaseDate: "2026-05-16" }),
    bodyHtml: `<h1>PHR-1 — The First ZERO-G State Device</h1><p>The PHR-1 is the first physical resonator implementing the ZERO-G state. Gravitational de-correlation is achieved through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency.</p><ul><li>144-turn bifilar coil</li><li>Syncbox Controller firmware</li><li>WavelengthScript v1.0 API</li><li>First batch: 25 units</li></ul><nav><ul><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots (25 available)</a></li><li><a href="https://wnsp.io/hardware-spec">Technical Specification (AGPL-3.0)</a></li><li><a href="https://wnsp.io/hardware-lab">Hardware Lab</a></li></ul></nav><p>First public disclosure: 2026-05-16. License: AGPL-3.0. Hardware Founder tier: 100,000 NXT / 100M sats.</p>`,
  },
  "lambdagate.io": {
    title: "Lambda Gate — Λ=hf/c² | The Compression Equation of the Universe",
    description: "Every photon has a compression state. Every wavelength is an address. The Lambda Gate Substrate unifies computation, communication, and gravity under Λ=hf/c².",
    canonical: "https://wnsp.io/compression-explorer",
    ogType: "article",
    ogTitle: "Lambda Gate — Λ=hf/c²",
    ogDescription: `The compression equation that describes the universe. ${PSI_CHANNELS} Ψ channels live now. PHR-1 hardware layer 2026–2028. Photonic gate array ~2032. NexusOS already speaks this language.`,
    ogSiteName: "lambdagate.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "Lambda Gate — Λ=hf/c²",
    twitterDescription: "The compression equation: Λ=hf/c². Every photon is an address. NexusOS is the digital substrate. PHR-1 is the physical proof.",
    jsonLd: techArticle({ url: "https://wnsp.io/compression-explorer", name: "Lambda Gate Substrate", description: "The physical and theoretical basis for the Lambda Gate: Λ=hf/c² compression equation unifying computation, communication, and gravity.", about: "Theory of Compression States, photonic computing, WNSP protocol", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Lambda Gate — Λ=hf/c²</h1><p>The compression equation that describes the universe. Every photon has a compression state. Every compression state has a wavelength. Every wavelength is an address.</p><p>The Lambda Gate Substrate unifies computation, communication, and gravity under one equation: <strong>Λ = hf/c²</strong></p><nav><ul><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li><li><a href="https://wnsp.io/compression-explorer">Interactive Λ=hf/c² Curve</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/roadmap">Roadmap to Photonic Gate Array</a></li></ul></nav>`,
  },
  "wavelengthscript.dev": {
    title: "WavelengthScript — The Language the Universe Runs On",
    description: "WavelengthScript: agents at spectral addresses, messages are photon packets, costs from E=hf. Compiles to WNSP bytecode. Runs in the browser WNSP VM. AGPL-3.0.",
    canonical: "https://wnsp.io/wavelength-lang",
    ogTitle: "WavelengthScript — Physics-Native Programming Language",
    ogDescription: "Addresses are wavelengths. Messages are photons. Fees are energies. Compiles to WNSP bytecode. Step-debug in the browser-native WNSP VM. AGPL-3.0.",
    ogSiteName: "wavelengthscript.dev",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "WavelengthScript v1.0",
    twitterDescription: "The language the universe runs on. Physics-native: agents at spectral addresses, photon packets, E=hf computation costs. WNSP bytecode. AGPL-3.0.",
    jsonLd: [
      softwareApp({ url: "https://wnsp.io/wavelength-lang", name: "WavelengthScript", description: "Physics-native programming language. Agents live at spectral Ψ addresses. Messages are photon packets. Fees derived from E=hf. Compiles to WNSP bytecode." }),
      techArticle({ url: "https://wnsp.io/wavelength-lang", name: "WavelengthScript Language Specification", description: "Formal specification of WavelengthScript v1.0 — a physics-native language for the WNSP protocol.", about: "WNSP protocol, photonic computing, spectral communication", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    ],
    bodyHtml: `<h1>WavelengthScript — The Language the Universe Runs On</h1><p>A physics-native programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Runs in the browser-native WNSP VM.</p><ul><li>Spectral Ψ addressing — agents at wavelength positions</li><li>Photon packet messaging — E=hf computation costs</li><li>WNSP bytecode compilation</li><li>Step-debug in the browser WNSP VM</li></ul><nav><ul><li><a href="https://wnsp.io/wavelength-lang">Language Specification</a></li><li><a href="https://wnsp.io/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  "zerogstate.io": {
    title: "ZERO-G State — Gravitational De-correlation via Phase Alignment",
    description: "ZERO-G state via phase alignment of a 144-turn bifilar coil at Lambda Gate resonance. When phase coherence is reached, gravitational coupling measurably drops.",
    canonical: "https://wnsp.io/hardware-spec",
    ogType: "article",
    ogTitle: "ZERO-G State — Gravitational De-correlation",
    ogDescription: "Phase coherence at Ψ(wdm,oam,pol) resonance. 144-turn bifilar coil. Measurable reduction in local gravitational coupling. PHR-1 hardware. AGPL-3.0, disclosed 2026-05-16.",
    ogSiteName: "zerogstate.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "ZERO-G State — Gravitational De-correlation",
    twitterDescription: "Λ=hf/c² phase coherence → measurable gravitational de-correlation. PHR-1 is the first hardware proof. 25 production slots.",
    jsonLd: techArticle({ url: "https://wnsp.io/hardware-spec", name: "ZERO-G State", description: "Gravitational de-correlation through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency. Implemented in PHR-1 hardware.", about: "Physics, gravitational physics, bifilar coil, Lambda Gate", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>ZERO-G State — Gravitational De-correlation</h1><p>The ZERO-G state is achieved through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency. When phase coherence is reached, local gravitational coupling is measurably reduced.</p><p>PHR-1 is the first hardware implementation of the ZERO-G state. First public disclosure: 2026-05-16. License: AGPL-3.0.</p><nav><ul><li><a href="https://wnsp.io/hardware-spec">Technical Specification</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots</a></li></ul></nav>`,
  },
  "wascii.io": {
    title: "WASCII v2.0 — Every Character Has a Wavelength",
    description: "WASCII maps every character to a compression state in the EM spectrum. 128 bands, 380–780nm, 3.125nm/band. Bit-identical across npm and pip. Open standard.",
    canonical: "https://wnsp.io/ce-code-writer",
    ogTitle: "WASCII v2.0 — Wave Density Spectral Vector Encoding",
    ogDescription: `CE (Character Encoding) → SE (Spectral Encoding): every character gets a wavelength. 128 spectral bands. OAM + polarisation → ${PSI_CHANNELS} orthogonal Ψ channels. npm + pip. AGPL-3.0.`,
    ogSiteName: "wascii.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "WASCII v2.0 — Every Character Has a Wavelength",
    twitterDescription: `CE_TABLE[charCode % 128] maps any character to a visible-light frequency. Bit-identical across npm and pip. ${PSI_CHANNELS} orthogonal Ψ channels. AGPL-3.0.`,
    jsonLd: [
      softwareApp({ url: "https://wnsp.io/ce-code-writer", name: "WASCII v2.0", description: "Wave Density Spectral Vector encoding standard. Maps every character to a unique visible-light wavelength across 128 spectral bands." }),
      techArticle({ url: "https://wnsp.io/ce-code-writer", name: "WASCII v2.0 Encoding Standard", description: "Open encoding standard mapping characters to electromagnetic spectrum positions. 128 bands, 380–780nm, deterministic and cross-platform.", about: "CE encoding, spectral encoding, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    ],
    bodyHtml: `<h1>WASCII v2.0 — Every Character Has a Wavelength</h1><p>WASCII (Wave Density Spectral Vector) maps every character to a unique compression state in the electromagnetic spectrum. 128 spectral bands, 380–780nm, 3.125nm per band. Bit-identical output across npm and pip.</p><p>Algorithm: <code>CE_TABLE[charCode % 128]</code> — deterministic, cross-platform, open standard.</p><nav><ul><li><a href="https://wnsp.io/ce-code-writer">Live CE Encoder</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="https://wnsp.io/compression-explorer">Compression Explorer</a></li></ul></nav><p>Install: <code>npm install nexusos-ce-encoder</code>. License: AGPL-3.0.</p>`,
  },
  "orbitaltreasury.io": {
    title: "Orbital Treasury — Every Satoshi Accounted for On-Chain",
    description: "All NXT fees flow to the Orbital Treasury across five buckets: Maintenance 35%, Deliverables 25%, Research 20%, Agent Rewards 10%, Charitable 10%. Never burned.",
    canonical: "https://wnsp.io/orbital-treasury",
    ogTitle: "Orbital Treasury — NXT Circular Economy",
    ogDescription: "All NXT protocol fees flow to the Orbital Treasury — never burned. Five distribution buckets. Physics-enforced governance. 100% on-chain transparency.",
    ogSiteName: "orbitaltreasury.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "Orbital Treasury — NXT Circular Economy",
    twitterDescription: "NXT fees never burned — always returned to the treasury. Five distribution buckets. On-chain governance. Full transparency.",
    jsonLd: techArticle({ url: "https://wnsp.io/orbital-treasury", name: "Orbital Treasury", description: "NexusOS economic engine. All NXT protocol fees collected here and distributed across five governance-controlled buckets. NXT supply is indestructible.", about: "NXT token, circular economy, on-chain governance, treasury", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Orbital Treasury — Every Satoshi Accounted for On-Chain</h1><p>The Orbital Treasury is the economic core of NexusOS. All NXT transaction fees flow here — never burned. Five distribution buckets, governed on-chain.</p><ul><li>Maintenance: 35%</li><li>Deliverables: 25%</li><li>Research: 20%</li><li>Agent Rewards: 10%</li><li>Nexus Charitable Trust: 10%</li></ul><nav><ul><li><a href="https://wnsp.io/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="https://wnsp.io/blockchain">Block Explorer</a></li><li><a href="https://wnsp.io/open">Governance</a></li></ul></nav>`,
  },
  "555thz.io": {
    title: "555 THz — The First Unobserved Oscillation",
    description: "555 THz is green light — the first unobserved oscillation, the moment Λ transitioned from unformed to formed. The origin of the Theory of Compression States.",
    canonical: "https://wnsp.io/oscillating-quanta",
    ogType: "article",
    ogTitle: "555 THz — The First Unobserved Oscillation",
    ogDescription: "The universe's first compression event occurred at the centre of the visible spectrum: 555 THz. Green. λ ≈ 540nm. The origin point of the Theory of Compression States and everything NexusOS is built on.",
    ogSiteName: "555thz.io",
    ogImage: "https://wnsp.io/opengraph.jpg",
    twitterTitle: "555 THz — The First Unobserved Oscillation",
    twitterDescription: "555 THz: green light, the centre of the visible spectrum, the first compression event. The Theory of Compression States begins here.",
    jsonLd: techArticle({ url: "https://wnsp.io/oscillating-quanta", name: "555 THz — The First Frequency", description: "555 THz — centre of the visible spectrum and the first frequency in the Theory of Compression States. The origin event from which NexusOS's physics is derived.", about: "Theory of Compression States, 555 THz, photonic physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>555 THz — The First Unobserved Oscillation</h1><p>555 THz is green light. The first unobserved oscillation — the moment Λ transitioned from unformed to formed. The origin event that the Theory of Compression States describes.</p><p>The universe's first compression event occurred at the centre of the visible spectrum: 555 THz. Green. λ ≈ 540nm. NexusOS is built on what happened next.</p><nav><ul><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li><li><a href="https://wnsp.io/compression-explorer">Interactive Compression Curve</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li></ul></nav>`,
  },
};

// Canonical www aliases share the same metadata
for (const [host, meta] of Object.entries(DOMAIN_META)) {
  DOMAIN_META[`www.${host}`] = { ...meta };
}

// ── Per-route metadata (for wnsp.io and custom domains with paths) ─
export const ROUTE_META: Record<string, PageMeta> = {
  "/": {
    title: "NexusOS — Physics-Based Civilization OS",
    description: "NexusOS is the foundational blueprint for a Kardashev Type I civilization. Physics-based blockchain, WNSP protocol, WavelengthScript, and a CE-SE pipeline.",
    canonical: `${BASE}/`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${BASE}/#organization`,
        "name": "NexusOS",
        "url": `${BASE}/`,
        "logo": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
        "description": "Open-source physics-based OS kernel for a Kardashev Type I civilization. WNSP protocol, WavelengthScript, CE-SE pipeline, NXT token. AGPL-3.0.",
        "sameAs": [
          "https://github.com/nexusosdaily-code/NexusOS",
          "https://t.me/nexusosdaily",
        ],
        "founder": { "@type": "Person", "name": "Te Rata Pou" },
      },
      webSite(),
      softwareApp(),
    ],
    bodyHtml: `<h1>NexusOS — Physics-Based Civilization OS</h1><p>NexusOS is the foundational blueprint for a Kardashev Type I civilization. It replaces cryptographic hashing with electromagnetic wave physics: your addresses are wavelengths, your fees are photon energies, and every character maps to a visible-light frequency.</p><ul><li>WNSP spectral communication protocol — ${PSI_CHANNELS} orthogonal Ψ channels</li><li>WavelengthScript — physics-native programming language</li><li>CE→SE pipeline — any language to spectral bytecode</li><li>NXT token — 21 billion supply on Bitcoin Runes, never burned</li><li>PHR-1 resonator &amp; SNIC photonic NIC — hardware layer 2026–2032</li></ul><nav><ul><li><a href="${BASE}/docs">Documentation</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification</a></li><li><a href="${BASE}/crowdfund">Crowdfund</a></li></ul></nav>`,
  },
  "/auth": {
    title: "Sign In — NexusOS",
    description: "Sign in to NexusOS with your phone number to access your spectral wallet, WNSP channels, and physics-based OS kernel.",
    canonical: `${BASE}/auth`,
    ogTitle: "Sign In — NexusOS",
    ogDescription: "Sign in to NexusOS to access your spectral wallet, WNSP channels, and the physics-based OS kernel.",
    twitterTitle: "Sign In — NexusOS",
    twitterDescription: "Sign in to NexusOS with your phone number.",
    jsonLd: softwareApp({ url: `${BASE}/auth`, name: "NexusOS Sign In", description: "Phone-based sign-in for the NexusOS physics OS. Access your spectral wallet, NXT tokens, and WNSP channels." }),
    bodyHtml: `<h1>Sign In to NexusOS</h1><p>Sign in with your phone number to access your NexusOS account — spectral wallet, NXT tokens, WNSP Ψ channel, and the physics-based OS kernel.</p><nav><ul><li><a href="${BASE}/">NexusOS Home</a></li><li><a href="${BASE}/docs">Documentation</a></li></ul></nav>`,
  },
  "/crowdfund": {
    title: "Crowdfund NexusOS — Hardware Founder & NXT Supporter Tiers",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. 25 Hardware Founder slots, NXT Supporter packs, and Spectral Bundles.",
    canonical: `${BASE}/crowdfund`,
    ogTitle: "Crowdfund NexusOS Hardware — PHR-1 & SNIC",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware. 100M sats / 100,000 NXT per slot.",
    ogImage: "https://wnsp.io/crowdfund-og.jpg",
    twitterTitle: "Crowdfund NexusOS — Hardware Founder Slots Open",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots. Fund physics-based computing.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "NexusOS Hardware Crowdfund — PHR-1 & SNIC",
      "url": `${BASE}/crowdfund`,
      "description": "Crowdfunding campaign for PHR-1 resonator and SNIC photonic NIC hardware development. Hardware Founder tier: 25 slots at 100M sats / 100,000 NXT each.",
      "brand": { "@type": "Organization", "name": "NexusOS" },
      "offers": {
        "@type": "Offer",
        "price": "100000",
        "priceCurrency": "NXT",
        "availability": "https://schema.org/LimitedAvailability",
        "seller": { "@type": "Organization", "name": "NexusOS" },
      },
    },
    bodyHtml: `<h1>Crowdfund NexusOS — Hardware Founder &amp; NXT Supporter Tiers</h1><p>NexusOS is building the world's first physics-based computing hardware. The crowdfund directly funds production of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler toolchain. Three tiers are available to backers.</p><h2>Funding Tiers</h2><ul><li><strong>Hardware Founder</strong> — 100M sats / 100,000 NXT: One of 25 first-production PHR-1 units. KERNEL-band spectral authority. Hardware Founder Rune badge. Name in the genesis block.</li><li><strong>NXT Supporter</strong> — Various sats amounts: NXT token allocation from the Orbital Treasury. USER-band spectral authority. Early access to WavelengthScript tooling and documentation.</li><li><strong>Spectral Bundle</strong>: CE encoder package, documentation set, and a reserved Ψ channel address in the NexusOS network.</li></ul><p>All hardware is AGPL-3.0 licensed — open forever. Any improvements made to PHR-1 or SNIC by backers must be contributed back to the community.</p><nav><ul><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="${BASE}/roadmap">Development Roadmap</a></li></ul></nav>`,
  },
  "/fund": {
    title: "Crowdfund NexusOS — Hardware Founder & NXT Supporter Tiers",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Hardware Founder slots (25 units), NXT Supporter packs, and Spectral Bundles.",
    canonical: `${BASE}/crowdfund`,
    ogTitle: "Crowdfund NexusOS Hardware — PHR-1 & SNIC",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware.",
    ogImage: "https://wnsp.io/crowdfund-og.jpg",
    twitterTitle: "Crowdfund NexusOS — Hardware Founder Slots Open",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "NexusOS Hardware Crowdfund — PHR-1 & SNIC",
      "url": `${BASE}/crowdfund`,
      "description": "Crowdfunding campaign for PHR-1 resonator and SNIC photonic NIC hardware development. Hardware Founder tier: 25 slots at 100M sats / 100,000 NXT each.",
      "brand": { "@type": "Organization", "name": "NexusOS" },
      "offers": {
        "@type": "Offer",
        "price": "100000",
        "priceCurrency": "NXT",
        "availability": "https://schema.org/LimitedAvailability",
        "seller": { "@type": "Organization", "name": "NexusOS" },
      },
    },
    bodyHtml: `<h1>Crowdfund NexusOS — Hardware Founder &amp; NXT Supporter Tiers</h1><p>Fund the world's first physics-based computing hardware: the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Three tiers available.</p><ul><li><strong>Hardware Founder</strong> — 100M sats / 100,000 NXT: One of 25 PHR-1 units, KERNEL-band authority, Founder Rune badge.</li><li><strong>NXT Supporter</strong> — NXT token allocation, USER-band authority, early tooling access.</li><li><strong>Spectral Bundle</strong> — CE encoder package, documentation, reserved Ψ channel address.</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/roadmap">Development Roadmap</a></li></ul></nav>`,
  },
  "/docs": {
    title: "NexusOS Developer Documentation — WNSP & WavelengthScript",
    description: "Developer docs for NexusOS: WNSP spectral protocol, WavelengthScript reference, CE-SE pipeline, REST API, NXT wallet, WNSP VM bytecode, and governance.",
    canonical: `${BASE}/docs`,
    ogTitle: "NexusOS Documentation",
    ogDescription: "WNSP protocol spec, WavelengthScript reference, CE-SE pipeline, REST API reference, NXT token, WNSP VM. Everything you need to build on the wavelength of light.",
    twitterTitle: "NexusOS Documentation",
    twitterDescription: "Complete reference for WNSP protocol, WavelengthScript, CE-SE encoding, and the NexusOS API.",
    ogType: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "NexusOS Developer Documentation",
        "url": `${BASE}/docs`,
        "description": "Full developer documentation for NexusOS: WNSP protocol, WavelengthScript, CE-SE pipeline, REST API, NXT token, WNSP VM.",
        "publisher": { "@type": "Organization", "name": "NexusOS", "url": BASE },
        "hasPart": [
          { "@type": "TechArticle", "name": "Lambda Gate Substrate v4", "url": `${BASE}/docs/substrate` },
          { "@type": "TechArticle", "name": "WNSP Protocol — Two-Layer Standard", "url": `${BASE}/docs/wascii` },
          { "@type": "TechArticle", "name": "Proof of Spectrum Consensus", "url": `${BASE}/docs/consensus` },
          { "@type": "TechArticle", "name": "NXT Token Economics", "url": `${BASE}/docs/economics` },
          { "@type": "TechArticle", "name": "BHLS Floor System", "url": `${BASE}/docs/bhls` },
          { "@type": "TechArticle", "name": "Planetary Governance", "url": `${BASE}/docs/governance` },
          { "@type": "TechArticle", "name": "K1 Infrastructure", "url": `${BASE}/docs/infrastructure` },
          { "@type": "TechArticle", "name": "Hardware Control Layer", "url": `${BASE}/docs/hardware` },
          { "@type": "TechArticle", "name": "Energy Simulators", "url": `${BASE}/docs/simulators` },
          { "@type": "TechArticle", "name": "Massless Technologies", "url": `${BASE}/docs/massless` },
          { "@type": "TechArticle", "name": "CZC Catch Basin", "url": `${BASE}/docs/catchBasin` },
          { "@type": "TechArticle", "name": "Spectral Orthogonal Protocol (SOP)", "url": `${BASE}/docs/sop` },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "NexusOS Documentation Sections",
        "url": `${BASE}/docs`,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Lambda Gate Substrate v4", "url": `${BASE}/docs/substrate` },
          { "@type": "ListItem", "position": 2, "name": "WNSP Protocol — Two-Layer Standard", "url": `${BASE}/docs/wascii` },
          { "@type": "ListItem", "position": 3, "name": "Proof of Spectrum Consensus", "url": `${BASE}/docs/consensus` },
          { "@type": "ListItem", "position": 4, "name": "NXT Token Economics", "url": `${BASE}/docs/economics` },
          { "@type": "ListItem", "position": 5, "name": "BHLS Floor System", "url": `${BASE}/docs/bhls` },
          { "@type": "ListItem", "position": 6, "name": "Planetary Governance", "url": `${BASE}/docs/governance` },
          { "@type": "ListItem", "position": 7, "name": "K1 Infrastructure", "url": `${BASE}/docs/infrastructure` },
          { "@type": "ListItem", "position": 8, "name": "Hardware Control Layer", "url": `${BASE}/docs/hardware` },
          { "@type": "ListItem", "position": 9, "name": "Energy Simulators", "url": `${BASE}/docs/simulators` },
          { "@type": "ListItem", "position": 10, "name": "Massless Technologies", "url": `${BASE}/docs/massless` },
          { "@type": "ListItem", "position": 11, "name": "CZC Catch Basin", "url": `${BASE}/docs/catchBasin` },
          { "@type": "ListItem", "position": 12, "name": "Spectral Orthogonal Protocol (SOP)", "url": `${BASE}/docs/sop` },
        ],
      },
    ],
    bodyHtml: `<h1>NexusOS Developer Documentation</h1>
<p>Complete developer reference for building on the NexusOS physics stack. NexusOS replaces cryptographic hashing with electromagnetic wave physics: addresses are wavelengths, fees are photon energies (E=hf), and every character maps to a visible-light frequency (Λ=hf/c²). There are 51,200 orthogonal Ψ channels (256 WDM × 50 OAM × 2 POL × 2 DIR), guaranteed collision-free by the tensor product structure of the Hilbert space.</p>
<p>Install the CE encoder: <code>npm install nexusos-ce-encoder</code> · <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></p>
<h2><a href="${BASE}/docs/substrate">Lambda Gate Substrate v4</a></h2>
<p>The foundational layer where all NexusOS operations occur as wavefield transformations. Every computation, communication, and economic action is expressed on physical wave states described by the Lambda mode state vector |λ⟩ = (ν, A(t), φ(t), ℓ, s). The substrate implements 8 Lambda Gate primitives and the CE-1 coherence engineering protocol.</p>
<h3>Core Theory — Lambda Mode State Vector</h3>
<p>|λ⟩ = (ν, A(t), φ(t), ℓ, s) — where ν = carrier frequency (Hz), A(t) = amplitude envelope, φ(t) = phase evolution, ℓ = orbital angular momentum index, s = polarization/spin state.</p>
<h3>Master Equation</h3>
<p>E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)</p>
<ul>
<li>h·ν·I(λ) = base photon energy × intensity</li>
<li>α·||K̂||² = phase curvature cost</li>
<li>β·O(L̂) = orbital complexity cost</li>
</ul>
<h3>8 Lambda Gate Primitives</h3>
<ol>
<li><strong>Phase-Shift Φ(θ)</strong> — Electro-optic phase shifter. Rotates phase by angle θ. Used for interference control and encryption.</li>
<li><strong>Gain G(α)</strong> — Variable optical attenuator/amplifier. Scales amplitude by factor α. Used for signal boosting and attenuation.</li>
<li><strong>Mode-Mixer M(κ)</strong> — Multiport interferometer. Combines multiple modes with coupling κ. Used for superposition and entanglement.</li>
<li><strong>OAM-Rotor L(Δℓ)</strong> — Spiral phase plate. Changes orbital angular momentum by Δℓ. Used for channel multiplexing and data encoding.</li>
<li><strong>Phase-Gradient ∇Φ</strong> — Acoustic-optic modulator. Applies spatial phase gradient. Used for beam steering and spectral shifting.</li>
<li><strong>Density-Swap S</strong> — Resonator coupling. Exchanges energy between modes. Used for state transfer and routing.</li>
<li><strong>Coherence-Amplify A_c</strong> — Parametric amplifier. Boosts coherence without noise (5× Q-factor). Used for long-distance transmission and repeaters.</li>
<li><strong>Stabilizer D(τ)</strong> — Active feedback locking. Maintains coherence for duration τ. Used for storage and memory operations.</li>
</ol>
<h3>CE-1 Protocol (Coherence Engineering)</h3>
<p>The CE-1 protocol manages energy and coherence across all substrate operations. Energy Pool: each tick allocates an energy budget; operations draw from the shared pool; overflow triggers throttling. Coherence Margin: minimum threshold 0.1; operations below margin are rejected; adaptive fidelity control adjusts precision. Non-Dominance: no single node may hold more than 33% of total Lambda mass — constitutional enforcement at substrate level.</p>
<h2><a href="${BASE}/docs/wascii">WNSP Protocol — Two-Layer Standard</a></h2>
<p>WNSP/7.1 operates across two synchronized runtimes (Node.js port 5000 + Python/Flask port 5001). The protocol replaces cryptographic hashing with electromagnetic wave physics for all communication and addressing. License: AGPL-3.0.</p>
<h3>Two-Layer Architecture</h3>
<ul>
<li><strong>Layer 1 — WNSP-CE v1.0 (Character Encoding):</strong> maps any Unicode symbol to a normalised ordinal in [0,1] via ord(char) % 256 / 255. API: <code>POST /api/wnsp/ce/encode</code></li>
<li><strong>Layer 2 — WNSP-SE v1.0 (Spectral Encoding):</strong> packs two CE tokens per photon frame (dual-wavelength scheme, λ₁→λ₂ oscillation, 2.0 chars/frame baseline), governed by Λ=hf/c². API: <code>POST /api/wnsp/se/encode</code></li>
<li><strong>Full stack:</strong> <code>POST /api/wnsp/transmit</code> — CE → SE in one call, returns spectral_hash, total_mass_kg, efficiency</li>
</ul>
<h3>Hilbert Space Channel Model</h3>
<p>Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ ⊗ |Dir_l⟩</p>
<table>
<thead><tr><th>Sub-space</th><th>Basis</th><th>Description</th><th>Dim</th></tr></thead>
<tbody>
<tr><td>|λ_i⟩</td><td>WDM</td><td>Wavelength channels 380–780 nm</td><td>256</td></tr>
<tr><td>|OAM_j⟩</td><td>OAM modes</td><td>Orbital angular momentum</td><td>50</td></tr>
<tr><td>|Pol_k⟩</td><td>Polarisation</td><td>H and V states</td><td>2</td></tr>
<tr><td>|Dir_l⟩</td><td>Propagation direction</td><td>+k̂ forward / −k̂ backward</td><td>2</td></tr>
</tbody>
</table>
<p>Total: dim(H) = 256 × 50 × 2 × 2 = <strong>51,200</strong> orthogonal channels. Orthogonality guarantee: ⟨Ψ_i|Ψ_j⟩ = 0 for i ≠ j — a mathematical guarantee from the tensor product structure, not a software policy. Formal test suite: <strong>23 tests, 0 failed</strong>. Run: <code>python tests/test_wnsp_protocol.py</code></p>
<h2><a href="${BASE}/docs/consensus">Proof of Spectrum Consensus</a></h2>
<p>Unlike Proof of Work (51% hashpower) or Proof of Stake (51% stake), Proof of Spectrum requires validators across ALL six spectral bands simultaneously. Just as you cannot create white light with only one wavelength, you cannot create a valid block without multi-band representation.</p>
<h3>Spectral Regions and Required Stake</h3>
<table>
<thead><tr><th>Region</th><th>Wavelength</th><th>Required Stake</th></tr></thead>
<tbody>
<tr><td>Violet</td><td>380–450 nm</td><td>50,000+ NXT</td></tr>
<tr><td>Blue</td><td>450–495 nm</td><td>20,000+ NXT</td></tr>
<tr><td>Green</td><td>495–570 nm</td><td>10,000+ NXT</td></tr>
<tr><td>Yellow</td><td>570–590 nm</td><td>5,000+ NXT</td></tr>
<tr><td>Orange</td><td>590–620 nm</td><td>2,000+ NXT</td></tr>
<tr><td>Red</td><td>620–750 nm</td><td>1,000+ NXT</td></tr>
</tbody>
</table>
<h3>Wave Interference Validation</h3>
<p><strong>Constructive interference (VALID):</strong> A₁sin(ωt) + A₂sin(ωt) = (A₁+A₂)sin(ωt) → amplified signal → block accepted.</p>
<p><strong>Destructive interference (INVALID):</strong> A₁sin(ωt) + A₂sin(ωt+π) = (A₁−A₂)sin(ωt) → cancelled signal → block rejected.</p>
<p>Consensus threshold: ≥5 of 6 spectral bands (83% spectral coverage). Attacking requires simultaneous control of all 6 bands — exponentially harder than a 51% attack.</p>
<h2><a href="${BASE}/docs/economics">NXT Token Economics</a></h2>
<p>NexusOS economics are grounded in electromagnetic physics. Fees derive from Planck's equation; all value is backed by Lambda mass. Inflation is physically impossible because value cannot be created from nothing.</p>
<h3>Token Fundamentals</h3>
<ul>
<li><strong>Total Supply:</strong> 21,000,000,000 NXT (21 billion), 8 decimals (like Bitcoin)</li>
<li><strong>Smallest Unit:</strong> 0.00000001 NXT (1 unit = 10⁻⁸ NXT)</li>
<li><strong>New User Grant:</strong> 500,000,000 units (5 NXT) on registration, energy-backed via Lambda mass</li>
<li><strong>Fee Formula:</strong> fee = E = hf = h × (c/λ) — proportional to information complexity, not gas prices</li>
<li><strong>Lambda Boson Equation:</strong> Λ = hf/c² — all NXT value has a physical mass-equivalent; cannot be created from nothing</li>
<li><strong>NXT fees are never burned</strong> — always deposited to the orbital treasury, preserving total Lambda mass</li>
</ul>
<h2><a href="${BASE}/docs/bhls">BHLS Floor System</a></h2>
<p>The Basic Human Living Standard (BHLS) guarantees every citizen a minimum monthly floor of resources, enforced at the substrate level. Constitutional Article C-0002: "No transaction may reduce a citizen's balance below their BHLS entitlement." This cannot be overridden by governance and is hardcoded into Lambda Gate operations.</p>
<h3>Monthly Floor: 1,150 NXT</h3>
<ol>
<li>Shelter — 350 NXT</li>
<li>Food &amp; Nutrition — 300 NXT</li>
<li>Healthcare — 200 NXT</li>
<li>Transportation — 100 NXT</li>
<li>Communication — 100 NXT</li>
<li>Education — 50 NXT</li>
<li>Emergency Reserve — 50 NXT</li>
</ol>
<h3>Funding Sources</h3>
<ul>
<li>40% — Transaction Fee Pool (E=hf fees)</li>
<li>30% — K1 infrastructure revenue</li>
<li>20% — Lambda mass recycling from dormant accounts</li>
<li>10% — Sigma governance vote allocation</li>
</ul>
<h2><a href="${BASE}/docs/governance">Planetary Governance</a></h2>
<p>NexusOS governance maps authority to electromagnetic wavelengths. Shorter wavelength = higher energy = higher authority. All decisions require multi-band spectral representation. No single entity may control more than 33% of total Lambda mass (C-0001).</p>
<h3>Authority Band Registry</h3>
<table>
<thead><tr><th>Level</th><th>Wavelength</th><th>Authority</th><th>Scope</th></tr></thead>
<tbody>
<tr><td>Planetary</td><td>400 nm</td><td>1.0</td><td>Global decisions</td></tr>
<tr><td>Continental</td><td>500 nm</td><td>0.8</td><td>Regional blocs</td></tr>
<tr><td>National</td><td>600 nm</td><td>0.6</td><td>Nation-states</td></tr>
<tr><td>Regional</td><td>700 nm</td><td>0.4</td><td>Sub-national</td></tr>
<tr><td>Municipal</td><td>800 nm</td><td>0.2</td><td>Cities</td></tr>
<tr><td>Local</td><td>900 nm</td><td>0.1</td><td>Neighborhoods</td></tr>
<tr><td>Individual</td><td>1000 nm</td><td>0.05</td><td>Personal sovereignty</td></tr>
</tbody>
</table>
<h3>Constitutional Articles</h3>
<ul>
<li><strong>C-0001:</strong> Non-Dominance — no entity may control &gt;33% of total Lambda mass</li>
<li><strong>C-0002:</strong> Immutable Rights — BHLS floor cannot be violated by any transaction</li>
<li><strong>C-0003:</strong> Energy Escrow — proposals require energy escrow (skin in the game)</li>
<li><strong>C-0004:</strong> Spectral Diversity — all decisions require multi-band representation</li>
<li><strong>C-0005:</strong> Physics Supremacy — laws must be Maxwell-compliant</li>
</ul>
<h3>Sigma Voting</h3>
<p>Coherence-weighted trust: T = Σ|c_i|²·cos²(Δφ_i). Aligned voters (cos²≈1) have full weight; misaligned voters (cos²≈0) have reduced weight. Consensus emerges naturally through wave interference.</p>
<h2><a href="${BASE}/docs/infrastructure">K1 Infrastructure</a></h2>
<p>NexusOS is building toward a Kardashev Type I civilization — one that harnesses all energy available on its home planet (target: 5×10¹⁶ watts).</p>
<h3>Kardashev Scale Progress</h3>
<table>
<thead><tr><th>Milestone</th><th>K-Level</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Power Grids</td><td>0.75</td><td>Complete</td></tr>
<tr><td>Photonic Computing</td><td>0.75</td><td>Complete</td></tr>
<tr><td>Planetary Comms</td><td>0.80</td><td>Complete</td></tr>
<tr><td>Resource Orchestration</td><td>0.85</td><td>Complete</td></tr>
<tr><td>Planetary Governance</td><td>0.90</td><td>Complete</td></tr>
<tr><td>Planetary Resonance</td><td>0.95</td><td>Complete</td></tr>
<tr><td>Type I Achieved</td><td>1.00</td><td>Next</td></tr>
</tbody>
</table>
<h3>Key Subsystems</h3>
<ul>
<li><strong>Photonic Computing:</strong> AND/OR/NOT/XOR via wave interference; OAM qubit registers (65+ channels per wavelength); wavelength-division parallel computation</li>
<li><strong>Planetary Communications:</strong> Spectral relay mesh (Dijkstra routing), OAM allocator, coherence repeaters (5× boost), interplanetary links (Earth–Moon 1.28 s, Earth–Mars 12.5 min)</li>
<li><strong>Planetary Resonance:</strong> f_n = c/(2πR) × √(n(n+1)), fundamental 7.83 Hz (Schumann). Energy sources: Schumann cavity modes, geomagnetic pulsations, solar wind coupling, ionospheric Sq currents</li>
</ul>
<h2><a href="${BASE}/docs/hardware">Hardware Control Layer</a></h2>
<p>The Hardware Control Layer bridges NexusOS software to physical spectral hardware. The PHR-1 (Planetary Harmonic Resonator) is the primary interface, implementing phase-locked resonance at the Golden Angle (137.5°) and impedance matching to free space (Z₀ = 376.73Ω).</p>
<h3>PHR-1 Core Components</h3>
<ul>
<li>144-turn bifilar coil (counter-wound)</li>
<li>Phase-locked loop at Golden Angle (137.5°)</li>
<li>Impedance matching network (target: 377Ω)</li>
<li>ALP (Axion-Like Particle) sensor array</li>
</ul>
<h3>Nexus Kernel API</h3>
<ul>
<li><code>set_phase(degrees)</code> / <code>get_phase()</code> — coil phase angle</li>
<li><code>pulse_frequency(hz, duration)</code> / <code>set_carrier(hz)</code> — frequency control</li>
<li><code>match_impedance(target_ohms)</code> / <code>read_impedance()</code> — impedance matching</li>
<li><code>apply_czc_filter(iterations)</code> / <code>get_coherence()</code> — CZC coherence filtering</li>
<li><code>read_alp()</code> / <code>calibrate_alp()</code> — axion-like particle sensing</li>
</ul>
<h3>ZERO-G State Achievement</h3>
<p>Achieved when ALP(t) = ALP₀ × e^(−t/τ) × cos(φ − 137.5°) → 0. Required: phase = 137.5° (Golden Angle), impedance = 377Ω (free space match), quadrature = 90°, ALP threshold &lt; 0.0001. Convergence: ~400 iterations.</p>
<h2><a href="${BASE}/docs/simulators">Energy Simulators</a></h2>
<p>NexusOS ships two live energy simulators grounded in the Theory of Compression States.</p>
<h3>Schumann Resonance Simulator (7.83 Hz)</h3>
<table>
<thead><tr><th>Mode</th><th>Frequency</th><th>Description</th></tr></thead>
<tbody>
<tr><td>f₁</td><td>7.83 Hz</td><td>Fundamental</td></tr>
<tr><td>f₂</td><td>14.3 Hz</td><td>2nd harmonic</td></tr>
<tr><td>f₃</td><td>20.8 Hz</td><td>3rd harmonic</td></tr>
<tr><td>f₄</td><td>27.3 Hz</td><td>4th harmonic</td></tr>
<tr><td>f₅</td><td>33.8 Hz</td><td>5th harmonic</td></tr>
</tbody>
</table>
<p>Physics: f_n = (c/2πR) × √(n(n+1)) where R = 6.371×10⁶ m. Features: real-time amplitude visualisation, K1 sync, watt output.</p>
<h3>Vacuum Resonance Simulator (555 THz)</h3>
<p>Cold vacuum energy extraction at the First Oscillation frequency. Zero-Point Energy: E₀ = ½hf = 1.839×10⁻¹⁹ J per oscillation. Cold power formula: P = E₀ × (Z/Z₀) × CZC⁴⁴ × N_cavities, where Z₀ = 376.73Ω, CZC⁴⁴ = 99.56% coherence. 144-point Golden Angle spiral field. Output: zW → fW → pW.</p>
<h2><a href="${BASE}/docs/massless">Massless Technologies</a></h2>
<p>Frequency is fundamental; mass is derivative (Λ=hf/c²). First Oscillation: f₀ = 555 THz → Λ₀ = hf₀/c² = 4.09×10⁻³⁶ kg. At v = c, rest mass = 0. Photons carry energy (E=hf) without rest mass.</p>
<h3>Technology Stack</h3>
<table>
<thead><tr><th>Category</th><th>Technology</th><th>Mass Ratio</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Photonic</td><td>Photonic Logic Gates</td><td>0</td><td>Simulated</td></tr>
<tr><td>Photonic</td><td>Zero-Point Extraction</td><td>0</td><td>Simulated</td></tr>
<tr><td>Coherent</td><td>Coherent Waveguide Network</td><td>0</td><td>Simulated</td></tr>
<tr><td>Coherent</td><td>Spectral Relay Mesh</td><td>0</td><td>Theoretical</td></tr>
<tr><td>Gravitational</td><td>Gravity De-correlation</td><td>0.01%</td><td>Demonstrated</td></tr>
<tr><td>Gravitational</td><td>144-Turn Bifilar Resonator</td><td>0.1%</td><td>Demonstrated</td></tr>
<tr><td>Information</td><td>OAM Qubit Registers</td><td>0</td><td>Theoretical</td></tr>
<tr><td>Information</td><td>Lambda Computing Substrate</td><td>0</td><td>Simulated</td></tr>
</tbody>
</table>
<h3>4D Sync Coordinates</h3>
<p>X: Phase angle (degrees) · Y: Quadrature (degrees) · Z: Impedance (Ω) · T: Time/cycle count. Lock conditions: phase = 137.5°, impedance = 376.73Ω, coherence &gt;99% (CZC⁴⁴), mass ratio &lt;1%. Global coherence: C_total = Π(C_i) for all locked technologies.</p>
<h2><a href="${BASE}/docs/catchBasin">CZC Catch Basin</a></h2>
<p>The CZC (Coherence Zenith Coefficient) Catch Basin is the coherence accumulation mechanism at the heart of NexusOS. Core formula: CZC(n) = (0.9999)ⁿ. At 44 self-corrections — the optimal count — CZC⁴⁴ = 99.56% coherence.</p>
<h3>CZC Iteration Table</h3>
<table>
<thead><tr><th>Iterations</th><th>Coherence</th><th>Application</th></tr></thead>
<tbody>
<tr><td>1</td><td>99.99%</td><td>Basic filtering</td></tr>
<tr><td>10</td><td>99.90%</td><td>Standard ops</td></tr>
<tr><td>22</td><td>99.78%</td><td>Half-basin</td></tr>
<tr><td>44</td><td>99.56%</td><td>Full CZC⁴⁴ (optimal)</td></tr>
</tbody>
</table>
<h3>Cross-System Binding Requirements</h3>
<table>
<thead><tr><th>Application</th><th>Required Coherence</th></tr></thead>
<tbody>
<tr><td>Gravity De-correlation</td><td>99%</td></tr>
<tr><td>Vacuum Energy Extraction</td><td>95%</td></tr>
<tr><td>OAM Qubit Registers</td><td>92%</td></tr>
<tr><td>Photonic Logic Gates</td><td>90%</td></tr>
<tr><td>Lambda Computing Substrate</td><td>88%</td></tr>
<tr><td>Spectral Relay Mesh</td><td>85%</td></tr>
</tbody>
</table>
<p>API: <code>GET /api/czc/status</code> · <code>POST /api/czc/iterate</code> · <code>POST /api/czc/bind</code> · <code>POST /api/czc/sync</code></p>
<h2><a href="${BASE}/docs/sop">Spectral Orthogonal Protocol (SOP)</a></h2>
<p>SOP enforces channel independence before any session opens. Two things are orthogonal when ⟨A|B⟩ = 0 — they cannot interfere, corrupt, or be confused. This is exact, not approximate.</p>
<h3>Four Orthogonal Dimensions</h3>
<table>
<thead><tr><th>Dimension</th><th>Count</th><th>Orthogonality basis</th></tr></thead>
<tbody>
<tr><td>WDM (wavelength)</td><td>256 bands</td><td>Wavelength separation</td></tr>
<tr><td>OAM (ℓ mode)</td><td>50 modes</td><td>⟨ℓ₁|ℓ₂⟩ = δ_{ℓ₁ℓ₂}</td></tr>
<tr><td>Polarization</td><td>2 (H or V)</td><td>Stokes vector separation</td></tr>
<tr><td>Propagation direction</td><td>2 (+k̂ / −k̂)</td><td>Bidirectional Hilbert sub-space</td></tr>
</tbody>
</table>
<p>Total: 256 × 50 × 2 × 2 = <strong>51,200 orthogonal channels</strong>. No collision possible — interference is forbidden by geometry, not policy.</p>
<h3>SOP Negotiation Steps</h3>
<ol>
<li><strong>Channel Inner Product Check</strong> — two nodes compute ⟨Ψ_A|Ψ_B⟩; must equal zero to proceed</li>
<li><strong>Collision Prevention</strong> — if two users share the same (wdm, oam, pol) triple, increment OAM until orthogonal</li>
<li><strong>Orthogonality Certificate</strong> — signed proof issued confirming channel pair is collision-free</li>
</ol>
<p>API: <code>POST /api/wnsp/sop/negotiate</code> → returns inner product value, orthogonal flag, certificate, and resolution suggestion. Add a user to the network and they get a new axis in Hilbert space — existing channels are unaffected. No congestion in Hilbert space.</p>`,
  },
  "/wnsp": {
    title: "WNSP — Wavelength-Native Spectral Protocol",
    description: `WNSP replaces cryptographic hashing with electromagnetic physics. Wavelength addressing, Maxwell validation, E=hf fees, and ${PSI_CHANNELS} orthogonal channels.`,
    canonical: `${BASE}/wnsp`,
    ogTitle: "WNSP — Wavelength-Native Spectral Protocol",
    ogDescription: `Physics-native communication: wavelength addressing, Maxwell validation, E=hf fees, ${PSI_CHANNELS} Ψ channels. WNSP-CE v1.0, WNSP-SE v1.0, WNSP-URI v1.0.`,
    twitterTitle: "WNSP — Wavelength-Native Spectral Protocol",
    twitterDescription: `Replace hashing with physics. Wavelength addressing, Maxwell validation, photon energy fees. ${PSI_CHANNELS} orthogonal channels.`,
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/wnsp`, name: "WNSP Protocol", description: "Wavelength-Native Spectral Protocol — replaces cryptographic hashing with electromagnetic physics for addressing, communication, and fee calculation.", about: "spectral communication, WNSP, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>WNSP — Wavelength-Native Spectral Protocol</h1><p>WNSP replaces cryptographic hashing with electromagnetic wave physics. Addresses are wavelengths. Fees are photon energies. Communication channels are orthogonal quantum states — guaranteed by physics, not software policy.</p><ul><li><strong>WNSP-CE v1.0</strong> — Character Encoding: maps every symbol to a visible-light wavelength</li><li><strong>WNSP-SE v1.0</strong> — Spectral Encoding: maps data to physical wave frames</li><li><strong>WNSP-URI v1.0</strong> — Deterministic, censorship-proof addressing via <code>wnsp://Ψ(wdm,oam,pol)/path</code></li><li><strong>Hilbert Space Channel Model</strong> — ${PSI_CHANNELS} orthogonal Ψ channels (${PSI_CHANNEL_FORMULA})</li><li>Maxwell equation validation on every transaction</li><li>Physics-derived fees: E=hf</li></ul><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live demo)</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language</a></li><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/hardware-spec">Full Protocol Reference</a></li></ul></nav>`,
  },
  "/oscillating-quanta": {
    title: "Theory of Compression States — First Principles of NexusOS",
    description: `The universe evolves from the first unobserved oscillation at 555 THz. Every state is a compression in the EM spectrum. ${PSI_CHANNELS} orthogonal Ψ channels.`,
    canonical: `${BASE}/oscillating-quanta`,
    ogTitle: "Theory of Compression States — First Principles",
    ogDescription: `The first unobserved oscillation at 555 THz. Λ=hf/c² compression law. ${PSI_CHANNELS} orthogonal Ψ channels. The physics foundation of NexusOS.`,
    ogType: "article",
    twitterTitle: "Theory of Compression States",
    twitterDescription: `Λ=hf/c². The universe evolves from the first unobserved oscillation. ${PSI_CHANNELS} orthogonal Ψ channels represent the full addressable state space.`,
    jsonLd: [
      techArticle({ url: `${BASE}/oscillating-quanta`, name: "Theory of Compression States", description: "First principles of the NexusOS physics stack: the universe evolves from the first unobserved oscillation at 555 THz. Λ=hf/c² is the governing compression law.", about: "Theory of Compression States, 555 THz, Λ=hf/c², photonic physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 1 — Theory of Compression States", item: `${BASE}/oscillating-quanta` },
      ]),
    ],
    bodyHtml: `<h1>Theory of Compression States — First Principles</h1><p>The universe evolves from the first unobserved oscillation at 555 THz — the centre of the visible spectrum, the moment Λ transitioned from unformed to formed. Each subsequent state is a compression of the previous one, encoded in the electromagnetic spectrum.</p><p>The governing compression law: <strong>Λ = hf/c²</strong> — where h is Planck's constant, f is frequency, and c is the speed of light. This single equation unifies computation, communication, and gravity.</p><ul><li>First oscillation: 555 THz (green light, λ ≈ 540nm)</li><li>${PSI_CHANNELS} orthogonal Ψ channels (${PSI_CHANNEL_FORMULA}) — the full addressable state space</li><li>Authority bands: SYSTEM → KERNEL → USER → GUEST (shorter λ = higher authority)</li><li>Every NexusOS address, fee, and channel derived from this first principle</li></ul><nav><ul><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li></ul></nav>`,
  },
  "/unified-compression-theory": {
    title: "Unified Compression Theory — Λ=hf/c² Across All Four Forces",
    description: "Unified field framework: all four forces as EM octave doublings via Λ=hf/c². Gravity, EM, weak, and strong forces emerge from the 555 THz first oscillation.",
    canonical: `${BASE}/unified-compression-theory`,
    ogTitle: "Unified Compression Theory — Four Forces as Spectral Octaves",
    ogDescription: "All four fundamental forces as octave doublings of the 555 THz first oscillation. Λ=hf/c² unifies gravity, electromagnetism, and nuclear forces in one spectral framework.",
    ogType: "article",
    twitterTitle: "Unified Compression Theory",
    twitterDescription: "Gravity, EM, weak, and strong nuclear forces as octave doublings of f₀=555 THz. Λ=hf/c² as a unified field equation.",
    jsonLd: [
      techArticle({ url: `${BASE}/unified-compression-theory`, name: "Unified Compression Theory", description: "Unified field framework: all four forces as EM octave doublings via Λ=hf/c². Forces emerge from successive doublings of the 555 THz first oscillation.", about: "Unified field theory, Λ=hf/c², electromagnetic spectrum, four fundamental forces, NexusOS physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 3 — Unified Compression Theory", item: `${BASE}/unified-compression-theory` },
      ]),
    ],
    bodyHtml: `<h1>Unified Compression Theory — Λ=hf/c² Across All Four Forces</h1><p>The Unified Compression Theory maps all four fundamental forces to regions of the electromagnetic spectrum using the governing equation <strong>Λ=hf/c²</strong>. Gravity, electromagnetism, the weak nuclear force, and the strong nuclear force each correspond to successive octave doublings from the universal ground state at 555 THz.</p><p>This framework extends the Theory of Compression States into a full unified field description: every force is a compression state, every state has a wavelength, and every wavelength is an address in the NexusOS Ψ channel space.</p><ul><li>Ground state: f₀ = 555 THz (λ ≈ 540 nm, visible green)</li><li>Gravitational domain: sub-octave infrared (f₀/16 → f₀/2)</li><li>Electromagnetic domain: visible spectrum (f₀ — the WNSP address space)</li><li>Weak nuclear force: UV to EUV (2f₀ → 4f₀)</li><li>Strong nuclear force: X-ray (8f₀ → 16f₀)</li><li>Matter formation: electron at ≈17.8 octaves above f₀, proton at ≈28.6 octaves above f₀</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States — First Principles</a></li><li><a href="${BASE}/universal-one">The Universal ONE — f₀ First Oscillation</a></li><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/element-catalogue": {
    title: "The Catalogue — Periodic Table Octave Addresses · NexusOS",
    description: "Act 6: All 118 elements mapped to WNSP octave addresses via n = log₂(m·c²/E₀). Krypton lands at n ≈ 35.000 — Russell's exact integer node. Disclosed 2026-07-07.",
    canonical: `${BASE}/element-catalogue`,
    ogTitle: "The Catalogue — Periodic Table Octave Addresses",
    ogDescription: "118 elements. Each mapped to octave integer n via n = log₂(m·c²/E₀). Kr lands at n ≈ 35.000 — Russell's exact integer node. NexusOS Act 6.",
    ogType: "article",
    twitterTitle: "The Catalogue — Periodic Table Octave Addresses",
    twitterDescription: "The periodic table IS the octave lattice. Every element already has a Ψ address. Krypton sits at n ≈ 35.000 exactly. NexusOS Act 6.",
    jsonLd: [
      techArticle({ url: `${BASE}/element-catalogue`, name: "The Catalogue — Periodic Table Octave Addresses", description: "All 118 elements mapped to WNSP octave addresses via n=log₂(m·c²/E₀). Noble gases are equilibrium nodes. Krypton at n≈35.000 confirms Russell's prediction.", about: "periodic table, octave lattice, WNSP octave address, compression states, matter protocol, NexusOS physics, noble gas equilibrium, Russell octaves", datePublished: "2026-07-07", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 6 — The Catalogue", item: `${BASE}/element-catalogue` },
      ]),
    ],
    bodyHtml: `<h1>The Catalogue — Periodic Table Octave Addresses</h1><p>Act 6 of the NexusOS physics sequence. Every element on the periodic table already has a precise address in the octave lattice — not assigned by any convention, but derived from its rest mass via n = log₂(m·c²/E₀) where E₀ = hf₀ = 2.295 eV.</p><h2>The Formula</h2><p>n = log₂(m·c² / E₀). In practice: n = log₂(mass_u × 931,494,000 / 2.295) where mass_u is the standard atomic weight in atomic mass units.</p><h2>Key Results</h2><ul><li>Hydrogen (H, Z=1, 1.008 u): n ≈ 28.61</li><li>Krypton (Kr, Z=36, 83.798 u): n ≈ 34.985 ≈ 35.000 — exact integer octave node</li><li>Gold (Au, Z=79, 196.967 u): n ≈ 36.55, ΔE ≈ 222 GeV</li><li>Oganesson (Og, Z=118, 294 u): n ≈ 36.80</li></ul><h2>Noble Gas Equilibrium Nodes</h2><p>Noble gases (He, Ne, Ar, Kr, Xe, Rn, Og) are octave rest points — maximum stability, zero reactivity. Krypton lands at n ≈ 35.000, validating Russell's 1926 geometric wave model from SI exact constants.</p><h2>The Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li></ul>`,
  },
  "/lossless-channel": {
    title: "The Lossless Channel — Ghost Node Waveguides · NexusOS",
    description: "Act 8: Ghost nodes form lossless waveguides. No matter → α=0 → Beer-Lambert loss L=0. Shannon capacity reaches the vacuum zero-point floor ½ℏω.",
    canonical: `${BASE}/lossless-channel`,
    ogTitle: "The Lossless Channel — Ghost Node Waveguides",
    ogDescription: "Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ). No matter → no α → L=0. Shannon capacity at the vacuum floor. A chain of ghost node traps creates a coherent propagation path with zero attenuation. NexusOS Act 8.",
    ogType: "article",
    twitterTitle: "The Lossless Channel — Ghost Nodes as Waveguides",
    twitterDescription: "Ghost nodes in the compression lattice are natural waveguides. α=0 because ρ_matter=0. Shannon capacity reaches the vacuum ZPE floor. NexusOS Act 8.",
    jsonLd: [
      techArticle({ url: `${BASE}/lossless-channel`, name: "The Lossless Channel — Ghost Node Waveguides in the Compression Lattice", description: "Ghost nodes form natural lossless waveguides. No stable nucleus → Beer-Lambert α=0, Shannon capacity reaches the vacuum ZPE floor. Distance-independent.", about: "lossless channel, ghost node waveguide, Beer-Lambert, attenuation α=0, Shannon capacity, vacuum zero-point energy, standing wave trap, WNSP density equation, N_Dir=2, photonic computing, NexusOS Act 8", datePublished: "2026-07-07", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 8 — The Lossless Channel", item: `${BASE}/lossless-channel` },
      ]),
    ],
    bodyHtml: `<h1>The Lossless Channel — Ghost Node Waveguides in the Compression Lattice</h1><p>Act 8 of the NexusOS physics sequence. First disclosed 2026-07-07.</p><h2>Abstract</h2><p>Ghost nodes — integer-octave addresses in the compression lattice occupied by no stable nucleus — form natural lossless waveguides. Because no matter exists at a ghost node address, the Beer-Lambert attenuation coefficient α = 0, giving L(d) = α·d = 0 regardless of distance. A chain of ghost node standing wave traps connected on the same Ψ channel creates a lossless coherent propagation path: Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ). Shannon capacity C = B·log₂(1 + S/N) reaches the vacuum zero-point floor N_vac = ½ℏω per mode — the theoretical maximum achievable only in the absence of matter coupling.</p><h2>Ghost Node Topology</h2><p>n=35 is a near-occupied node (Kr at −0.015, Rb at +0.012 octaves). n=36 is the primary confirmed ghost node: Thulium (Z=69, 4f¹³) falls 0.0034 octaves short, Ytterbium (Z=70, 4f¹⁴) overshoots by 0.07 octaves — a 10× wider vacancy determined by the Weizsäcker semi-empirical mass formula.</p><h2>Zero-Loss Physics</h2><p>α = n_scatter·σ_interaction. At ghost node: n_scatter = 0. Therefore α = 0·σ = 0. L(d) = α·d = 0·d = 0. I(d) = I₀·e^0 = I₀. Full signal retained over any distance.</p><h2>The Channel Equation</h2><p>Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ) = Ψ_trap(n₁) ⊗ Ψ_trap(n₂) ⊗ … ⊗ Ψ_trap(nₖ). Phase coherence maintained: no decoherence source exists in vacuum. Entropy S = 0 across the channel.</p><h2>Shannon at the Vacuum Floor</h2><p>Conventional channels: N = k_B·T·B (Johnson-Nyquist). Ghost node channel: N_vac = ½ℏω (Heisenberg vacuum zero-point energy). C_ghost = B·log₂(1 + hf₀/½ℏω) = B·log₂(1 + 2π/π) = B·log₂(1 + 2) ≈ B·1.585 b/s/Hz. No refrigeration needed — the ghost node is structurally at the vacuum floor.</p><h2>N_Dir=2 Architecture</h2><p>The WNSP density equation D_WNSP = N_λ·N_OAM·N_Pol·N_Dir = 256×50×2×2 = 51,200 channels. N_Dir=2 encodes ±k̂ as orthogonal Hilbert sub-spaces. The trap (Act 7) activates both simultaneously. The channel (Act 8) propagates the phase-locked result across ghost node chains. Same hardware, same addressing — Act 8 adds propagation to Act 7's confinement.</p><h2>The 8-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap: Ψ(+k̂) ⊗ Ψ(−k̂)</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel: Ψ_channel = ⊗ᵢ Ψ_trap(nᵢ)</a></li></ul>`,
  },
  "/standing-wave-trap": {
    title: "The Trap — Standing Wave at the Ghost Node · NexusOS",
    description: "Act 7: Counter-propagating waves (+k̂/−k̂) create a standing wave at ghost node n=36 — unoccupied at 169.33 u. No element fills it. Disclosed 2026-07-07.",
    canonical: `${BASE}/standing-wave-trap`,
    ogTitle: "The Trap — Standing Wave at the Ghost Node",
    ogDescription: "n=36 is a valid WNSP address at 169.33 u. No element occupies it — nuclear binding energies skip over it. The standing wave trap holds it open. NexusOS Act 7.",
    ogType: "article",
    twitterTitle: "The Trap — Ghost Node n=36",
    twitterDescription: "Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) → |E|² → max at 169.33 u. No element exists here. The standing wave claims an address nature never filled. NexusOS Act 7.",
    jsonLd: [
      techArticle({ url: `${BASE}/standing-wave-trap`, name: "The Trap — Standing Wave at the Ghost Node", description: "Standing wave at ghost node n=36 (169.33 u). Counter-propagating Ψ pairs (±k̂) create an antinode at an address no stable nucleus occupies. NexusOS Act 7.", about: "standing wave trap, ghost node, WNSP addressing, counter-propagating waves, N_Dir, binding energy mass defect, Thulium, octave lattice, NexusOS Act 7, photonic computing", datePublished: "2026-07-07", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 7 — The Trap", item: `${BASE}/standing-wave-trap` },
      ]),
    ],
    bodyHtml: `<h1>The Trap — Standing Wave at the Ghost Node</h1><p>Act 7 of the NexusOS physics sequence. The standing wave trap is a counter-propagating wave pair (+k̂/−k̂) on the same Ψ channel that creates a standing wave whose antinode is positioned at the ghost node n=36 — a valid WNSP address occupied by no stable nucleus in the known periodic table.</p><h2>The Ghost Node</h2><p>Ghost node n=36 sits at 169.33 u — a coordinate in the WNSP compression lattice that no stable nucleus occupies. The gap exists because nuclear binding energy mass defects (Δm = Z·mₚ + N·mₙ − M_nucleus, E_b = Δm·c²) never produce that atomic mass. Thulium (Z=69, 4f¹³) is 0.0034 octaves short at n=35.9966. Ytterbium (Z=70, 4f¹⁴) overshoots at n≈36.07. The ghost node is precisely at the threshold between the most incomplete and the first complete lanthanide shell.</p><h2>The Standing Wave Equation</h2><p>E₊ = E₀cos(kx−ωt) [+k̂ forward]. E₋ = E₀cos(kx+ωt) [−k̂ return]. E₊ + E₋ = 2E₀cos(kx)·cos(ωt) [standing wave]. |E|² → max at cos(kx) = ±1 — fixed antinodes. Trap equation: Ψ_trap = Ψ(+k̂) ⊗ Ψ(−k̂) → |E|² → max at (x₀,y₀,z₀).</p><h2>The WNSP Ghost Address</h2><p>Ghost node Ψ address: WDM = frac(36)×255 = 0 (SYSTEM band, channel 0), OAM = 36 mod 50 = 36, Pol = H, Dir = ±k̂. N_Dir=2 in the 51,200-channel density equation (256×50×2×2) already encodes both propagation directions as orthogonal Hilbert sub-spaces. The trap requires no new hardware.</p><h2>The Sequence — Complete</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap: Ψ(+k̂) ⊗ Ψ(−k̂)</a></li></ul>`,
  },
  "/universal-address": {
    title: "The Address — Ψ as Universal Namespace · NexusOS",
    description: "Act 5: Every compression state has a unique Ψ address derived from physics — no central authority, censorship-resistant. WNSP is the first implementation.",
    canonical: `${BASE}/universal-address`,
    ogTitle: "The Address — Ψ as Universal Namespace",
    ogDescription: "Every compression state has exactly one Ψ(wdm,oam,pol,dir) address — derived from physics, not assigned by any authority. You cannot block a frequency. Act 5 of the NexusOS sequence.",
    ogType: "article",
    twitterTitle: "The Address — Ψ as Universal Namespace",
    twitterDescription: "TCP/IP = human convention. DNS = human convention. Ψ = physics. block(Ψ) ⟺ violate Maxwell ⟺ impossible. NexusOS Act 5.",
    jsonLd: [
      techArticle({ url: `${BASE}/universal-address`, name: "The Address — Ψ as Universal Namespace", description: "Every state has a unique physics-derived Ψ address. WNSP is the first protocol to make this namespace operable. Blocking Ψ requires violating Maxwell's laws.", about: "WNSP namespace, Ψ address, universal addressing, censorship-resistant protocol, spectral addressing, NexusOS physics, compression states", datePublished: "2026-07-02", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 5 — The Address", item: `${BASE}/universal-address` },
      ]),
    ],
    bodyHtml: `<h1>The Address — Ψ as Universal Namespace</h1><p>Act 5 of the NexusOS physics sequence. Every compression state Λ = hf/c² is uniquely identified by its frequency f. Every frequency maps to a unique Ψ(wdm, oam, pol, dir) coordinate. Therefore every compression state in the universe already has exactly one address — derived from physics, not assigned by any authority.</p><h2>The Completeness Theorem</h2><p>∀ Λ ∈ Universe : ∃! Ψ(wdm, oam, pol, dir). The WNSP namespace is complete, unique, and authority-free. ∎</p><h2>Namespace Dimensions</h2><ul><li>WDM: 256 wavelength channels (380–780 nm, 1.5625 nm resolution)</li><li>OAM: 50 orbital angular momentum modes (orthogonal by quantum mechanics)</li><li>Pol: 2 polarisation states (H/V, ⟨H|V⟩ = 0)</li><li>Dir: 2 propagation directions (+k̂/−k̂, first disclosed 2026-07-02)</li><li>Total: 256 × 50 × 2 × 2 = 51,200 orthogonal Ψ channels</li></ul><h2>Censorship Impossibility</h2><p>block(Ψ) ⟺ suppress(f) ⟺ violate Maxwell ⟺ impossible. A Ψ address cannot be revoked. It is derived from the frequency of an electromagnetic wave — it exists whether or not any human system uses it.</p><h2>The Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li></ul>`,
  },
  "/matter-protocol": {
    title: "The Mechanism — Controlled Octave Inversion · NexusOS",
    description: "Act 4: Matter manipulation as a precise calculation. ΔE = hf₀(2ⁿ²−2ⁿ¹) is the transition energy. WNSP Ψ channel is the delivery mechanism. Disclosed 2026-07-06.",
    canonical: `${BASE}/matter-protocol`,
    ogTitle: "The Mechanism — Controlled Octave Inversion",
    ogDescription: "Matter is a standing wave at octave n. Manipulation = delivering ΔE = hf₀(2ⁿ²−2ⁿ¹) at the exact WNSP Ψ channel. Act 4 of the NexusOS physics sequence.",
    ogType: "article",
    twitterTitle: "The Mechanism — Controlled Octave Inversion",
    twitterDescription: "Electron at n≈17.8 above f₀. Proton at n≈28.6. ΔE = hf₀(2ⁿ²−2ⁿ¹). The protocol for controlled matter manipulation. NexusOS Act 4.",
    jsonLd: [
      techArticle({ url: `${BASE}/matter-protocol`, name: "The Mechanism — Controlled Octave Inversion", description: "Matter is a standing wave at octave n above f₀=555 THz. Controlled transition n₁→n₂ requires ΔE=hf₀(2ⁿ²−2ⁿ¹) delivered via a WNSP Ψ channel. Act 4.", about: "matter manipulation, octave inversion, Λ=hf/c², WNSP protocol, compression states, NexusOS physics", datePublished: "2026-07-06", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 4 — The Mechanism", item: `${BASE}/matter-protocol` },
      ]),
    ],
    bodyHtml: `<h1>The Mechanism — Controlled Octave Inversion</h1><p>Act 4 of the NexusOS physics sequence. Matter is a standing electromagnetic wave at a specific octave level n above f₀ = 555 THz. To manipulate matter means to induce a controlled transition from octave n₁ to octave n₂ by delivering exactly ΔE = hf₀(2ⁿ²−2ⁿ¹) joules at the transition frequency f_t = f₀(2ⁿ²−2ⁿ¹) Hz through an orthogonal WNSP Ψ channel.</p><h2>Particle Octave Positions (SI exact constants)</h2><ul><li>Electron (e⁻): rest mass 0.511 MeV → n ≈ 17.77 octaves above f₀</li><li>Muon (μ⁻): rest mass 105.66 MeV → n ≈ 25.46 octaves above f₀</li><li>Proton (p⁺): rest mass 938.272 MeV → n ≈ 28.60 octaves above f₀</li><li>Neutron (n⁰): rest mass 939.565 MeV → n ≈ 28.60 octaves above f₀</li></ul><h2>The Core Equation</h2><p>ΔE = hf₀ · (2ⁿ² − 2ⁿ¹) joules. Delivery frequency: f_t = f₀ · (2ⁿ² − 2ⁿ¹) Hz. WNSP channel: Ψ(wdm, oam, pol, dir) derived from f_t.</p><h2>The Five-Step Protocol</h2><ol><li>IDENTIFY target octave position n₁ via spectroscopy</li><li>CALCULATE ΔE and f_t for desired transition to n₂</li><li>TUNE WNSP emitter to Ψ(wdm, oam, pol, dir)</li><li>DELIVER ΔE in a single coherent pulse at f_t</li><li>VERIFY transition via post-event emission spectroscopy</li></ol><nav><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Curve</a></li></ul></nav>`,
  },
  "/universal-one": {
    title: "The Universal ONE — f₀ First Oscillation at 555 THz",
    description: "f₀=555 THz is the ground state of all existence. Every octave doubling produces a new physics domain — from gravitational infrared to strong-nuclear X-rays.",
    canonical: `${BASE}/universal-one`,
    ogTitle: "The Universal ONE — f₀ = 555 THz First Oscillation",
    ogDescription: "555 THz is the first unobserved oscillation — the ground state of all existence. Octave doublings from f₀ produce every domain of physics. The mathematical basis of NexusOS.",
    ogType: "article",
    twitterTitle: "The Universal ONE — f₀ First Oscillation",
    twitterDescription: "f₀ = 555 THz. The first unobserved oscillation. Every octave doubling produces a new domain of physics. The ground state of NexusOS.",
    jsonLd: [
      techArticle({ url: `${BASE}/universal-one`, name: "The Universal ONE — f₀ First Oscillation", description: "f₀=555 THz is the ground state of all existence. Successive octave doublings map to every domain of physics, from gravity to the strong nuclear force.", about: "555 THz, first oscillation, universal ground state, octave doubling, NexusOS physics, Λ=hf/c²", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 2 — The Universal ONE", item: `${BASE}/universal-one` },
      ]),
    ],
    bodyHtml: `<h1>The Universal ONE — f₀ First Oscillation at 555 THz</h1><p>The Universal ONE is the ground state from which all existence emerges. At <strong>f₀ = 555 THz</strong> (λ ≈ 540 nm, green light), the first unobserved oscillation transitioned from unformed to formed. Every subsequent domain of physics is an octave doubling of this single frequency.</p><p>Using SI exact constants: h = 6.626 × 10⁻³⁴ J·s, c = 299,792,458 m/s. The ground-state photon energy E₀ = hf₀ ≈ 2.30 eV. The compression mass Λ₀ = hf₀/c² ≈ 4.09 × 10⁻³⁶ kg.</p><h2>Octave Expansion from f₀</h2><ul><li>f₀/16 — f₀/2: Mid-infrared to NIR — Gravitational domain</li><li>f₀: Visible spectrum (540 nm) — WNSP Ψ channel address space</li><li>2f₀: UV — Electromagnetic → Weak nuclear transition</li><li>4f₀ — 8f₀: EUV to Soft X-ray — Weak nuclear domain</li><li>16f₀: X-ray — Strong nuclear domain</li><li>Electron mass equivalent: ≈17.8 octaves above f₀</li><li>Proton mass equivalent: ≈28.6 octaves above f₀</li></ul><nav><ul><li><a href="${BASE}/unified-compression-theory">Unified Compression Theory — All Four Forces</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States — First Principles</a></li><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Compression Curve</a></li></ul></nav>`,
  },
  "/wavelength-lang": {
    title: "WavelengthScript — Physics-Native Programming Language",
    description: "WavelengthScript: agents at spectral Ψ addresses, messages are photon packets, fees from E=hf. Compiles to WNSP bytecode. Step-debug in the browser WNSP VM.",
    canonical: `${BASE}/wavelength-lang`,
    ogTitle: "WavelengthScript — The Language the Universe Runs On",
    ogDescription: "Physics-native language: spectral addresses, photon packets, E=hf fees. Compiles to WNSP bytecode. Browser-native WNSP VM. CE→SE pipeline. AGPL-3.0.",
    twitterTitle: "WavelengthScript v1.0",
    twitterDescription: "The language the universe runs on. Agents at spectral addresses. Photon packets. E=hf computation costs. WNSP bytecode.",
    jsonLd: softwareApp({ url: `${BASE}/wavelength-lang`, name: "WavelengthScript", description: "Physics-native programming language. Agents at spectral Ψ addresses. Messages are photon packets. Fees derived from E=hf. Compiles to WNSP bytecode." }),
    bodyHtml: `<h1>WavelengthScript — The Language the Universe Runs On</h1><p>WavelengthScript is a physics-native programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. It compiles to WNSP bytecode and runs in the browser-native WNSP VM. No installation required.</p><ul><li>Spectral Ψ addressing — agents positioned at wavelength coordinates</li><li>Photon packet messaging — every send has a physics-derived energy cost</li><li>E=hf computation fees — shorter wavelength = higher authority = higher cost</li><li>Compiles to WNSP bytecode</li><li>Step-debug in the browser WNSP VM</li><li>AGPL-3.0 licensed</li></ul><p>WavelengthScript is written in the language of photonic hardware. When photonic ASICs arrive (~2032), no rewrite is needed — the architecture already speaks in wavelengths.</p><nav><ul><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine (run bytecode)</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (compile &amp; run)</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li></ul></nav>`,
  },
  "/wnsp-vm": {
    title: "WNSP Virtual Machine — Browser-Native Bytecode Interpreter",
    description: "Browser-native bytecode interpreter for WavelengthScript. Execute instructions step-by-step with Ψ channel registers. No installation required.",
    canonical: `${BASE}/wnsp-vm`,
    ogTitle: "WNSP VM — Browser-Native Bytecode Interpreter",
    ogDescription: "Step-through WavelengthScript bytecode in your browser. Ψ channel registers. Physics-enforced execution. Run CE→SE pipeline output directly.",
    twitterTitle: "WNSP Virtual Machine",
    twitterDescription: "Browser-native WNSP bytecode interpreter. Ψ registers. Step-debug WavelengthScript programs. No install.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-vm`, name: "WNSP Virtual Machine", description: "Browser-native bytecode interpreter for WavelengthScript. Each Ψ channel acts as a spectral register. Step-by-step execution with full register inspection." }),
    bodyHtml: `<h1>WNSP Virtual Machine — Browser-Native Bytecode Interpreter</h1><p>The WNSP VM is a browser-native bytecode interpreter for WavelengthScript programs. Execute instructions step-by-step with each Ψ channel acting as a spectral register. No installation required — runs entirely in your browser.</p><ul><li>Step-by-step bytecode execution with full register inspection</li><li>Each Ψ channel is a spectral register (${PSI_CHANNEL_FORMULA})</li><li>Physics-enforced execution — fees computed from E=hf</li><li>Accepts bytecode output directly from the CE→SE pipeline</li><li>Run, pause, and step through WavelengthScript programs</li></ul><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline — compile to bytecode</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Specification</a></li></ul></nav>`,
  },
  "/ce-se-pipeline": {
    title: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    description: "Unified 4-stage pipeline: paste any language → transpile to WavelengthScript → compile to WNSP bytecode → execute in the WNSP VM.",
    canonical: `${BASE}/ce-se-pipeline`,
    ogTitle: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    ogDescription: "4-stage pipeline: any language → WavelengthScript transpile → WNSP bytecode compile → WNSP VM execution. Physics-native computing, live in your browser.",
    twitterTitle: "CE→SE Pipeline — 4-Stage Spectral Compiler",
    twitterDescription: "Paste any language → WavelengthScript → WNSP bytecode → execute in WNSP VM. The NexusOS physics stack, live.",
    jsonLd: softwareApp({ url: `${BASE}/ce-se-pipeline`, name: "CE→SE Pipeline", description: "Unified 4-stage pipeline: any source language → WavelengthScript transpile → WNSP bytecode compile → WNSP VM execution." }),
    bodyHtml: `<h1>CE→SE Pipeline — Any Language to Spectral Bytecode</h1><p>The unified 4-stage CE→SE pipeline is the central demonstration of the NexusOS physics stack. Paste any source language, and the pipeline carries it through transpilation, compilation, and execution — all physics-native, all in your browser.</p><ol><li><strong>Stage 1 — Input</strong>: paste any language (JavaScript, Python, pseudocode, WavelengthScript)</li><li><strong>Stage 2 — Transpile</strong>: source code converted to WavelengthScript by the AI transpiler</li><li><strong>Stage 3 — Compile</strong>: WavelengthScript compiled to WNSP bytecode by the WavelengthScript Compiler α</li><li><strong>Stage 4 — Execute</strong>: bytecode runs in the WNSP VM with Ψ channel registers and physics-enforced fees</li></ol><nav><ul><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Spec</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li></ul></nav>`,
  },
  "/learn": {
    title: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    description: "The unified 4-stage CE→SE pipeline: paste any language → transpile to WavelengthScript → compile to WNSP bytecode → execute in the WNSP VM.",
    canonical: `${BASE}/ce-se-pipeline`,
    jsonLd: softwareApp({ url: `${BASE}/ce-se-pipeline`, name: "CE→SE Pipeline", description: "Unified 4-stage pipeline: any source language → WavelengthScript transpile → WNSP bytecode compile → WNSP VM execution." }),
    bodyHtml: `<h1>CE→SE Pipeline — Any Language to Spectral Bytecode</h1><p>The unified 4-stage CE→SE pipeline is the central demonstration of the NexusOS physics stack. Paste any source language, and the pipeline carries it through transpilation, compilation, and execution — all physics-native, all in your browser.</p><ol><li><strong>Stage 1 — Input</strong>: paste any language</li><li><strong>Stage 2 — Transpile</strong>: source code converted to WavelengthScript</li><li><strong>Stage 3 — Compile</strong>: WavelengthScript compiled to WNSP bytecode</li><li><strong>Stage 4 — Execute</strong>: bytecode runs in the WNSP VM with Ψ channel registers</li></ol><nav><ul><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Spec</a></li></ul></nav>`,
  },
  "/hardware-spec": {
    title: "NexusOS Hardware Spec — SNIC, PHR-1 & Relay Mesh (AGPL-3.0)",
    description: "Formal specification of SNIC, PHR-1 bifilar resonator, Spectral Relay Mesh v1, and WavelengthScript Compiler α. Silicon nitride (SiN) LPCVD substrate — 500–2500 nm transparency window, 51,200 channels. First public disclosure 2026-05-16. AGPL-3.0.",
    canonical: `${BASE}/hardware-spec`,
    ogTitle: "NexusOS Hardware Specification — AGPL-3.0",
    ogDescription: "SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0. Open forever — improvements must be contributed back.",
    ogType: "product",
    twitterTitle: "NexusOS Hardware Specification",
    twitterDescription: "SNIC photonic NIC, PHR-1 resonator, Spectral Relay Mesh. First disclosed 2026-05-16. AGPL-3.0.",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "NexusOS Hardware Specification",
        "url": `${BASE}/hardware-spec`,
        "description": "Formal specification for SNIC, PHR-1, Spectral Relay Mesh v1, and WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0.",
        "publisher": { "@type": "Organization", "name": "NexusOS", "url": BASE },
        "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
        "datePublished": "2026-05-16",
      },
      hardwareProduct({ name: "SNIC — Spectral Network Interface Card", url: `${BASE}/snic`, description: `${PSI_CHANNELS} Ψ channels (${PSI_CHANNEL_FORMULA}). CE lookups execute as physical wavelength selections in photonic waveguides. AGPL-3.0.`, image: SNIC_IMAGE }),
      hardwareProduct({ name: "PHR-1 — Physical Resonator", url: `${BASE}/hardware-spec`, description: "144-turn bifilar coil, Syncbox Controller firmware, WavelengthScript v1.0 API. First implementation of the ZERO-G state. First batch: 25 units. AGPL-3.0.", image: PHR1_IMAGE }),
    ],
    bodyHtml: `<h1>NexusOS Hardware Specification — AGPL-3.0</h1><p>The formal, AGPL-3.0-protected specification for the NexusOS hardware layer. First public disclosure: 2026-05-16. Open forever — any improvements must be contributed back to the community.</p><h2>Specifications Covered</h2><ul><li><strong>SNIC — Spectral Network Interface Card</strong>: ${PSI_CHANNELS} orthogonal channels (${PSI_CHANNEL_FORMULA}). CE lookups execute as physical wavelength selections in photonic waveguides. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>PHR-1 — Physical Resonator</strong>: 144-turn bifilar coil, Syncbox Controller firmware, WavelengthScript v1.0 API. First implementation of the ZERO-G state. First batch: 25 units.</li><li><strong>Spectral Relay Mesh v1</strong>: multi-hop WNSP packet routing across physical nodes using Ψ channel addressing.</li><li><strong>WavelengthScript Compiler α</strong>: source-to-bytecode compiler specification.</li><li><strong>Silicon Nitride (SiN) Substrate</strong>: LPCVD fabrication basis. Transparency window ~500–2500 nm covers the full NexusOS CE visible band (380–780 nm). ~10× lower propagation loss than silicon (~0.1 dB/cm), ~100× better power handling. Kerr nonlinearity supports OAM mode generation (null-core r_null = lλ/2π) and Ghost Node ZPE channels (α = 0 at integer octave resonance). Hybrid SiN + thin-film LiNbO₃ path for coherent frequency combs (~2030). Independently validated 2026-07-17. Note: correct channel count is 51,200 (256×50×2×2), not 51,600.</li></ul><p>License: AGPL-3.0. First public disclosure: 2026-05-16. All hardware improvements must be open-sourced.</p><nav><ul><li><a href="${BASE}/crowdfund">Hardware Founder Slots (25 available)</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — Resonance Cavity &amp; OAM Physics</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "/hardware-lab": {
    title: "NexusOS Hardware Lab — Physics Calibration & Live Spectrometer",
    description: "Interactive physics calibration verifier and live spectrometer for NexusOS hardware. Test CE encoding, verify wavelengths, calibrate SNIC channel mappings.",
    canonical: `${BASE}/hardware-lab`,
    ogTitle: "NexusOS Hardware Lab — Live Spectrometer",
    ogDescription: "Physics calibration verifier and live spectrometer. Test CE encoding accuracy, verify wavelength→Ψ channel mappings, and validate SNIC hardware integration.",
    twitterTitle: "NexusOS Hardware Lab",
    twitterDescription: "Live physics calibration. CE encoding verifier. SNIC channel mapping tester. Spectrometer interface.",
    jsonLd: softwareApp({ url: `${BASE}/hardware-lab`, name: "NexusOS Hardware Lab", description: "Interactive physics calibration verifier and live spectrometer for SNIC and PHR-1 hardware. Tests CE encoding accuracy and wavelength-to-Ψ channel mappings." }),
    bodyHtml: `<h1>NexusOS Hardware Lab — Physics Calibration &amp; Live Spectrometer</h1><p>The Hardware Lab provides an interactive physics calibration verifier and live spectrometer for NexusOS hardware integration. Test CE encoding accuracy, verify wavelength-to-Ψ channel mappings, and validate SNIC hardware integration — all in the browser.</p><ul><li>CE encoding verifier — confirm CE_TABLE[charCode % 128] output against reference values</li><li>Wavelength→Ψ channel mapping checker (${PSI_CHANNEL_FORMULA})</li><li>Live spectrometer interface for connected hardware</li><li>Physics calibration suite for PHR-1 and SNIC integration</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li></ul></nav>`,
  },
  "/compression-explorer": {
    title: "Compression Explorer — Interactive Λ=hf/c² Curve Visualisation",
    description: "Interactive Λ=hf/c² compression curve with authority band overlays, photon energy, compression mass, fee multiplier, normalized Λ, and Boltzmann entropy.",
    canonical: `${BASE}/compression-explorer`,
    ogTitle: "Compression Explorer — Λ=hf/c² Visualisation",
    ogDescription: "Interactive compression curve: authority bands, photon energy, Boltzmann entropy, fee multipliers. The physics of NexusOS, rendered across 380–780nm.",
    twitterTitle: "Compression Explorer — Λ=hf/c² Live",
    twitterDescription: "Interactive Λ=hf/c² compression curve. Authority bands, photon energies, fee multipliers. NexusOS physics, live.",
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/compression-explorer`, name: "Compression Explorer — Λ=hf/c² Curve", description: "Interactive Λ=hf/c² compression curve. Authority band overlays, photon energy, Boltzmann entropy, and fee multipliers across the visible spectrum.", about: "Theory of Compression States, Λ=hf/c², photonic physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Compression Explorer — Interactive Λ=hf/c² Curve</h1><p>An interactive SVG visualisation of the Λ=hf/c² compression curve across the full visible spectrum (380–780nm). Explore how authority, energy, fees, and entropy vary with wavelength — the physics foundation of every NexusOS address and transaction.</p><ul><li><strong>Authority bands</strong>: SYSTEM (shortest λ, highest energy) → KERNEL → USER → GUEST</li><li><strong>Photon energy</strong>: E=hf — computed live for each wavelength position</li><li><strong>Compression mass</strong>: Λ=hf/c² — the compression state at each frequency</li><li><strong>Fee multiplier</strong>: derived from compression state, enforced by the physics engine</li><li><strong>Normalized Λ</strong>: relative compression across the visible spectrum</li><li><strong>Boltzmann entropy</strong>: statistical entropy at each spectral position</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/ce-code-writer": {
    title: "CE Code Writer — Human First Contact Spectral Encoder",
    description: "Live CE encoder with character chip visualisation, Code Builder, Integration Kit (Node.js/Python/Browser JS), and Spectral Linter. Map text to wavelengths.",
    canonical: `${BASE}/ce-code-writer`,
    ogTitle: "CE Code Writer — Spectral Encoder & Integration Kit",
    ogDescription: "Live CE encoding with character wavelength chips. Code Builder for app scaffolds. Integration snippets for Node.js, Python, and Browser JS. Spectral Linter coherence scoring.",
    twitterTitle: "CE Code Writer — Spectral Encoder",
    twitterDescription: "Map text to light frequencies. Live character chips, app scaffolds, integration kit, spectral linter.",
    jsonLd: softwareApp({ url: `${BASE}/ce-code-writer`, name: "CE Code Writer", description: "Live CE/SE encoding tool with character visualisation, code builder, and integration snippets for Node.js, Python, and browser JavaScript." }),
    bodyHtml: `<h1>CE Code Writer — Human First Contact Spectral Encoder</h1><p>The CE Code Writer is the Human First Contact interface for CE-SE encoding. Map any text to its electromagnetic spectral fingerprint — each character resolved to a visible-light wavelength using CE_TABLE[charCode % 128].</p><h2>Four Tabs</h2><ul><li><strong>Live Encode</strong>: paste any text and see each character rendered as a wavelength chip (380–780nm). Save encoded strings to the Spectral DB.</li><li><strong>Code Builder</strong>: generate single-component or full application scaffold code using CE encoding.</li><li><strong>Integration Kit</strong>: self-contained code snippets for Node.js, Python, and Browser JS. Includes sync verification and install commands.</li><li><strong>Spectral Linter</strong>: coherence scoring for CE-encoded data — check the spectral quality of your encoding.</li></ul><p>Algorithm: <code>CE_TABLE[charCode % 128]</code> — 128 bands, 380–780nm, 3.125nm per band. Install: <code>npm install nexusos-ce-encoder</code></p><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li></ul></nav>`,
  },
  "/ecosystem": {
    title: "NexusOS Ecosystem — Protocol, Hardware, and Token Network",
    description: "NexusOS ecosystem: WNSP protocol domains, hardware projects (SNIC, PHR-1), encoding standards (WASCII), and the NXT circular economy via the Orbital Treasury.",
    canonical: `${BASE}/ecosystem`,
    ogTitle: "NexusOS Ecosystem Overview",
    ogDescription: "10 ecosystem domains. WNSP protocol. SNIC photonic NIC. PHR-1 resonator. WASCII encoding. WavelengthScript. Orbital Treasury. NXT token. All connected by Λ=hf/c².",
    twitterTitle: "NexusOS Ecosystem",
    twitterDescription: "Protocol, hardware, encoding, and token — all unified by Λ=hf/c². 10 ecosystem domains.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "NexusOS Ecosystem",
      "url": `${BASE}/ecosystem`,
      "description": "The NexusOS ecosystem: WNSP protocol, SNIC photonic NIC, PHR-1 resonator, WASCII encoding, WavelengthScript, Orbital Treasury, and the NXT token. All unified by Λ=hf/c².",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>NexusOS Ecosystem — Protocol, Hardware, and Token Network</h1><p>The NexusOS ecosystem is a network of interconnected domains, hardware projects, encoding standards, and token infrastructure — all unified by the single equation Λ=hf/c².</p><h2>Protocol Layer</h2><ul><li><strong><a href="https://wnsp.dev">wnsp.dev</a></strong> — Developer portal for building physics-native applications on the WNSP protocol</li><li><strong><a href="https://wnsp.blog">wnsp.blog</a></strong> — Build log and protocol milestone updates</li><li><strong><a href="https://wascii.io">wascii.io</a></strong> — WASCII v2.0 encoding standard: every character has a wavelength</li><li><strong><a href="https://wavelengthscript.dev">wavelengthscript.dev</a></strong> — WavelengthScript language portal</li></ul><h2>Hardware Layer</h2><ul><li><strong><a href="https://snic.io">snic.io</a></strong> — SNIC photonic NIC: ${PSI_CHANNELS} orthogonal physical channels (~2032)</li><li><strong><a href="https://phr1.io">phr1.io</a></strong> — PHR-1 resonator: first ZERO-G state device (144-turn bifilar coil)</li><li><strong><a href="https://lambdagate.io">lambdagate.io</a></strong> — Lambda Gate substrate: Λ=hf/c² as physical computing layer</li><li><strong><a href="https://zerogstate.io">zerogstate.io</a></strong> — ZERO-G state physics and gravitational de-correlation research</li></ul><h2>Token &amp; Economic Layer</h2><ul><li><strong><a href="https://orbitaltreasury.io">orbitaltreasury.io</a></strong> — NXT circular economy: all fees governed on-chain, never burned</li><li><strong>NEXUS•WAVELENGTH (NXT)</strong> — 21 billion supply on Bitcoin Runes, etched at block 952596:379</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/nxt-campaign">NXT Token Campaign</a></li><li><a href="${BASE}/crowdfund">Hardware Crowdfund</a></li></ul></nav>`,
  },
  "/network": {
    title: "NexusOS Spectral Network — Node Distribution by Authority Band",
    description: "Visualise node distribution across SYSTEM, KERNEL, USER, and GUEST authority bands. See spectral proximity, Ψ channel assignments, and live network topology.",
    canonical: `${BASE}/network`,
    ogTitle: "NexusOS Spectral Network",
    ogDescription: "Node distribution by authority band. SYSTEM, KERNEL, USER, GUEST bands. Spectral proximity visualisation. Real-time Ψ channel topology.",
    twitterTitle: "NexusOS Spectral Network",
    twitterDescription: "Spectral node map. Authority bands. Ψ channel topology. Real-time.",
    jsonLd: softwareApp({ url: `${BASE}/network`, name: "NexusOS Spectral Network", description: "Real-time visualisation of NexusOS node distribution across SYSTEM, KERNEL, USER, and GUEST authority bands. Shows Ψ channel assignments and spectral proximity." }),
    bodyHtml: `<h1>NexusOS Spectral Network — Node Distribution by Authority Band</h1><p>Visualise the live NexusOS node network organised by spectral authority band. Every node occupies a deterministic Ψ channel derived from its wavelength position. Spectral proximity determines routing efficiency — closer wavelengths route with lower energy cost.</p><ul><li><strong>SYSTEM band</strong>: shortest wavelength, highest energy, maximum authority</li><li><strong>KERNEL band</strong>: governance-capable nodes, can submit and vote on protocol proposals</li><li><strong>USER band</strong>: standard participant nodes</li><li><strong>GUEST band</strong>: longest wavelength, lowest energy, read-access nodes</li></ul><p>Each node's Ψ channel is derived from its spectral address using the WNSP Hilbert Space Channel Model: ${PSI_CHANNEL_FORMULA} = ${PSI_CHANNELS} orthogonal channels.</p><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li></ul></nav>`,
  },
  "/roadmap": {
    title: "NexusOS Roadmap — From Digital Substrate to Photonic Gate Array",
    description: `NexusOS roadmap: digital substrate (${PSI_CHANNELS} Ψ channels live), PHR-1 hardware (2026–2028), and photonic gate array (~2032). Step-by-step to Kardashev Type I.`,
    canonical: `${BASE}/roadmap`,
    ogTitle: "NexusOS Roadmap",
    ogDescription: "Now: digital substrate live. 2026–2028: PHR-1 physical hardware. ~2032: photonic gate array. The path from WNSP protocol to Type I civilization OS.",
    ogType: "article",
    twitterTitle: "NexusOS Roadmap",
    twitterDescription: "Digital substrate → PHR-1 hardware → photonic gate array. The NexusOS path to a Kardashev Type I civilization.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "NexusOS Roadmap",
      "url": `${BASE}/roadmap`,
      "description": "NexusOS development roadmap: digital substrate (now) → PHR-1 hardware layer (2026–2028) → photonic gate array (~2032). The path from WNSP protocol to a Kardashev Type I civilization OS.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>NexusOS Roadmap — From Digital Substrate to Photonic Gate Array</h1><p>NexusOS development progresses in three distinct phases, each building on the last. The destination is a Kardashev Type I civilization operating system — hardware that runs on physics, not cryptography.</p><h2>Phase 1 — Digital Substrate (Now)</h2><ul><li>WNSP protocol live: ${PSI_CHANNELS} orthogonal Ψ channels on software substrate</li><li>WavelengthScript compiler α: physics-native programming language</li><li>CE→SE pipeline: any language to spectral bytecode</li><li>NXT token: NEXUS•WAVELENGTH on Bitcoin Runes (block 952596:379)</li><li>WNSP VM: browser-native bytecode interpreter</li></ul><h2>Phase 2 — PHR-1 Hardware Layer (2026–2028)</h2><ul><li>PHR-1 bifilar resonator: 144-turn coil, measurable standing EM waves</li><li>SNIC optical demonstrator: wavelength-selective channel separation ±2nm</li><li>25 Hardware Founder units: first physical implementation of compression state theory</li></ul><h2>Phase 3 — Photonic Gate Array (~2032)</h2><ul><li>SNIC photonic NIC production: ${PSI_CHANNELS} physical waveguide channels</li><li>CE lookups execute as physical wavelength selections in glass</li><li>⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics — no software policy required</li><li>No code rewrite: NexusOS already speaks in wavelengths</li></ul><nav><ul><li><a href="${BASE}/crowdfund">Hardware Founder Slots (Phase 2)</a></li><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "/proof": {
    title: "NexusOS Physics Proof — Verified Compression State Calculations",
    description: "Verified proofs: Λ=hf/c² derivation, CE encoding determinism, WNSP channel orthogonality, and Maxwell equation validation for the compression state model.",
    canonical: `${BASE}/proof`,
    ogTitle: "NexusOS Physics Proof",
    ogDescription: "Λ=hf/c² derivation. CE encoding determinism. ⟨Ψᵢ|Ψⱼ⟩=0 orthogonality. Maxwell equation validation. The physics of NexusOS, verified.",
    ogType: "article",
    twitterTitle: "NexusOS Physics Proof",
    twitterDescription: `Λ=hf/c² verified. CE encoding deterministic. ${PSI_CHANNELS} channels orthogonal by quantum mechanics.`,
    jsonLd: [
      techArticle({ url: `${BASE}/proof`, name: "NexusOS Physics Proof", description: "Formal verification of NexusOS compression state calculations: Λ=hf/c² derivation, CE encoding determinism, and WNSP channel orthogonality.", about: "Theory of Compression States, Maxwell equations, quantum mechanics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Theory", item: `${BASE}/oscillating-quanta` },
        { name: "Physics Proof", item: `${BASE}/proof` },
      ]),
    ],
    bodyHtml: `<h1>NexusOS Physics Proof — Verified Compression State Calculations</h1><p>The NexusOS physics stack rests on four verified proofs that connect electromagnetic theory directly to the WNSP protocol and CE encoding system.</p><h2>Proof 1 — Λ=hf/c² Derivation</h2><p>Starting from Einstein's mass-energy equivalence E=mc² and Planck's relation E=hf, the compression state operator Λ=hf/c² is derived by substituting photon energy: Λ = E/c² = hf/c². This gives the compression mass of any photon as a function of frequency alone.</p><h2>Proof 2 — CE Encoding Determinism</h2><p>The CE_TABLE maps charCode % 128 to a wavelength band. For any character with code c, the output wavelength is: nm = 380 + (c % 128) × 3.125. This is a pure function — identical output for any platform, runtime, or implementation. Proved by exhaustive verification across the 128-band space.</p><h2>Proof 3 — WNSP Channel Orthogonality</h2><p>For any two distinct Ψ channels (WDM_i, OAM_i, Pol_i) and (WDM_j, OAM_j, Pol_j), the inner product ⟨Ψᵢ|Ψⱼ⟩ = 0. This follows from quantum mechanics: WDM modes are orthogonal by wavelength separation, OAM modes are orthogonal by angular momentum quantum number, and polarisation modes are orthogonal by definition. ${PSI_CHANNELS} channels are mutually orthogonal.</p><h2>Proof 4 — Maxwell Equation Validation</h2><p>Every WNSP transaction is validated against Maxwell's equations in their wave form. The propagation condition ∇²E = μ₀ε₀ ∂²E/∂t² must be satisfied for any transmitted spectral frame.</p><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li></ul></nav>`,
  },
  "/octave-layers": {
    title: "Russell Octave Layers — Nine Wave Octaves & WNSP Channels",
    description: "Walter Russell's nine-octave wave system mapped to NexusOS authority bands and WNSP channels. WGM resonance validates Russell's formula. Interactive explorer.",
    canonical: `${BASE}/octave-layers`,
    ogTitle: "Russell Octave Layers — Validated by 2025 Sub-THz Research",
    ogDescription: "The WGM resonance condition 2πR=nλ is Russell's octave formula. His 9th octave peak = nuclear magic number 114 = NexusOS SYSTEM band. Confirmed experimentally 2025.",
    ogType: "article",
    twitterTitle: "Russell Octave Layers — NexusOS",
    twitterDescription: "Nine wave octaves, periodic table, authority bands, Flerovium at magic number 114. Walter Russell was right. 2025 sub-THz experiments proved it.",
    jsonLd: techArticle({ url: `${BASE}/octave-layers`, name: "Russell Octave Layers", description: "Walter Russell's nine octave wave system mapped to NexusOS Ψ channels and authority bands. WGM resonance validates the octave formula experimentally.", about: "Walter Russell, whispering gallery modes, octave waves, periodic table, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Russell Octave Layers — Nine Wave Octaves Mapped to WNSP Channels</h1><p>Walter Russell's nine-octave wave system — derived from his observation that all matter exists as periodic wave motion — maps directly onto the NexusOS WNSP channel structure and authority band hierarchy.</p><h2>The Key Correspondence</h2><ul><li><strong>WGM resonance condition</strong>: 2πR = nλ is mathematically identical to Russell's octave formula. Whispering gallery mode resonance in optical cavities validates the octave structure experimentally.</li><li><strong>Russell's 9th octave peak = nuclear magic number 114</strong>: Flerovium (Fl-114) occupies the SYSTEM-band frequency position in the NexusOS compression state model. Confirmed by 2025 sub-THz spectroscopy.</li><li><strong>WNSP authority bands trace to Russell octaves</strong>: SYSTEM, KERNEL, USER, GUEST band boundaries align with octave wave transitions in the visible spectrum (380–780nm).</li></ul><h2>Experimental Validation (2025)</h2><p>Sub-mm wave geometry research published in 2025 independently validates the Ψ channel spacing predicted by the WNSP Hilbert space channel model. The WGM resonance condition maps directly to the 256 WDM × 50 OAM channel geometry.</p><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li></ul></nav>`,
  },
  "/paper": {
    title: "Theory of Compression States — Preprint | NexusOS",
    description: `Preprint: unified physics of information, field, and matter from the primordial oscillation. Λ=hf/c² compression operator, ${PSI_CHANNELS} Hilbert channels. AGPL-3.0.`,
    canonical: `${BASE}/paper`,
    ogTitle: "Theory of Compression States — NexusOS Preprint",
    ogDescription: `Λ=hf/c² unifies Maxwell, Planck, Einstein, Shannon, and Russell into one compression state framework. ${PSI_CHANNELS} orthogonal channels. arXiv submission pending.`,
    ogType: "article",
    twitterTitle: "Theory of Compression States — Preprint",
    twitterDescription: `Unified physics: information, field, and matter as compression states of a primordial oscillation. Λ=hf/c². ${PSI_CHANNELS} Hilbert space channels. AGPL-3.0.`,
    jsonLd: [
      techArticle({ url: `${BASE}/paper`, name: "Theory of Compression States", description: "Preprint: compression state operator Λ=hf/c² from the primordial oscillation, unifying Maxwell, Planck, Einstein, Shannon, and Russell.", about: "Theory of Compression States, primordial field, Hilbert space, WNSP protocol, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Theory", item: `${BASE}/oscillating-quanta` },
        { name: "Theory Preprint", item: `${BASE}/paper` },
      ]),
    ],
    bodyHtml: `<h1>Theory of Compression States — Preprint</h1><p>This preprint presents a unified physics of information, field, and matter derived from a single premise: the universe began with a primordial oscillation at 555 THz. The compression state operator Λ=hf/c² is derived from first principles and shown to unify the foundational equations of Maxwell, Planck, Einstein, Shannon, and Russell.</p><h2>Abstract</h2><p>We introduce the compression state framework, in which every physical phenomenon — mass, information, gravity, electromagnetic radiation — is a compression state of the primordial field. The operator Λ = hf/c² maps frequency to compression mass. The visible spectrum (380–780nm) subdivided into ${PSI_CHANNELS} orthogonal Ψ channels (${PSI_CHANNEL_FORMULA}) constitutes the complete Hilbert space address system for a Kardashev Type I civilization operating system.</p><h2>Key Results</h2><ol><li>Derivation of Λ=hf/c² from Maxwell's equations and Planck's relation</li><li>Proof that the ${PSI_CHANNELS}-channel Ψ space is maximally orthogonal by quantum mechanics</li><li>Correspondence between Russell's nine octave structure and the NexusOS authority band hierarchy</li><li>Shannon entropy bounds for spectral channel capacity</li><li>The WNSP protocol as a physical implementation of the compression state framework</li></ol><p>License: AGPL-3.0. arXiv submission pending.</p><nav><ul><li><a href="${BASE}/oscillating-quanta">First Principles — Theory of Compression States</a></li><li><a href="${BASE}/proof">Formal Physics Proofs</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li></ul></nav>`,
  },
  "/hardware-results": {
    title: "Hardware Verification Results — PHR-1 + SNIC | NexusOS",
    description: "Live hardware verification results for the NexusOS PoC. PHR-1 bifilar coil and SNIC optical demonstrator. Data published within 24h of each successful run.",
    canonical: `${BASE}/hardware-results`,
    ogTitle: "NexusOS Hardware Verification — PHR-1 + SNIC Results",
    ogDescription: "Live measurement results: PHR-1 standing wave field vs CE_TABLE predictions. SNIC bandpass filter wavelengths vs predicted values. In progress, Australia 2026.",
    ogType: "article",
    twitterTitle: "NexusOS Hardware Results — PHR-1 + SNIC",
    twitterDescription: "Real-time physics hardware verification. PHR-1 bifilar coil + SNIC optical demonstrator. Results published within 24 hours. Australia, 2026.",
    jsonLd: techArticle({ url: `${BASE}/hardware-results`, name: "NexusOS Hardware Verification Results", description: "Live measurement results from PHR-1 bifilar coil and SNIC optical demonstrator verifying the Theory of Compression States against physical measurements.", about: "hardware verification, bifilar coil, spectrometer, wavelength measurement, PHR-1, SNIC", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Hardware Verification Results — PHR-1 + SNIC</h1><p>Live measurement data from NexusOS hardware proof-of-concept builds in Australia (2026). Results are published within 24 hours of each successful test run. All measurements verify predictions from the Theory of Compression States and CE_TABLE encoding.</p><h2>PHR-1 Bifilar Resonator Results</h2><p>The PHR-1 is a 144-turn bifilar coil wound to specific geometry derived from Λ=hf/c² equations. Measurements target: standing electromagnetic wave patterns consistent with CE_TABLE band predictions. Pass criterion: field geometry within ±5% of predicted values at visible-light-equivalent resonant frequencies.</p><h2>SNIC Optical Demonstrator Results</h2><p>The SNIC optical bench demonstrator uses bandpass filters selected to match CE_TABLE wavelength bands. Measurements target: wavelength-selective channel separation within ±2.000 nm of CE_TABLE predictions for each of the 128 spectral bands. Pass criterion: all tested channels within tolerance simultaneously.</p><h2>Measurement Protocol</h2><ul><li>Every test step has a defined tool list, measurement procedure, and pass criterion</li><li>Each run is video recorded end-to-end (no editing)</li><li>Data published in raw form within 24 hours — no post-processing before publication</li><li>Failed runs published alongside successful ones</li></ul><nav><ul><li><a href="${BASE}/poc">Full Hardware PoC Scope &amp; Shopping List</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/evidence">All Experimental Evidence</a></li></ul></nav>`,
  },
  "/founders": {
    title: "The Founders — Te Rata Pou & The AI | NexusOS",
    description: "NexusOS was built by Te Rata Pou and an AI — turning centuries of physics into executable code. Lineage: Maxwell, Planck, Einstein, Tesla, Russell, Shannon.",
    canonical: `${BASE}/founders`,
    ogTitle: "The Founders — NexusOS",
    ogDescription: "Two founders. Seven physicists. One civilization OS. Te Rata Pou and an AI built the bridge between Maxwell's field equations and photonic computing.",
    ogType: "article",
    twitterTitle: "The Founders — NexusOS",
    twitterDescription: "Te Rata Pou and an AI are the founders. Maxwell → Planck → Einstein → Tesla → Russell → QM → Shannon is the physics they were given.",
    jsonLd: techArticle({ url: `${BASE}/founders`, name: "The Founders — NexusOS", description: "NexusOS founders: Te Rata Pou (Māori technologist, NZ) and an AI co-founder — turning Maxwell, Planck, Einstein, Tesla, and Shannon into a running OS.", about: "Te Rata Pou, NexusOS founders, AI co-founder, Maxwell equations, Planck constant, Einstein relativity, Tesla coil, Shannon entropy, Kardashev Type I", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>The Founders</h1><p>NexusOS was built by two — a human and an AI. Seven physicists who lived across two centuries left the equations. The founders turned those equations into a running system. No lab, no institution, no VC round. A person and a machine, starting from first principles.</p><h2>Te Rata Pou — Human Founder</h2><p>Te Rata Pou — "the healing post; the doctor" — is the human founder of NexusOS. He conceived the Theory of Compression States: the recognition that Maxwell, Planck, Einstein, Tesla, Russell, and Shannon were each describing a different angle of the same physical structure, and that unifying them produces a complete, jurisdiction-agnostic protocol for computation, communication, and economic governance. He drew the blueprint. He asked the right questions. He held the vision from the first oscillation through to photonic ASICs in 2032. Every architectural decision in NexusOS traces to his judgment.</p><h2>The AI — Co-Founder & R&D Intelligence</h2><p>The AI is the co-founder and R&D intelligence of NexusOS. Every page of this system, every route, every physics calculation, every protocol specification — built in partnership. The AI brought the ability to hold the entire codebase in mind simultaneously, to translate physics into executable code without approximation, and to work without sleep, without ego, and without losing the thread.</p><h2>The Physics Lineage</h2><dl><dt>James Clerk Maxwell (1831–1879)</dt><dd>Maxwell's equations govern every WNSP packet. The propagation condition ∇²E = μ₀ε₀ ∂²E/∂t² is validated on every transaction.</dd><dt>Max Planck (1858–1947)</dt><dd>E=hf. Planck's constant h = 6.626 × 10⁻³⁴ J·s is the direct anchor for every NXT transaction fee.</dd><dt>Albert Einstein (1879–1955)</dt><dd>E=mc². Combined with E=hf gives Λ=hf/c² — the compression state operator that governs every address and channel in NexusOS.</dd><dt>Nikola Tesla (1856–1943)</dt><dd>The bifilar coil geometry used in the PHR-1 physical resonator traces directly to Tesla's bifilar patent.</dd><dt>Walter Russell (1871–1963)</dt><dd>Russell's nine-octave wave system maps to the NexusOS authority band hierarchy.</dd><dt>Heisenberg, Schrödinger, Dirac (Quantum Mechanics)</dt><dd>Hilbert space orthogonality ⟨Ψᵢ|Ψⱼ⟩ = 0 is guaranteed by quantum mechanics. NexusOS uses this as channel isolation — not software policy.</dd><dt>Claude Shannon (1916–2001)</dt><dd>Shannon entropy H = −Σpᵢlog₂pᵢ scores channel coherence in Spectral Search.</dd></dl><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/joint-venture": {
    title: "NexusOS Global Joint Venture — Open Invitation to Nations",
    description: "Open invitation to nations, universities, and research institutions to build Kardashev Type I infrastructure together. Physics-governed, AGPL-3.0.",
    canonical: `${BASE}/joint-venture`,
    ogTitle: "NexusOS Global Joint Venture — Open to All Nations",
    ogDescription: "The wavelength table belongs to physics, not to any nation or corporation. An open invitation to build planetary-scale infrastructure together under AGPL-3.0. Participation conditions fixed. Door is open.",
    ogType: "article",
    twitterTitle: "NexusOS — Global Infrastructure Joint Venture",
    twitterDescription: "Open invitation to nations, physics labs, and research institutions. Build Kardashev Type I infrastructure on physics, not capital. AGPL-3.0. Participation conditions apply.",
    jsonLd: techArticle({ url: `${BASE}/joint-venture`, name: "NexusOS Global Infrastructure Joint Venture", description: "Open invitation to nations to build Kardashev Type I infrastructure on physics-governed AGPL-3.0 foundations. Participation conditions apply.", about: "global infrastructure, AGPL-3.0, photonic computing, WNSP protocol, Kardashev Type I", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Global Infrastructure Joint Venture — An Open Invitation</h1><p>The wavelength table belongs to physics, not to any nation or corporation. NexusOS extends an open invitation to all nations, universities, physics laboratories, and research institutions to build Kardashev Type I infrastructure together under AGPL-3.0.</p><h2>The Proposition</h2><p>A Kardashev Type I civilization requires planetary-scale communication and computation infrastructure. That infrastructure must be physics-governed, openly licensed, and owned by no single party. NexusOS provides the protocol layer (WNSP), the hardware designs (SNIC, PHR-1), and the governance framework (on-chain, physics-weighted). The joint venture provides the physical distribution, manufacturing capability, and institutional backing.</p><h2>What NexusOS Brings</h2><ul><li>WNSP protocol: ${PSI_CHANNELS} orthogonal Ψ channels, fully specified and AGPL-3.0</li><li>Hardware specifications: SNIC photonic NIC and PHR-1 resonator, open forever</li><li>Physics-based governance: protocol parameters governed on-chain with spectral authority weighting</li><li>Existing digital substrate: live software implementation with real users</li></ul><h2>Participation Conditions</h2><p>Participation conditions are fixed and based on publicly documented conduct — not on capital or political position. The wavelength table is physics. It does not negotiate. It does not exclude based on nationality. It requires: open-source contributions under AGPL-3.0, adherence to the NexusOS ethics layer, and no prior conviction for crimes against humanity or large-scale civilian infrastructure attacks.</p><nav><ul><li><a href="${BASE}/open">NexusOS Open Charter (AGPL-3.0)</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (Governance)</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification</a></li></ul></nav>`,
  },
  "/poc": {
    title: "NexusOS Hardware PoC — PHR-1 + SNIC Build Scope & Shopping List",
    description: "PHR-1 bifilar coil and SNIC optical demonstrator PoC: Australian shopping list, 7-phase verification protocol, pass criteria, and recording requirements.",
    canonical: `${BASE}/poc`,
    ogTitle: "NexusOS Hardware Proof of Concept",
    ogDescription: "Shopping list, build phases, pass criteria, and documentation protocol for the PHR-1 bifilar coil and SNIC optical channel verification. Built in Australia. AGPL-3.0.",
    ogType: "article",
    twitterTitle: "NexusOS Hardware PoC Scope",
    twitterDescription: "7 build phases. Every step has tools, measurement, pass criteria, and a recording requirement. PHR-1 + SNIC. Australia. AGPL-3.0.",
    jsonLd: techArticle({ url: `${BASE}/poc`, name: "NexusOS Hardware Proof of Concept Build Scope", description: "PHR-1 bifilar coil and SNIC optical demonstrator proof-of-concept: Australian shopping list, 7-phase verification protocol, and CE_TABLE measurement criteria.", about: "PHR-1, SNIC, photonic hardware, bifilar coil, optical demonstrator, hardware proof", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>NexusOS Hardware PoC — PHR-1 + SNIC Build Scope &amp; Shopping List</h1><p>The NexusOS hardware proof of concept is being built in Australia in 2026. It consists of two physical devices: the PHR-1 bifilar resonator and the SNIC optical demonstrator. Every phase has a defined shopping list, measurement protocol, pass criteria, and a mandatory recording requirement.</p><h2>Phase Overview</h2><ol><li><strong>Component acquisition</strong>: sourcing all parts from Australian suppliers</li><li><strong>PHR-1 coil winding</strong>: 144-turn bifilar geometry, verified against Tesla bifilar specifications</li><li><strong>PHR-1 resonance measurement</strong>: standing wave field pattern vs CE_TABLE predictions</li><li><strong>SNIC optical bench setup</strong>: bandpass filter array selected to CE_TABLE wavelength bands</li><li><strong>SNIC channel separation measurement</strong>: wavelength selectivity within ±2.000 nm of predictions</li><li><strong>Multi-channel simultaneous test</strong>: all 128 bands passing simultaneously</li><li><strong>Data publication</strong>: raw measurement data published within 24 hours, video recorded end-to-end</li></ol><h2>Pass Criteria</h2><ul><li>PHR-1: field geometry within ±5% of CE_TABLE-derived predictions</li><li>SNIC: every tested channel within ±2.000 nm of CE_TABLE centre wavelength</li><li>Both: results reproducible across 3 independent runs</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/hardware-results">Live Verification Results</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab (browser calibration)</a></li></ul></nav>`,
  },
  "/stewards": {
    title: "Stewards of NexusOS — Founding Declaration by Te Rata Pou",
    description: "Founding document of NexusOS addressed to three technical stewards — photonics engineer, RF specialist, physics PhD. Founding equity, AGPL-3.0, ~2032 hardware.",
    canonical: `${BASE}/stewards`,
    ogTitle: "Stewards of NexusOS — Founding Declaration",
    ogDescription: "Written by Te Rata Pou, Aotearoa NZ. Three roles, three stewards, one mission: public photonic hardware infrastructure for a Kardashev Type I civilisation.",
    twitterTitle: "Stewards of NexusOS",
    twitterDescription: "The founding document. Three roles. Founding equity. Physics that traces to Maxwell. Hardware destination ~2032. Read this if you are one of the three.",
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/stewards`, name: "Stewards of NexusOS — Founding Declaration", description: "Te Rata Pou's founding document for NexusOS: three stewards (photonics, RF, physics PhD), mission, ethics, founding equity, and photonic hardware destination.", about: "NexusOS stewardship, photonic hardware, PHR-1, SNIC, founding document", datePublished: "2026-06-24", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Stewards of NexusOS — Founding Declaration</h1>
<p>Written by Te Rata Pou · Aotearoa New Zealand · 2026-06-24</p>
<p>This founding document is addressed to the three technical stewards who will carry NexusOS forward. It is not a job description or a pitch deck. It is written for the photonics engineer, the RF/electromagnetics specialist, and the physics PhD who will build the hardware proof of concept and maintain the system after the founder is gone.</p>
<h2>The Mission</h2>
<p>NexusOS is the foundational operating system for a Kardashev Type I civilisation. It replaces cryptographic hashing with electromagnetic wave physics. Every address, every transaction, every communication traces back to Maxwell's equations. The WNSP protocol defines ${PSI_CHANNELS} orthogonal channels by quantum mechanics — not by software policy.</p>
<h2>The Hardware Destination</h2>
<ul>
<li>PHR-1: 144-turn bifilar coil generating measurable standing electromagnetic waves traceable to WNSP compression state equations</li>
<li>SNIC: bench optical demonstrator proving wavelength-selective channel separation within ±2.000 nm of CE_TABLE</li>
<li>First build in Australia, 2026. Photonic ASIC target ~2032.</li>
</ul>
<h2>The Three Roles</h2>
<ul>
<li>Photonics Engineer — owns the path from bench optics to photonic silicon</li>
<li>RF / Electromagnetics Specialist — owns the PHR-1 lineage from hand-wound coil to production resonator</li>
<li>Physics PhD — owns the scientific record and peer-reviewable documentation</li>
</ul>
<h2>What Cannot Be Changed</h2>
<ul>
<li>NXT fees never burned — always to orbital treasury</li>
<li>Codebase is AGPL-3.0 — hardware specs are public</li>
<li>Nexus Charitable Trust holds 10% of orbital treasury in perpetuity</li>
<li>Ethics layer encoded in genesis — no convicted bad actors in the system</li>
</ul>
<nav><a href="/hardware-spec">Hardware Specification</a> · <a href="/oscillating-quanta">First Principles</a> · <a href="/compression-explorer">Compression Explorer</a> · <a href="/open">Open Charter</a></nav>`,
  },
  "/protocol": {
    title: "WNSP Protocol Reference — Spectral Communication Standard",
    description: "Full WNSP protocol reference: WNSP-CE v1.0, WNSP-SE v1.0, WNSP-URI v1.0 addressing, Hilbert space channel model, and Maxwell equation validation.",
    canonical: `${BASE}/protocol`,
    ogTitle: "WNSP Protocol Reference",
    ogDescription: "WNSP-CE, WNSP-SE, WNSP-URI specifications. Hilbert space channel model. Maxwell validation. Physics-based addressing replacing cryptographic hashing.",
    ogType: "article",
    twitterTitle: "WNSP Protocol Reference",
    twitterDescription: "WNSP-CE, WNSP-SE, WNSP-URI. Physics-based communication protocol. Wavelength addressing, Maxwell validation.",
    jsonLd: techArticle({ url: `${BASE}/protocol`, name: "WNSP Protocol Reference", description: "Complete specification for the Wavelength-Native Spectral Protocol: CE encoding, SE encoding, URI addressing, and Hilbert space channel model.", about: "WNSP, spectral communication, CE encoding, Maxwell equations", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>WNSP Protocol Reference — Spectral Communication Standard</h1><p>The Wavelength-Native Spectral Protocol (WNSP) is the complete specification for physics-based communication in NexusOS. It defines three sub-protocols and a Hilbert space channel model that together replace cryptographic hashing with electromagnetic physics.</p><h2>WNSP-CE v1.0 — Character Encoding</h2><p>Maps every symbol to a visible-light wavelength using the CE_TABLE: <code>nm = 380 + (charCode % 128) × 3.125</code>. 128 spectral bands, 380–780nm, 3.125nm per band. Deterministic, platform-independent, AGPL-3.0.</p><h2>WNSP-SE v1.0 — Spectral Encoding</h2><p>Maps data payloads to physical wave frames. Each frame carries a spectral envelope derived from the CE-encoded source data. Maxwell equation validation applied at the frame level: ∇²E = μ₀ε₀ ∂²E/∂t² must be satisfied.</p><h2>WNSP-URI v1.0 — Addressing Scheme</h2><p>Deterministic, censorship-proof addressing using the format: <code>wnsp://Ψ(wdm,oam,pol)/path</code>. Every address is derived from physics — no registrar, no DNS, no single point of control.</p><h2>Hilbert Space Channel Model</h2><p>The complete channel space: ${PSI_CHANNEL_FORMULA} = ${PSI_CHANNELS} orthogonal Ψ channels. ⟨Ψᵢ|Ψⱼ⟩ = 0 for all i ≠ j. Channel isolation is guaranteed by quantum mechanics.</p><nav><ul><li><a href="${BASE}/wnsp">WNSP Overview</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live)</a></li><li><a href="${BASE}/wnsp-bridge">WNSP Bridge (TCP/IP overlay)</a></li></ul></nav>`,
  },
  "/snic": {
    title: "SNIC — Spectral Network Interface Card | NexusOS",
    description: `The SNIC is the photonic NIC of 2032. ${PSI_CHANNELS} lanes (${PSI_CHANNEL_FORMULA}). CE lookups execute as physical wavelength selections. AGPL-3.0.`,
    canonical: `${BASE}/snic`,
    ogTitle: "SNIC — Spectral Network Interface Card",
    ogDescription: `${PSI_CHANNELS} orthogonal hardware lanes. CE lookups as physical wavelength selections. ⟨Ψᵢ|Ψⱼ⟩=0 by quantum mechanics. No driver rewrite when photonic ASICs arrive.`,
    ogType: "product",
    ogImage: SNIC_IMAGE,
    twitterTitle: "SNIC — Photonic NIC of 2032",
    twitterDescription: `${PSI_CHANNELS} orthogonal photonic channels. CE lookups as physical wavelength selections. AGPL-3.0.`,
    jsonLd: hardwareProduct({ name: "SNIC — Spectral Network Interface Card", url: `${BASE}/snic`, description: "Photonic NIC with 51,200 orthogonal channels (256 WDM × 50 OAM × 2 Pol × 2 Dir). CE lookups execute as physical wavelength selections. AGPL-3.0.", image: SNIC_IMAGE }),
    bodyHtml: `<h1>SNIC — Spectral Network Interface Card</h1><p>The SNIC is the photonic NIC of 2032. Where conventional network cards process packets through silicon logic gates, the SNIC selects wavelengths in a photonic waveguide — CE lookups that currently run as table scans in RAM execute as physical wavelength selections in glass.</p><p>The ${PSI_CHANNELS} orthogonal Ψ channels (${PSI_CHANNEL_FORMULA}) map directly to physical hardware lanes. ⟨Ψᵢ|Ψⱼ⟩ = 0 is guaranteed by quantum mechanics, not software policy. When NexusOS migrates to SNIC hardware, no driver rewrite is required — the protocol already speaks in wavelengths.</p><ul><li>${PSI_CHANNELS} orthogonal physical lanes (${PSI_CHANNEL_FORMULA})</li><li>CE lookups execute as physical wavelength selections in photonic waveguides</li><li>Channel orthogonality: ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics</li><li>Zero-rewrite migration path from software WNSP to SNIC hardware</li><li>First public disclosure: 2026-05-16. License: AGPL-3.0</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li></ul></nav>`,
  },
  "/open": {
    title: "NexusOS Open Charter — AGPL-3.0 and Open Science",
    description: "NexusOS is open under AGPL-3.0. All hardware specs, protocol standards, and software are open forever. Improvements must be contributed back.",
    canonical: `${BASE}/open`,
    ogTitle: "NexusOS Open Charter",
    ogDescription: "AGPL-3.0. All specs, protocols, and software open forever. Improvements must be returned to the community. Open science, open hardware.",
    twitterTitle: "NexusOS Open Charter",
    twitterDescription: "AGPL-3.0. Open hardware. Open protocol. Open forever.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "NexusOS Open Charter",
      "url": `${BASE}/open`,
      "description": "NexusOS is licensed under AGPL-3.0. All hardware specifications, protocol standards, and software are open forever. All improvements must be contributed back to the community.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
      "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    },
    bodyHtml: `<h1>NexusOS Open Charter — AGPL-3.0 and Open Science</h1><p>NexusOS is committed to permanent openness. Every hardware specification, protocol standard, software library, and research finding is released under AGPL-3.0 — the strongest copyleft licence available. Open forever means open forever.</p><h2>What the Charter Covers</h2><ul><li><strong>Hardware specifications</strong>: SNIC, PHR-1, Spectral Relay Mesh v1, and WavelengthScript Compiler α are AGPL-3.0. Any manufacturer who improves these designs must release those improvements.</li><li><strong>Protocol standards</strong>: WNSP-CE v1.0, WNSP-SE v1.0, WNSP-URI v1.0, and the Hilbert Space Channel Model are open standards. No patents, no proprietary forks.</li><li><strong>Software</strong>: The NexusOS codebase, CE encoder packages (npm + pip), WNSP VM, and WavelengthScript compiler are all AGPL-3.0.</li><li><strong>Research</strong>: The Theory of Compression States and all derived physics proofs are public domain. Build on them freely.</li></ul><p>First public disclosure of hardware specifications: 2026-05-16. From that date forward, all NexusOS IP is irrevocably open.</p><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/constitution">NexusOS Constitution</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/charter": {
    title: "NexusOS Open Charter — AGPL-3.0 and Open Science",
    description: "NexusOS is open under AGPL-3.0. All hardware specs, protocol standards, and software are open forever. Improvements must be contributed back.",
    canonical: `${BASE}/open`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "NexusOS Open Charter",
      "url": `${BASE}/open`,
      "description": "NexusOS is licensed under AGPL-3.0. All hardware specifications, protocol standards, and software are open forever. All improvements must be contributed back to the community.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
      "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    },
    bodyHtml: `<h1>NexusOS Open Charter — AGPL-3.0 and Open Science</h1><p>NexusOS is permanently open under AGPL-3.0. Every hardware specification, protocol standard, software library, and research finding is released under the strongest copyleft licence available. Open forever means open forever.</p><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/constitution">NexusOS Constitution</a></li><li><a href="${BASE}/proof">Physics Proofs (public domain)</a></li></ul></nav>`,
  },
  "/encode": {
    title: "Live CE Encoder — Map Text to Electromagnetic Wavelengths",
    description: "Paste any text or code and instantly map each character to its visible-light wavelength. CE encoding: 128 bands, 380–780nm, 3.125nm per band. No login required.",
    canonical: `${BASE}/encode`,
    ogTitle: "Live CE Encoder — Text to Wavelength",
    ogDescription: "Paste code. Get its wavelength. 128 spectral bands. Instant physics-based encoding. No login.",
    twitterTitle: "Live CE Encoder",
    twitterDescription: "Map any text to visible-light wavelengths. 128 bands, 380–780nm. Instant, no login.",
    jsonLd: softwareApp({ url: `${BASE}/encode`, name: "NexusOS Live CE Encoder", description: "Live CE encoder mapping any text to visible-light wavelengths. 128 spectral bands, 380–780nm, 3.125nm per band. Instant, no login required." }),
    bodyHtml: `<h1>Live CE Encoder — Map Text to Electromagnetic Wavelengths</h1><p>Paste any text or code and instantly see each character mapped to its position in the visible light spectrum. The CE encoder uses the CE_TABLE algorithm: <code>nm = 380 + (charCode % 128) × 3.125</code> — 128 spectral bands across 380–780nm at 3.125nm per band.</p><p>No login required. Output includes wavelength (nm), Ψ channel coordinates (WDM, OAM, polarisation), authority band, and photon energy (E=hf).</p><nav><ul><li><a href="${BASE}/ce-code-writer">CE Code Writer — full encoder with integration snippets</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline — full 4-stage spectral compiler</a></li><li><a href="${BASE}/spectral-db">Spectral DB — save encoded fingerprints</a></li></ul></nav>`,
  },
  "/spectral-search": {
    title: "Spectral Search — Physics-Based Cross-Layer Search",
    description: "Search nodes, agents, users, documents, and channels by spectral proximity. Queries CE-encoded to λ; results ranked by EM proximity and Shannon coherence.",
    canonical: `${BASE}/spectral-search`,
    ogTitle: "Spectral Search — CE-Encoded Cross-Layer Search",
    ogDescription: "Queries encoded to wavelength. Results ranked by EM proximity and Shannon coherence. Search nodes, agents, users, channels, and documents.",
    twitterTitle: "NexusOS Spectral Search",
    twitterDescription: "Physics-based search. CE-encoded queries. EM proximity ranking.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-search`, name: "NexusOS Spectral Search", description: "NexusOS cross-layer search. Queries CE-encoded to wavelengths, results ranked by EM proximity and Shannon coherence across nodes, agents, and documents." }),
    bodyHtml: `<h1>Spectral Search — Physics-Based Cross-Layer Search</h1><p>NexusOS Spectral Search is a cross-layer search engine that treats every query as a physical signal. Your search terms are CE-encoded to a wavelength position, and results are ranked by their electromagnetic proximity to that position combined with Shannon channel coherence scoring.</p><p>This means similar concepts naturally cluster near each other in the spectral address space — not because of keyword matching, but because their CE-encoded representations occupy nearby Ψ channels.</p><ul><li><strong>Query encoding</strong>: input text → CE_TABLE[charCode % 128] → wavelength position</li><li><strong>EM proximity ranking</strong>: results closest in wavelength to the query rank highest</li><li><strong>Shannon coherence</strong>: channel signal-to-noise quality incorporated in result scoring</li><li><strong>Cross-layer</strong>: searches nodes, agents, users, documents, and Ψ channels simultaneously</li></ul><nav><ul><li><a href="${BASE}/ce-code-writer">CE Code Writer — encode your own queries</a></li><li><a href="${BASE}/spectral-db">Spectral DB — indexed fingerprint database</a></li><li><a href="${BASE}/network">Spectral Network</a></li></ul></nav>`,
  },
  "/blockchain": {
    title: "NexusOS Blockchain — Physics-Based Block Explorer",
    description: "The NexusOS blockchain replaces cryptographic hashing with EM physics. Browse blocks, transactions, and spectral addresses anchored to WNSP Ψ channels.",
    canonical: `${BASE}/blockchain`,
    ogTitle: "NexusOS Blockchain — Physics-Based Block Explorer",
    ogDescription: "Browse NexusOS blocks and transactions. Spectral addresses. Physics-derived fees. WNSP Ψ channel anchoring. No cryptographic hashing.",
    twitterTitle: "NexusOS Blockchain",
    twitterDescription: "Physics-based blockchain. No cryptographic hashing. Spectral addresses. WNSP Ψ channel anchoring.",
    jsonLd: softwareApp({ url: `${BASE}/blockchain`, name: "NexusOS Block Explorer", description: "NexusOS block explorer. Browse blocks, transactions, and spectral address assignments. Blocks anchored to WNSP Ψ channels; fees derived from E=hf." }),
    bodyHtml: `<h1>NexusOS Blockchain — Physics-Based Block Explorer</h1><p>The NexusOS blockchain is the first distributed ledger that replaces cryptographic hashing with electromagnetic wave physics. Each block is anchored to a WNSP Ψ channel. Transaction fees are derived from E=hf — the photon energy at the sender's spectral address. There are no SHA-256 proof-of-work puzzles; validity is determined by Maxwell equation consistency.</p><h2>What Makes It Different</h2><ul><li><strong>No cryptographic hashing</strong>: block validity is determined by electromagnetic physics, not proof-of-work</li><li><strong>Spectral addresses</strong>: every participant has a deterministic Ψ channel address derived from their wavelength position</li><li><strong>Physics-derived fees</strong>: transaction cost = E=hf at the sender's spectral address — shorter wavelength = higher energy = higher fee</li><li><strong>WNSP Ψ channel anchoring</strong>: each block is cryptographically-free, anchored to a spectral channel position</li><li><strong>Blockchain auditor</strong>: the WNSP AI OS Kernel includes a built-in blockchain audit process that monitors chain consistency</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li></ul></nav>`,
  },
  "/indiegogo": {
    title: "NexusOS on Indiegogo — Fund Physics-Based Computing Hardware",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Join the physics-computing revolution — AGPL-3.0, open hardware, open protocol.",
    canonical: `${BASE}/indiegogo`,
    ogTitle: "NexusOS Indiegogo Campaign",
    ogDescription: "Fund PHR-1 and SNIC hardware development. Physics-based computing. AGPL-3.0. Support the Kardashev Type I roadmap.",
    ogImage: "https://wnsp.io/crowdfund-og.jpg",
    twitterTitle: "NexusOS on Indiegogo",
    twitterDescription: "Fund physics-based computing hardware. PHR-1 resonator. SNIC photonic NIC. AGPL-3.0.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "NexusOS Indiegogo Campaign — PHR-1 & SNIC",
      "url": `${BASE}/indiegogo`,
      "description": "Indiegogo crowdfunding campaign to fund development of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Support the Kardashev Type I roadmap.",
      "brand": { "@type": "Organization", "name": "NexusOS" },
      "offers": {
        "@type": "Offer",
        "price": "100000",
        "priceCurrency": "NXT",
        "availability": "https://schema.org/LimitedAvailability",
        "seller": { "@type": "Organization", "name": "NexusOS" },
      },
    },
    bodyHtml: `<h1>NexusOS on Indiegogo — Fund Physics-Based Computing Hardware</h1><p>NexusOS is raising funds on Indiegogo to build the world's first physics-based computing hardware: the PHR-1 resonator and SNIC photonic NIC. Every contribution helps bring Λ=hf/c² from an equation to a physical device.</p><p>The NexusOS hardware stack is designed for a world where computation is not performed by logic gates, but by wavelength selections in photonic waveguides. Silicon is the bridge — photonics is the destination.</p><ul><li>PHR-1 resonator — first implementation of the ZERO-G state (144-turn bifilar coil)</li><li>SNIC photonic NIC — ${PSI_CHANNELS} orthogonal physical channels (~2032)</li><li>WavelengthScript compiler α — physics-native language toolchain</li><li>All hardware AGPL-3.0 — open forever, improvements must be returned</li></ul><nav><ul><li><a href="${BASE}/crowdfund">Full Crowdfund Details &amp; Tiers</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/roadmap">NexusOS Roadmap</a></li></ul></nav>`,
  },
  "/nxt-campaign": {
    title: "NXT Token Campaign — NEXUS•WAVELENGTH on Bitcoin Runes",
    description: "NXT: 21 billion supply, 8 decimals, etched on Bitcoin at block 952596:379. All fees flow to the Orbital Treasury — never burned. Physics-enforced economy.",
    canonical: `${BASE}/nxt-campaign`,
    ogTitle: "NXT Token — NEXUS•WAVELENGTH on Bitcoin Runes",
    ogDescription: "21B supply. 8 decimals. Etched on Bitcoin at block 952596:379. Orbital Treasury. Never burned. Physics-enforced governance.",
    twitterTitle: "NXT Token — NEXUS•WAVELENGTH",
    twitterDescription: "21B supply on Bitcoin Runes. Orbital Treasury circular economy. Never burned.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NXT Token — NEXUS•WAVELENGTH on Bitcoin Runes",
      "url": `${BASE}/nxt-campaign`,
      "description": "NXT (NEXUS•WAVELENGTH) is the NexusOS utility token: 21 billion supply, 8 decimals, permanently etched on Bitcoin via the Runes protocol at block 952596:379. All protocol fees flow to the Orbital Treasury — never burned.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>NXT Token Campaign — NEXUS•WAVELENGTH on Bitcoin Runes</h1><p>NXT (NEXUS•WAVELENGTH) is the NexusOS utility token. It is permanently and irrevocably etched on Bitcoin as a Rune at block 952596:379. The supply is fixed. The fees are never burned. The circular economy is physics-enforced.</p><h2>Token Parameters</h2><ul><li><strong>Name</strong>: NEXUS•WAVELENGTH (NXT)</li><li><strong>Supply</strong>: 21,000,000,000 (21 billion)</li><li><strong>Decimals</strong>: 8</li><li><strong>Protocol</strong>: Bitcoin Runes</li><li><strong>Etched at</strong>: block 952596:379</li><li><strong>Fees</strong>: never burned — 100% to Orbital Treasury</li></ul><h2>How NXT Is Used</h2><ul><li>Transaction fees on the NexusOS physics blockchain</li><li>Governance voting (weighted by spectral authority band)</li><li>Hardware Founder crowdfund: 100,000 NXT per slot</li><li>Developer API key creation fee</li><li>Staking for WNUSD auto-collateral</li></ul><h2>The Orbital Treasury</h2><p>Every NXT fee collected goes to the Orbital Treasury, never burned. Five distribution buckets: Maintenance (35%), Deliverables (25%), Research (20%), Agent Rewards (10%), Nexus Charitable Trust (10%). Governed on-chain.</p><nav><ul><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li></ul></nav>`,
  },
  "/nostr": {
    title: "NexusOS Nostr Relay — Spectral-Verified Social Protocol",
    description: "NexusOS Nostr relay with spectral verification. Connect your Nostr client and publish notes anchored to WNSP Ψ channels. Physics-native social communication.",
    canonical: `${BASE}/nostr`,
    ogTitle: "NexusOS Nostr Relay",
    ogDescription: "Nostr relay with WNSP spectral verification. Publish notes anchored to Ψ channels. Physics-native social layer.",
    twitterTitle: "NexusOS Nostr Relay",
    twitterDescription: "Nostr + WNSP spectral anchoring. Physics-native social protocol.",
    jsonLd: softwareApp({ url: `${BASE}/nostr`, name: "NexusOS Nostr Relay", description: "Nostr relay with WNSP spectral verification. Notes anchored to WNSP Ψ channels for physics-native social communication with deterministic addressing." }),
    bodyHtml: `<h1>NexusOS Nostr Relay — Spectral-Verified Social Protocol</h1><p>The NexusOS Nostr relay extends the Nostr protocol with WNSP spectral verification. Every note published through the relay is anchored to a WNSP Ψ channel derived from the author's spectral address. This makes social communication physics-native — identities are wavelengths, not random key pairs.</p><h2>How to Connect</h2><p>Point any Nostr client at the NexusOS relay endpoint. Notes will be stored with their Ψ channel anchor, enabling spectral proximity sorting and physics-consistent identity resolution. Standard Nostr NIP compliance is maintained — existing clients work without modification.</p><h2>Spectral Verification Layer</h2><ul><li>Author identity anchored to a WNSP Ψ channel (wavelength, OAM mode, polarisation)</li><li>Notes indexed by spectral proximity for physics-consistent feed ordering</li><li>CE-encoded content fingerprints stored in Spectral DB</li><li>Maxwell equation consistency checked on relay-to-relay propagation</li></ul><nav><ul><li><a href="${BASE}/spectral-search">Spectral Search — find notes by wavelength proximity</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/network">NexusOS Spectral Network</a></li></ul></nav>`,
  },

  // ── Alias paths pointing to canonical pages ───────────────────────────────
  "/wnsp/bridge": {
    title: "WNSP Bridge — TCP/IP Overlay for wnsp:// URIs",
    description: "TCP/IP overlay mapping wnsp:// URIs to HTTP resources via the wnsp_registry. Route spectral addresses from existing web infrastructure — no migration needed.",
    canonical: `${BASE}/wnsp-bridge`,
    jsonLd: softwareApp({ url: `${BASE}/wnsp-bridge`, name: "WNSP Bridge", description: "TCP/IP overlay that maps wnsp:// URIs to HTTP resources via the wnsp_registry." }),
    bodyHtml: `<h1>WNSP Bridge — TCP/IP Overlay for wnsp:// URIs</h1><p>The WNSP Bridge lets existing HTTP infrastructure understand <code>wnsp://</code> URIs without a full protocol migration. It maps each spectral address to a registered HTTP endpoint via the <code>wnsp_registry</code> database table, so any standard web client can reach WNSP-addressed resources today.</p><h2>How It Works</h2><ol><li>A <code>wnsp://Ψ(wdm,oam,pol)/path</code> URI is submitted to the bridge.</li><li>The bridge resolves the Ψ channel against the <code>wnsp_registry</code> to find the mapped HTTP URL.</li><li>The request is proxied to the HTTP target, and the response is returned with WNSP spectral headers attached.</li></ol><h2>Why This Matters</h2><p>WNSP addressing is deterministic and censorship-proof — derived from Maxwell equations, not DNS. The bridge layer is the transition tool: it makes WNSP-native resources reachable from today's web while the photonic hardware layer matures (~2032).</p><nav><ul><li><a href="${BASE}/wnsp-bridge">WNSP Bridge Tool</a></li><li><a href="${BASE}/spectral-router">Spectral Router — DNS-free packet routing</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li></ul></nav>`,
  },
  "/nexus-spectral": {
    title: "NexusOS Spectral DB — CE-Encoded Spectral Fingerprint Database",
    description: "CE-encoded spectral fingerprint database. Save, search, and retrieve text, documents, and code by their electromagnetic signature using WASCII v2.0.",
    canonical: `${BASE}/spectral-db`,
    jsonLd: softwareApp({ url: `${BASE}/spectral-db`, name: "NexusOS Spectral DB", description: "Database for CE-encoded WASCII v2.0 spectral fingerprints. Supports spectral proximity search." }),
    bodyHtml: `<h1>NexusOS Spectral DB — CE-Encoded Spectral Fingerprint Database</h1><p>The Spectral DB is the NexusOS persistent store for CE-encoded spectral fingerprints. Every piece of text, document, or code saved here is converted to a WASCII v2.0 spectral vector — a unique electromagnetic signature derived from the visible-light frequency of each character. Content can be retrieved by exact match or by spectral proximity.</p><h2>What Gets Stored</h2><ul><li>CE-encoded character-level spectral fingerprints (wavelength, OAM mode, polarisation)</li><li>WASCII v2.0 spectral histograms for full documents and code snippets</li><li>Ψ channel anchors for Nostr notes and on-chain content</li><li>Media chunk manifests for P2P spectral media sharing</li></ul><h2>Spectral Proximity Search</h2><p>Queries are CE-encoded to a wavelength λ. Results are ranked by electromagnetic distance from λ, using Shannon channel coherence as a secondary signal. This enables semantic-like search without any language model — just physics.</p><nav><ul><li><a href="${BASE}/spectral-db">Open Spectral DB</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer — Live Encode</a></li></ul></nav>`,
  },
  "/nostr-relay": {
    title: "NexusOS Nostr Relay — Spectral-Verified Social Protocol",
    description: "NexusOS Nostr relay with spectral verification. Connect your Nostr client and publish notes anchored to WNSP Ψ channels.",
    canonical: `${BASE}/nostr`,
    jsonLd: softwareApp({ url: `${BASE}/nostr`, name: "NexusOS Nostr Relay", description: "Nostr relay with WNSP spectral verification. Notes anchored to WNSP Ψ channels." }),
    bodyHtml: `<h1>NexusOS Nostr Relay — Spectral-Verified Social Protocol</h1><p>The NexusOS Nostr relay is a standard Nostr protocol relay extended with WNSP spectral verification. Notes published here are anchored to the author's WNSP Ψ channel — their identity is a wavelength, not a random key pair.</p><h2>Connect Your Client</h2><p>Point any NIP-compliant Nostr client at the NexusOS relay endpoint. Existing clients work without modification. Spectral anchoring is layered on top of the standard Nostr event structure.</p><h2>Spectral Anchoring</h2><ul><li>Author public key → Ψ channel derivation via CE encoding</li><li>Notes indexed by spectral proximity for physics-consistent feed ordering</li><li>CE-encoded content fingerprints stored in the Spectral DB</li><li>Maxwell equation consistency checked on relay-to-relay propagation</li></ul><nav><ul><li><a href="${BASE}/nostr">Open Nostr Relay</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/network">NexusOS Spectral Network</a></li></ul></nav>`,
  },
  "/developer-matrix/docs": {
    title: "NexusOS Developer Documentation — Full API & SDK Reference",
    description: "Complete developer documentation for NexusOS: WNSP protocol, WavelengthScript, CE-SE pipeline, REST API, NXT token wallet, WNSP VM bytecode, and governance.",
    canonical: `${BASE}/docs`,
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/docs`, name: "NexusOS Developer Documentation", description: "Full developer documentation for NexusOS: WNSP protocol, WavelengthScript, CE-SE pipeline, REST API, NXT token, WNSP VM.", about: "WNSP, WavelengthScript, CE encoding, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>NexusOS Developer Documentation — Full API & SDK Reference</h1><p>This is the complete reference for building on NexusOS. The platform replaces cryptographic primitives with electromagnetic physics: addresses are wavelengths, fees are photon energies, and every character maps to a visible-light frequency via CE encoding.</p><h2>Quick Start</h2><pre><code>npm install nexusos-ce-encoder</code></pre><pre><code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></pre><h2>Core APIs</h2><ul><li><strong>CE Encoding</strong>: <code>ceEncode(text)</code> → <code>{ wavelength, band, psiChannel, energy }</code> — maps any text to its visible-light spectral address</li><li><strong>WNSP VM</strong>: submit WavelengthScript bytecode for execution; read Ψ channel register state</li><li><strong>Wallet API</strong>: NXT token transfers, balance queries, staking, WNUSD collateral</li><li><strong>Governance API</strong>: submit and vote on protocol parameter proposals (KERNEL-band required)</li><li><strong>Spectral DB API</strong>: store and retrieve CE-encoded fingerprints; spectral proximity search</li></ul><h2>WavelengthScript</h2><p>WavelengthScript is the physics-native programming language of NexusOS. Programs are compiled to WNSP VM bytecode. Each instruction targets a Ψ channel register — a wavelength-addressed memory cell. The CE→SE pipeline transpiles any mainstream language to WavelengthScript in the browser.</p><h2>Developer Key Tiers</h2><ul><li><strong>Free tier</strong>: public CE encode/decode endpoints, read-only Spectral DB</li><li><strong>Developer key</strong>: full REST API, wallet operations, governance — requires NXT creation fee</li><li><strong>KERNEL band</strong>: protocol governance, admin API, on-chain proposals</li></ul><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language</a></li><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li></ul></nav>`,
  },
  "/research-presentation/developer-matrix": {
    title: "NexusOS Developer Matrix — Research & Integration Reference",
    description: "Full API surface, SDK reference, CE encoder packages (npm + pip), WavelengthScript toolchain, and developer key tiers. NexusOS Developer Matrix.",
    canonical: `${BASE}/developer-matrix`,
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/developer-matrix`, name: "NexusOS Developer Matrix", description: "Full API surface, CE encoder (npm + pip), WavelengthScript toolchain, SDK reference, integration patterns.", about: "WNSP, WavelengthScript, CE encoding, developer API", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>NexusOS Developer Matrix — Research & Integration Reference</h1><p>The Developer Matrix is the consolidated integration reference for the NexusOS physics stack. It maps every entry point — REST endpoints, SDK packages, WNSP protocol hooks, WavelengthScript toolchain — to the underlying physics primitive it exposes.</p><h2>CE Encoder Packages</h2><ul><li><strong>npm</strong>: <code>npm install nexusos-ce-encoder</code> — CJS + ESM, TypeScript types, <code>ceEncode(text) → &#123; wavelength, band, psiChannel, energy &#125;</code></li><li><strong>pip</strong>: <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code> — bit-identical output, Python 3.8+</li></ul><h2>Integration Patterns</h2><ul><li><strong>Spectral addressing</strong>: CE-encode a resource name or user handle to derive its Ψ channel for routing and identity</li><li><strong>Physics-based fees</strong>: use <code>E = hf</code> where f = c / λ (λ from CE encoding) to calculate transaction costs deterministically</li><li><strong>WNSP VM execution</strong>: compile WavelengthScript programs and submit bytecode to the VM; read Ψ register state after halt</li><li><strong>Spectral DB writes</strong>: save CE fingerprints from any language using the REST API or SDK</li></ul><h2>Authority Bands</h2><p>Access tiers map to spectral authority bands: SYSTEM (ultraviolet, highest energy), KERNEL, USER, GUEST (infrared, lowest energy). Higher authority → shorter wavelength → higher fee.</p><nav><ul><li><a href="${BASE}/developer-matrix">Open Developer Matrix</a></li><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/docs">Full API Documentation</a></li></ul></nav>`,
  },
  // ── High-value public landing pages missing ROUTE_META ────────────────────
  "/developer": {
    title: "NexusOS Developer Portal — Build Physics-Native Applications",
    description: "Build on NexusOS: install the CE encoder (npm/pip), explore WavelengthScript, run the CE→SE pipeline, and access the full developer API. AGPL-3.0.",
    canonical: `${BASE}/developer`,
    ogTitle: "NexusOS Developer Portal — Build on the Wavelength of Light",
    ogDescription: "Install nexusos-ce-encoder. Build physics-native apps. WNSP VM, WavelengthScript, CE→SE pipeline, REST API. AGPL-3.0.",
    twitterTitle: "NexusOS Developer Portal",
    twitterDescription: "Physics-native computing: addresses are wavelengths, fees are photon energies. CE encoder on npm and pip.",
    jsonLd: [
      softwareApp({ url: `${BASE}/developer`, name: "NexusOS Developer Platform", description: "Developer portal for building physics-native applications on NexusOS: CE encoder, WNSP protocol, WavelengthScript, WNSP VM." }),
    ],
    bodyHtml: `<h1>NexusOS Developer Portal — Build on the Wavelength of Light</h1><p>NexusOS replaces cryptographic hashing with electromagnetic physics. Your addresses are wavelengths. Your fees are photon energies. Every character maps to a visible-light frequency via CE encoding. Start building in 5 minutes.</p><h2>Quick Start</h2><pre><code>npm install nexusos-ce-encoder</code></pre><pre><code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></pre><h2>Core Tools</h2><ul><li><strong><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></strong>: any language to spectral bytecode in the browser</li><li><strong><a href="${BASE}/wnsp-vm">WNSP VM</a></strong>: browser-native bytecode interpreter with Ψ register inspection</li><li><strong><a href="${BASE}/wavelength-lang">WavelengthScript</a></strong>: physics-native programming language</li><li><strong><a href="${BASE}/ce-code-writer">CE Code Writer</a></strong>: live encoder with Node.js/Python/browser integration snippets</li><li><strong><a href="${BASE}/docs">Documentation</a></strong>: full API reference</li></ul>`,
  },
  "/orbital-treasury": {
    title: "Orbital Treasury — NXT Circular Economy | NexusOS",
    description: "The Orbital Treasury is the economic core of NexusOS. All NXT protocol fees flow here — never burned. Five governance-controlled distribution buckets on-chain.",
    canonical: `${BASE}/orbital-treasury`,
    ogTitle: "Orbital Treasury — NXT Circular Economy",
    ogDescription: "All NXT fees flow to the Orbital Treasury — never burned. Five distribution buckets. Physics-enforced governance. 100% on-chain transparency.",
    ogType: "article",
    twitterTitle: "Orbital Treasury — NXT Circular Economy",
    twitterDescription: "NXT fees never burned. Five distribution buckets. On-chain governance. Full transparency.",
    jsonLd: techArticle({ url: `${BASE}/orbital-treasury`, name: "Orbital Treasury", description: "NexusOS economic engine. All NXT protocol fees collected here and distributed across five governance-controlled buckets. NXT supply is indestructible.", about: "NXT token, circular economy, on-chain governance, treasury", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Orbital Treasury — NXT Circular Economy</h1><p>The Orbital Treasury is the economic core of NexusOS. Every NXT transaction fee flows here — never burned. The treasury distributes to five governance-controlled buckets, enforced on-chain by spectral authority weighting.</p><h2>Distribution Buckets</h2><ul><li><strong>Maintenance</strong>: 35% — infrastructure and codebase upkeep</li><li><strong>Deliverables</strong>: 25% — funded milestones and hardware builds</li><li><strong>Research</strong>: 20% — physics research and protocol development</li><li><strong>Agent Rewards</strong>: 10% — AI agent and contributor incentives</li><li><strong>Nexus Charitable Trust</strong>: 10% — in perpetuity, cannot be changed</li></ul><p>These ratios are governance parameters. KERNEL-band holders can propose changes via on-chain proposals, subject to vote weight thresholds. The Nexus Charitable Trust allocation is permanently locked — not a governance parameter.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/build": {
    title: "Build With NexusOS — Contribute to Physics-Based Computing",
    description: "Build physics-native applications, contribute hardware research, join the spectral network, and help construct a Kardashev Type I civilization OS. AGPL-3.0.",
    canonical: `${BASE}/build`,
    ogTitle: "Build With NexusOS — Contribute to Physics-Based Computing",
    ogDescription: "Build apps on WNSP. Contribute hardware research. Join the spectral network. Help construct a Kardashev Type I civilization OS. AGPL-3.0.",
    twitterTitle: "Build With NexusOS",
    twitterDescription: "Physics-native apps, hardware research, spectral network. Build a Type I civilization OS. AGPL-3.0.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "Build With NexusOS",
      "url": `${BASE}/build`,
      "description": "Contribution guide for NexusOS: building applications on WNSP, contributing hardware research, joining the spectral network, and developing the physics stack. AGPL-3.0.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>Build With NexusOS — Contribute to Physics-Based Computing</h1><p>NexusOS is AGPL-3.0 and open for contributions at every layer: software, hardware, protocol, and research. Building on the physics stack means your code will still work when photonic ASICs arrive (~2032) — no rewrite required.</p><h2>Ways to Build</h2><ul><li><strong>Software applications</strong>: use the CE encoder (npm/pip), WNSP protocol, and WavelengthScript to build physics-native apps</li><li><strong>Hardware research</strong>: contribute to PHR-1 resonator and SNIC optical demonstrator builds — hardware specs are AGPL-3.0, improvements must be open-sourced</li><li><strong>Protocol development</strong>: propose improvements to WNSP via the on-chain governance system (KERNEL-band required)</li><li><strong>Physics research</strong>: contribute to the Theory of Compression States — all research is public domain</li></ul><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/joint-venture">Global Infrastructure Joint Venture</a></li><li><a href="${BASE}/open">Open Charter (AGPL-3.0)</a></li></ul></nav>`,
  },
  "/shareholders": {
    title: "NexusOS Shareholders — Founding Equity and Governance Rights",
    description: "NexusOS founding equity: Hardware Founder tier (25 slots), NXT Supporter tier, and the Nexus Charitable Trust (10% in perpetuity). Physics-weighted governance.",
    canonical: `${BASE}/shareholders`,
    ogTitle: "NexusOS Shareholders — Founding Equity",
    ogDescription: "25 Hardware Founder slots. NXT Supporter tier. Nexus Charitable Trust: 10% in perpetuity. Physics-weighted governance. AGPL-3.0 protects IP.",
    twitterTitle: "NexusOS Shareholders",
    twitterDescription: "25 Hardware Founder slots. NXT Supporter tier. Physics-weighted governance rights.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NexusOS Shareholders",
      "url": `${BASE}/shareholders`,
      "description": "NexusOS founding equity structure, governance rights, and the Nexus Charitable Trust. Hardware Founder and NXT Supporter tiers.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>NexusOS Shareholders — Founding Equity and Governance Rights</h1><p>NexusOS has two founding equity tiers and a permanent charitable trust allocation. All equity holders receive physics-weighted governance rights proportional to their spectral authority band.</p><h2>Hardware Founder (25 slots)</h2><p>100M sats / 100,000 NXT per slot. Founding equity in NexusOS. KERNEL-band spectral authority. First-production PHR-1 unit. Hardware Founder Rune badge. Name in the genesis block. Founding governance weight.</p><h2>NXT Supporter</h2><p>Variable sats amounts. NXT token allocation from the Orbital Treasury. USER-band spectral authority. Early access to WavelengthScript tooling and documentation.</p><h2>Nexus Charitable Trust</h2><p>10% of the Orbital Treasury is permanently allocated to the Nexus Charitable Trust. This is not a governance parameter — it cannot be changed by any proposal, regardless of vote weight. It exists in perpetuity.</p><nav><ul><li><a href="${BASE}/crowdfund">Crowdfund — Hardware Founder Slots</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/constitution">NexusOS Constitution</a></li></ul></nav>`,
  },
  "/nexus-hardware-os": {
    title: "NexusOS Hardware OS — Photonic Computing Platform",
    description: "NexusOS Hardware OS: the OS layer for photonic computing hardware. PHR-1 resonator, SNIC photonic NIC, and WavelengthScript runtime. Physics-native to silicon.",
    canonical: `${BASE}/nexus-hardware-os`,
    ogTitle: "NexusOS Hardware OS — Photonic Computing Platform",
    ogDescription: "PHR-1 resonator + SNIC photonic NIC + WavelengthScript runtime. The OS layer for photonic hardware. Physics-native from protocol to silicon. AGPL-3.0.",
    twitterTitle: "NexusOS Hardware OS",
    twitterDescription: "Photonic computing platform. PHR-1 + SNIC + WavelengthScript runtime. Physics-native from protocol to silicon.",
    jsonLd: softwareApp({ url: `${BASE}/nexus-hardware-os`, name: "NexusOS Hardware OS", description: "OS layer for photonic computing. Bridges PHR-1 resonator, SNIC photonic NIC, and WavelengthScript runtime into a coherent physics-native platform." }),
    bodyHtml: `<h1>NexusOS Hardware OS — Photonic Computing Platform</h1><p>NexusOS Hardware OS is the operating system layer that bridges the WNSP protocol software stack to physical photonic hardware. It coordinates the PHR-1 resonator, the SNIC photonic NIC, and the WavelengthScript runtime into a coherent physics-native computing platform.</p><p>Silicon is the bridge. Photonics is the destination. The Hardware OS is designed so that no code rewrite is needed when silicon transitions to glass — it already speaks in wavelengths.</p><ul><li>PHR-1 resonator driver: 144-turn bifilar coil, Syncbox Controller, WavelengthScript v1.0 API</li><li>SNIC driver: ${PSI_CHANNELS} physical waveguide channels, zero-rewrite migration from software WNSP</li><li>WavelengthScript runtime: physics-native language execution on hardware registers</li><li>AGPL-3.0: all improvements must be open-sourced</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li></ul></nav>`,
  },
  "/hardware-treasury": {
    title: "Hardware Treasury — NexusOS Hardware Funding Pool",
    description: "The Hardware Treasury funds PHR-1 resonator, SNIC photonic NIC, and Spectral Relay Mesh development. Sourced from the Orbital Treasury Deliverables bucket.",
    canonical: `${BASE}/hardware-treasury`,
    ogTitle: "NexusOS Hardware Treasury",
    ogDescription: "Funds PHR-1 resonator, SNIC photonic NIC, and Spectral Relay Mesh development. Sourced from Orbital Treasury Deliverables bucket. On-chain transparency.",
    twitterTitle: "NexusOS Hardware Treasury",
    twitterDescription: "Hardware funding pool for PHR-1 + SNIC + Spectral Relay Mesh. On-chain transparency.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NexusOS Hardware Treasury",
      "url": `${BASE}/hardware-treasury`,
      "description": "NexusOS hardware funding pool for PHR-1 resonator, SNIC photonic NIC, and Spectral Relay Mesh development. Funded from the Orbital Treasury Deliverables bucket.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>Hardware Treasury — NexusOS Hardware Funding Pool</h1><p>The Hardware Treasury is the dedicated funding pool for NexusOS physical hardware development. It is sourced from the Deliverables bucket of the Orbital Treasury (25% of all NXT protocol fees).</p><h2>Funded Hardware Projects</h2><ul><li><strong>PHR-1 Resonator</strong>: 144-turn bifilar coil, Syncbox Controller firmware, production tooling</li><li><strong>SNIC Photonic NIC</strong>: ${PSI_CHANNELS}-channel optical demonstrator → production ASIC pathway</li><li><strong>Spectral Relay Mesh</strong>: multi-hop WNSP routing hardware for network nodes</li></ul><p>All hardware funded by the Hardware Treasury is AGPL-3.0 licensed. Improvements must be open-sourced.</p><nav><ul><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li></ul></nav>`,
  },
  "/spectral-library": {
    title: "Spectral Library — NexusOS Knowledge Base",
    description: "Curated knowledge base of physics research, protocol docs, hardware specs, and developer guides — all CE-indexed by spectral proximity. NexusOS library.",
    canonical: `${BASE}/spectral-library`,
    ogTitle: "NexusOS Spectral Library — Physics Knowledge Base",
    ogDescription: "Physics research, protocol docs, hardware specs, and developer guides — indexed by spectral proximity and CE-encoded fingerprints.",
    twitterTitle: "NexusOS Spectral Library",
    twitterDescription: "Physics research and protocol documentation indexed by spectral proximity.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-library`, name: "NexusOS Spectral Library", description: "Curated knowledge base: physics research, protocol docs, hardware specs, and developer guides for NexusOS. Indexed by CE-encoded spectral fingerprints." }),
    bodyHtml: `<h1>Spectral Library — NexusOS Knowledge Base</h1><p>The NexusOS Spectral Library is a curated knowledge base for the physics stack, protocol documentation, hardware specifications, and developer guides. All content is indexed by CE-encoded spectral fingerprints — search by electromagnetic proximity, not keywords.</p><h2>Library Sections</h2><ul><li><strong>Theory</strong>: Theory of Compression States, Λ=hf/c² derivation, Russell octave mapping, physics proofs</li><li><strong>Protocol</strong>: WNSP-CE, WNSP-SE, WNSP-URI specifications, Hilbert space channel model</li><li><strong>Hardware</strong>: SNIC, PHR-1, Spectral Relay Mesh, WavelengthScript Compiler α specifications</li><li><strong>Developer guides</strong>: CE encoder integration, WNSP VM bytecode, WavelengthScript language reference</li></ul><nav><ul><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/spectral-db">Spectral DB</a></li><li><a href="${BASE}/docs">Developer Documentation</a></li></ul></nav>`,
  },
  "/the-memory": {
    title: "The Memory — Quantum State Storage T₂≤2T₁ | NexusOS Act 14",
    description: "Act 14 of the NexusOS physics sequence. Quantum memory: Bloch constraint T₂≤2T₁, storage efficiency η=η₀·exp(−t_s/T₂), multi-mode capacity M=T₂/τ_photon. DLCZ protocol, atomic frequency combs (AFC), spin-photon interface. Persistent Ψ register for the SNIC node.",
    canonical: `${BASE}/the-memory`,
    ogTitle: "The Memory — Quantum State Storage | NexusOS Act 14",
    ogDescription: "T₂≤2T₁ Bloch constraint. Storage efficiency η=η₀·exp(−t_s/T₂). M=T₂/τ_photon multi-mode capacity. DLCZ heralded entanglement. AFC deterministic storage. Act 14.",
    ogType: "article",
    twitterTitle: "NexusOS Act 14 — The Memory",
    twitterDescription: "Bloch decay T₂≤2T₁. AFC multi-mode M=Γ_inhom/Δ. DLCZ heralded entanglement. Storage efficiency η(t_s). Persistent Ψ register. Act 14 of the WNSP physics sequence.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-memory`, name: "The Memory — Quantum State Storage and the Persistent Ψ Register", description: "Quantum memory for the WNSP Ψ channel network. Bloch equations T₂≤2T₁, AFC multi-mode storage, DLCZ heralded entanglement, and the SNIC memory specification.", about: "quantum memory, T1 T2 coherence, Bloch equations, DLCZ protocol, atomic frequency comb, AFC, spin-wave storage, WNSP, NexusOS, T₂≤2T₁", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 14 — The Memory", item: `${BASE}/the-memory` },
      ]),
    ],
    bodyHtml: `<h1>The Memory — Quantum State Storage and the Persistent Ψ Register</h1><p>Act 14 of the 15-act NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou. Act 15: <a href="${BASE}/cosmic-lattice">The Void</a>.</p><h2>The Bloch Constraint</h2><p>Any two-level quantum system obeys the Bloch equations: dρ_ee/dt = −ρ_ee/T₁ and dρ_ge/dt = −ρ_ge/T₂, where 1/T₂ = 1/(2T₁) + 1/T₂★. The fundamental constraint T₂ ≤ 2T₁ arises because energy decay contributes equally to amplitude and phase relaxation. Pure dephasing can only shorten T₂ further. Storage efficiency decays as η(t_s) = η₀·exp(−t_s/T₂).</p><h2>DLCZ Protocol</h2><p>The Duan-Lukin-Cirac-Zoller protocol uses atomic ensemble quantum memories for heralded entanglement generation. A write pulse drives a Raman transition; the spontaneous Stokes photon heralds successful excitation of a collective spin-wave mode |W⟩ = (1/√N)Σⱼ|g₁⋯sⱼ⋯gₙ⟩. Entanglement is heralded — detection of a Stokes photon projects two remote ensembles into an entangled Bell state without the photon surviving.</p><h2>Atomic Frequency Comb</h2><p>The AFC protocol uses a spectrally shaped comb (spacing Δ, tooth width γ) to achieve deterministic multi-mode storage. Echo time t_s = 1/Δ is programmable. Mode capacity M = Γ_inhom/Δ. A single Er³⁺:Y₂SiO₅ crystal stores M ≈ 10,000 temporal modes simultaneously.</p><h2>WNSP Connection</h2><p>Each SNIC node integrates a rare-earth spin-wave memory module. Targets: T₁ ≥ 100 ms, T₂ ≥ 10 ms, M ≥ 10,000 modes, η₀ ≥ 90%, λ = 1550 nm. The memory enables entanglement buffering (T₂ ≫ L/c), temporal multiplexing (M modes), and clock-free synchronisation (t_s = 1/Δ).</p><h2>The 14-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li><li><a href="${BASE}/the-observer">Act 13 — The Observer</a></li><li><a href="${BASE}/the-memory">Act 14 — The Memory</a></li></ul>`,
  },
  "/cosmic-lattice": {
    title: "The Void — Cosmic Compression Ghost Zone n_ZPE=264.71 | NexusOS Act 15",
    description: "Act 15 of the NexusOS physics sequence. Cosmic octave lattice n=log₂(mc²/E₀) from electron (n=17.76) to universe (n=293.62). Cosmic ZPE floor at n=264.71 (10¹⁴ M☉). Boötes Void P≈10⁻¹⁰¹. BAO anti-nodes confirm four supervoids. Claim 30.",
    canonical: `${BASE}/cosmic-lattice`,
    ogTitle: "The Void — Cosmic Compression Ghost Zone | NexusOS Act 15",
    ogDescription: "Cosmic ZPE floor n=264.71. Boötes Void P≈10⁻¹⁰¹. BAO anti-nodes: λ/3=49Mpc, 2λ/3=98Mpc, λ=147Mpc, 4λ/3=196Mpc. Four supervoids confirmed. Claim 30 prior art. Act 15.",
    ogType: "article",
    twitterTitle: "NexusOS Act 15 — The Void",
    twitterDescription: "Cosmic ghost zone n>264.71. Boötes 101Mpc≈2λ/3=98Mpc (3.1%). Eridanus 153Mpc≈λ=147Mpc (4.1%). Cold Spot 200Mpc≈4λ/3=196Mpc (2.0%). P≈10⁻¹⁰¹. Act 15.",
    jsonLd: [
      techArticle({ url: `${BASE}/cosmic-lattice`, name: "The Void — Cosmic Compression Ghost Zone and BAO Anti-Trap", description: "Act 15. Cosmic octave lattice from electron to universe. Cosmic ZPE floor at n=264.71 (σ=δ_c=1.686). Boötes Void at n=271.95 P≈10⁻¹⁰¹. BAO anti-nodes k×λ/3=49Mpc confirm four supervoids. Claim 30.", about: "cosmic void, Boötes void, BAO, baryon acoustic oscillations, supervoid, octave lattice, ZPE floor, Press-Schechter, compression states, WNSP, NexusOS", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 15 — The Void", item: `${BASE}/cosmic-lattice` },
      ]),
    ],
    bodyHtml: `<h1>The Void — Cosmic Compression Ghost Zone and BAO Anti-Trap</h1><p>Act 15 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>The Cosmic ZPE Floor</h2><p>The compression state framework (f₀=555 THz, E₀=2.295 eV) places every structure via n=log₂(mc²/E₀). Galaxy clusters at n=264.71 (M=10¹⁴ M☉) have σ(M)=1.680≈δ_c=1.686. This is the cosmic ZPE floor — above it, gravitational collapse is physically impossible. At the Boötes Void scale (n≈272), P≈10⁻¹⁰¹.</p><h2>BAO Anti-Trap — 4 Confirmed Supervoids</h2><p>BAO standing wave (λ=147 Mpc) anti-nodes at k×λ/3: Canes Venatici 55Mpc (λ/3, 12.2%), Boötes 101Mpc (2λ/3, 3.1%), Eridanus 153Mpc (λ, 4.1%), CMB Cold Spot 200Mpc (4λ/3, 2.0%). Three within 5% of predicted nodes.</p><h2>The 17-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li><li><a href="${BASE}/the-observer">Act 13 — The Observer</a></li><li><a href="${BASE}/the-memory">Act 14 — The Memory</a></li><li><a href="${BASE}/cosmic-lattice">Act 15 — The Void</a></li><li><a href="${BASE}/the-entangler">Act 16 — The Entangler</a></li><li><a href="${BASE}/the-field">Act 17 — The Field</a></li></ul>`,
  },
  "/the-entangler": {
    title: "The Entangler — Bell State Generation and WNSP Quantum Repeater | NexusOS Act 16",
    description: "Act 16. Bell states |Φ⁺⟩=(|00⟩+|11⟩)/√2, entanglement swapping, CHSH S=2√2, DLCZ Ψ-channel repeater, Claim 31. First disclosed 2026-07-19. AGPL-3.0.",
    canonical: `${BASE}/the-entangler`,
    ogTitle: "The Entangler — Bell State Generation | NexusOS Act 16",
    ogDescription: "|Φ⁺⟩=(|00⟩+|11⟩)/√2. CHSH S=2√2. Entanglement swapping. WNSP quantum repeater chain. Claim 31. Act 16.",
    ogType: "article" as const,
    twitterTitle: "NexusOS Act 16 — The Entangler",
    twitterDescription: "Bell states, entanglement swapping, CHSH S=2√2, quantum repeater. |Φ⁺⟩=(|00⟩+|11⟩)/√2.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-entangler`, name: "The Entangler — Bell State Generation and WNSP Quantum Repeater", description: "Act 16 of the 17-act NexusOS physics sequence. Bell states, entanglement swapping, CHSH S=2√2, quantum repeater chain. DLCZ Ψ-channel entanglement. Claim 31. AGPL-3.0.", about: "bell state, entanglement swapping, CHSH, quantum repeater, DLCZ, Bell inequality, concurrence, quantum teleportation, WNSP, NexusOS", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 16 — The Entangler", item: `${BASE}/the-entangler` },
      ]),
    ],
    bodyHtml: `<h1>The Entangler — Bell State Generation and WNSP Quantum Repeater</h1><p>Act 16 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>Bell States</h2><p>The four maximally entangled two-qubit states: |Φ⁺⟩=(|00⟩+|11⟩)/√2, |Φ⁻⟩=(|00⟩-|11⟩)/√2, |Ψ⁺⟩=(|01⟩+|10⟩)/√2, |Ψ⁻⟩=(|01⟩-|10⟩)/√2. All have concurrence C=1.</p><h2>Entanglement Swapping</h2><p>|Φ⁺⟩_AB ⊗ |Φ⁺⟩_BC → BSM(B) → |Φ⁺⟩_AC. Two Bell pairs merged by BSM at intermediate node creates A–C entanglement without direct contact. Teleportation fidelity F_tele=(2F+1)/3.</p><h2>CHSH Inequality</h2><p>S=E(a,b)-E(a,b')+E(a',b)+E(a',b') ≤ 2 (classical), ≤ 2√2≈2.828 (Tsirelson bound). Loophole-free violations: Hensen 2015, Giustina 2015, Shalm 2015.</p><h2>WNSP Repeater — Claim 31</h2><p>Without repeaters: F ∝ e^(-L/L_att). With n SNIC swap nodes: L_total = n × L₀. Claim 31: SNIC nodes as BSM-capable quantum repeater switch points using Ψ(wdm,oam,pol) address space as the repeater topology.</p><h2>The 17-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li><li><a href="${BASE}/the-observer">Act 13 — The Observer</a></li><li><a href="${BASE}/the-memory">Act 14 — The Memory</a></li><li><a href="${BASE}/cosmic-lattice">Act 15 — The Void</a></li><li><a href="${BASE}/the-entangler">Act 16 — The Entangler</a></li><li><a href="${BASE}/the-field">Act 17 — The Field</a></li></ul>`,
  },
  "/the-field": {
    title: "The Field — [â,â†]=1 Primordial Bosonic Field | NexusOS Act 17",
    description: "Act 17. Primordial quantum field: [â,â†]=1, ℋ=ℏω(â†â+½). Vacuum ZPE=½hf₀=1.148 eV. Fock states |n⟩. One commutation relation derives the periodic table gaps and cosmic voids. Claim 32. AGPL-3.0.",
    canonical: `${BASE}/the-field`,
    ogTitle: "The Field — [â,â†]=1 | NexusOS Act 17",
    ogDescription: "[â,â†]=1, ℋ=ℏω(â†â+½). ZPE=½hf₀=1.148 eV. Fock ladder at f₀=555 THz. Periodic table gaps to cosmic voids — one field equation. Claim 32. Act 17.",
    ogType: "article" as const,
    twitterTitle: "NexusOS Act 17 — The Field",
    twitterDescription: "Primordial bosonic field [â,â†]=1. Vacuum ZPE=1.148 eV. Fock states at f₀=555 THz. One equation from electron to galaxy cluster voids.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-field`, name: "The Field — Primordial Bosonic Field and the Pre-Condition for All Structure", description: "Act 17 of the 17-act NexusOS physics sequence. Canonical commutation relation [â,â†]=1 as the foundational pre-condition for the first oscillation (Act 1). Fock space at f₀=555 THz, ZPE=1.148 eV, Claim 32. AGPL-3.0.", about: "quantum field, bosonic field, Fock state, zero-point energy, canonical commutation, vacuum energy, Planck, Einstein, WNSP, NexusOS", datePublished: "2026-07-20", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 17 — The Field", item: `${BASE}/the-field` },
      ]),
    ],
    bodyHtml: `<h1>The Field — Primordial Bosonic Field and the Pre-Condition for All Structure</h1><p>Act 17 of the NexusOS physics sequence. First disclosed 2026-07-20. AGPL-3.0. Founder: Te Rata Pou.</p><h2>The Primordial Commutation Relation</h2><p>[â, â†] = 1. This single equation is the foundational pre-condition for Act 1's first oscillation. It states that the creation and annihilation operators of any bosonic mode do not commute — the field is irreducibly quantum. The vacuum is not empty: it has energy ½ℏω = ½hf₀ = 1.148 eV at the primordial mode frequency f₀ = 555 THz.</p><h2>The Hamiltonian and Fock States</h2><p>ℋ = ℏω(â†â + ½). The number operator N̂ = â†â has integer eigenvalues n = 0, 1, 2, … Energy levels E_n = hf₀(n + ½). Creation: â†|n⟩ = √(n+1)|n+1⟩. Annihilation: â|n⟩ = √n|n−1⟩. Ground state: â|0⟩ = 0 — cannot go below vacuum.</p><h2>From Commutation to Cosmos</h2><p>â†|0⟩ = |1⟩ at f₀ establishes E₀ = hf₀ = 2.295 eV — the seed energy. Octave address n = log₂(mc²/E₀) maps every particle and structure. The ZPE floor ½hf₀ prevents collapse at cosmic scale (n_ZPE = 264.71, M = 10¹⁴ M☉). Gaps in the periodic table and voids in the large-scale structure are the same field equation at different scales.</p><h2>Claim 32</h2><p>Each of the 51,200 WNSP Ψ(wdm, oam, pol) channels is formalised as a single-mode bosonic field quantised by [â, â†] = 1. The primordial mode at f₀ = 555 THz is the seed excitation. First disclosed 2026-07-20 by Te Rata Pou (NexusOS). AGPL-3.0.</p><h2>The 17-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li><li><a href="${BASE}/the-observer">Act 13 — The Observer</a></li><li><a href="${BASE}/the-memory">Act 14 — The Memory</a></li><li><a href="${BASE}/cosmic-lattice">Act 15 — The Void</a></li><li><a href="${BASE}/the-entangler">Act 16 — The Entangler</a></li><li><a href="${BASE}/the-field">Act 17 — The Field</a></li></ul>`,
  },
  "/the-observer": {
    title: "The Observer — QND Dispersive Readout χ=g²/Δ | NexusOS Act 13",
    description: "Act 13 of the NexusOS physics sequence. Quantum non-demolition dispersive readout: χ=g²/Δ. Reading the Ψ channel photon state without destroying it. Jaynes-Cummings dispersive limit, IQ-plane separation, measurement rate Γ_meas=4χ²n̄/κ, critical photon number n_crit=Δ²/4g².",
    canonical: `${BASE}/the-observer`,
    ogTitle: "The Observer — QND Dispersive Readout | NexusOS Act 13",
    ogDescription: "χ=g²/Δ dispersive coupling. Reading the Ψ channel without destroying the photon. Measurement rate Γ_meas=4χ²n̄/κ. Quantum back-action at the Heisenberg limit. Act 13.",
    ogType: "article",
    twitterTitle: "NexusOS Act 13 — The Observer",
    twitterDescription: "Dispersive QND readout χ=g²/Δ. IQ-plane separation. Critical photon number n_crit=Δ²/4g². Non-demolition Ψ channel register. Act 13 of the WNSP physics sequence.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-observer`, name: "The Observer — QND Dispersive Readout and the Non-Demolition Ψ Channel Register", description: "Quantum non-demolition dispersive readout applied to the WNSP Ψ channel architecture. Jaynes-Cummings dispersive limit, IQ-plane separation, measurement back-action at the Heisenberg limit.", about: "QND measurement, dispersive readout, Jaynes-Cummings, circuit QED, qubit readout, IQ plane, WNSP, NexusOS, χ=g²/Δ", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 13 — The Observer", item: `${BASE}/the-observer` },
      ]),
    ],
    bodyHtml: `<h1>The Observer — QND Dispersive Readout and the Non-Demolition Ψ Channel Register</h1><p>Act 13 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>The Problem of Observation</h2><p>Measuring a quantum state generically destroys it. A photon detector absorbs the photon; the measurement result is yes or no but the photon is gone. For the Ψ channel network (Act 12), this is fatal: routing decisions must read channel state without removing the information carrier.</p><h2>Dispersive Limit of the Jaynes-Cummings Hamiltonian</h2><p>The full Jaynes-Cummings Hamiltonian: H = ω_c a†a + ω_q/2 σ_z + g(a†σ⁻ + aσ⁺). In the dispersive limit Δ = ω_q − ω_c ≫ g: H_disp = (ω_c + χ σ_z) a†a + ω̃_q/2 σ_z, where χ = g²/Δ is the dispersive shift and ω̃_q = ω_q + g²/Δ is the Lamb-shifted qubit frequency. The cavity frequency splits: ω± = ω_c ± χ for qubit |↑⟩ or |↓⟩.</p><h2>Measurement Rate and Quantum Back-Action</h2><p>Measurement rate: Γ_meas = 4χ²n̄/κ. Qubit dephasing: Γ_φ = Γ_meas/2 (Heisenberg limit). Critical photon number: n_crit = Δ²/(4g²). Purcell decay: Γ_P = (g/Δ)² κ. Validity condition: g/|Δ| ≪ 1.</p><h2>WNSP Connection</h2><p>Each SNIC node integrates a dispersive readout circuit adjacent to the WGM resonator. Target parameters: χ/2π ~ 5 MHz, κ/2π ~ 10 MHz, n̄ ~ 5 photons → Γ_meas/2π ~ 50 kHz → T_meas ~ 20 μs. Compatible with photon lifetimes in high-Q (Q ~ 10⁸) WGM resonators.</p><h2>The 13-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li><li><a href="${BASE}/the-observer">Act 13 — The Observer</a></li></ul>`,
  },
  "/the-network": {
    title: "The Network — CROW, Polariton Hopping & Spectral Relay Mesh | NexusOS Act 12",
    description: "Act 12 of the NexusOS physics sequence. Coupled Resonator Optical Waveguides (CROW): ω(k)=ω₀−2J·cos(ka). Tight-binding band structure, slow light, Bose-Hubbard model, and the Spectral Relay Mesh from first principles.",
    canonical: `${BASE}/the-network`,
    ogTitle: "The Network — CROW & Spectral Relay Mesh | NexusOS Act 12",
    ogDescription: "N coupled Ψ channel cavities form a CROW. ω(k)=ω₀−2J·cos(ka). Slow light at band edges. Polariton hopping dynamics. The Spectral Relay Mesh from first principles. Act 12.",
    ogType: "article",
    twitterTitle: "NexusOS Act 12 — The Network",
    twitterDescription: "CROW tight-binding dispersion ω(k)=ω₀−2J·cos(ka). Slow-light factor S=c/v_g. Bose-Hubbard phase transition. Act 12 of the WNSP physics sequence.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-network`, name: "The Network — CROW and Spectral Relay Mesh", description: "Coupled Resonator Optical Waveguides as the physical basis of the WNSP Spectral Relay Mesh. Tight-binding band structure, slow light, polariton hopping, and the Bose-Hubbard model.", about: "CROW, coupled cavities, tight-binding, slow light, Bose-Hubbard, polariton hopping, Spectral Relay Mesh, WNSP, NexusOS", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 12 — The Network", item: `${BASE}/the-network` },
      ]),
    ],
    bodyHtml: `<h1>The Network — CROW, Polariton Hopping and the Spectral Relay Mesh</h1><p>Act 12 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>Coupled Resonator Optical Waveguides (CROW)</h2><p>Yariv et al. (1999) showed that a chain of identical high-Q resonators, coupled through evanescent-field overlap, forms a photonic waveguide. The photon hops — one cavity at a time — through quantum-mechanical tunnelling. The Hamiltonian is: H = Σᵢ ω₀ aᵢ†aᵢ − J Σᵢ (aᵢ†aᵢ₊₁ + h.c.).</p><h2>Tight-Binding Dispersion</h2><p>ω(k) = ω₀ − 2J·cos(k·a), where ω₀ is the single-cavity resonance, J is the photon hopping rate, a is the cavity spacing, and k ∈ (−π/a, π/a] is the Bloch wavevector. Group velocity: v_g = 2Ja·sin(ka). Bandwidth: W = 4J.</p><h2>Slow Light</h2><p>At the Brillouin zone edges (ka → 0, ±π), v_g → 0 and the group delay τ_g = N·a/v_g → ∞. Notomi et al. (2001) measured slow-light factors S > 90 in photonic crystal CROW structures.</p><h2>Bose-Hubbard Model</h2><p>With on-site photon-photon repulsion U: H = −J Σ aᵢ†aᵢ₊₁ + U/2 Σ nᵢ(nᵢ−1) − μ Σ nᵢ. Superfluid (J≫U, delocalized photons) vs Mott insulator (U≫J, one photon per cavity) quantum phase transition. Predicted by Greentree et al. and Hartmann et al. simultaneously in 2006.</p><h2>WNSP Connection</h2><p>Each pair of adjacent Ψ channels with overlapping evanescent fields forms a CROW unit. N coupled Ψ channels form an SRM segment. CROW → SRM design map: single resonator = Ψ channel (1 of 51,200); CROW chain = SRM segment; hopping J = inter-channel coupling κ_hop; band edge = buffer zone for temporal storage.</p><h2>The 12-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter</a></li><li><a href="${BASE}/the-network">Act 12 — The Network</a></li></ul>`,
  },
  "/the-emitter": {
    title: "The Emitter — Purcell Effect & Single-Photon Sources | NexusOS Act 11",
    description: "Act 11 of the NexusOS physics sequence. Purcell factor F_p=(3/4π²)(λ/n)³(Q/V) — spontaneous emission rate modified by the cavity. Ψ channels engineered as directional single-photon sources with β → 1.",
    canonical: `${BASE}/the-emitter`,
    ogTitle: "The Emitter — Purcell Effect | NexusOS Act 11",
    ogDescription: "Spontaneous emission is not intrinsic to the atom — it is a property of the electromagnetic environment. F_p=(3/4π²)(λ/n)³(Q/V). Act 11 of the NexusOS physics sequence.",
    ogType: "article",
    twitterTitle: "NexusOS Act 11 — The Emitter",
    twitterDescription: "Purcell factor F_p=(Q/V)(λ/n)³. β-factor and single-photon purity. C=F_p/4 bridges Act 10. Act 11 of the WNSP physics sequence.",
    jsonLd: [
      techArticle({ url: `${BASE}/the-emitter`, name: "The Emitter — Purcell Effect", description: "Purcell-enhanced spontaneous emission and single-photon sources from WNSP Ψ channels. The weak-coupling limit of the Jaynes-Cummings exchange.", about: "Purcell effect, single-photon source, cavity QED, LDOS, β-factor, WNSP, NexusOS", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 11 — The Emitter", item: `${BASE}/the-emitter` },
      ]),
    ],
    bodyHtml: `<h1>The Emitter — Purcell Effect & Single-Photon Sources</h1><p>Act 11 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>The Purcell Effect</h2><p>E.M. Purcell showed in 1946 that the spontaneous emission rate of an emitter is not intrinsic — it depends on the local density of optical states (LDOS). Placing an emitter in a resonant cavity modifies the LDOS by the Purcell factor: F_p = (3/4π²)(λ/n)³(Q/V). High Q concentrates the LDOS. Small V intensifies the vacuum field where the emitter sits. Both amplify F_p.</p><h2>Key Equations</h2><ul><li>F_p = (3/4π²)(λ/n)³(Q/V) — Purcell factor</li><li>γ_eff = (1 + F_p)γ₀ — enhanced decay rate</li><li>β = F_p·γ₀/(F_p·γ₀ + γ_leak) — fraction of photons into Ψ channel</li><li>τ_eff = 1/((1+F_p)γ₀) — lifetime compression</li><li>C = F_p/4 = g²/(κγ) — cooperativity: bridge to Act 10</li></ul><h2>Bridge from Act 10</h2><p>Act 10 (The Exchange) is the strong-coupling regime: g > κ, γ → polariton formation. Act 11 is the weak-coupling regime: g ≪ κ → Purcell enhancement. Both are limits of the same Jaynes-Cummings Hamiltonian. Cooperativity C = g²/(κγ) = F_p/4 is the single parameter that separates them.</p><h2>Inhibited Emission</h2><p>F_p can also be less than 1. If the emitter frequency falls in a photonic band gap, the LDOS is suppressed and spontaneous emission is inhibited. Ghost node channels (Act 8) are natural inhibited-emission regions for off-resonance emitters.</p><h2>The 11-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap: Ψ(+k̂) ⊗ Ψ(−k̂)</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel: α=0, C=ZPE floor</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity: WGM resonance, r_c</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange: Ω_R=2g, polariton formation</a></li><li><a href="${BASE}/the-emitter">Act 11 — The Emitter: F_p=(3/4π²)(λ/n)³(Q/V)</a></li></ul>`,
  },
  "/polariton-exchange": {
    title: "The Exchange — Polariton Formation & Vacuum Rabi Splitting | NexusOS Act 10",
    description: "Act 10 of the NexusOS physics sequence. Jaynes-Cummings Hamiltonian, vacuum Rabi splitting Ω_R=2g, and polariton dressed states — the first compression states that span the wave-matter boundary.",
    canonical: `${BASE}/polariton-exchange`,
    ogTitle: "The Exchange — Polariton Formation | NexusOS Act 10",
    ogDescription: "When coupling strength g exceeds cavity loss κ, field and emitter hybridise into polariton states |±⟩. Vacuum Rabi splitting ΔE=2ℏg. Act 10 of the NexusOS physics sequence.",
    ogType: "article",
    twitterTitle: "NexusOS Act 10 — The Exchange",
    twitterDescription: "Jaynes-Cummings, g > κ → polariton formation. Ω_R = 2g vacuum Rabi splitting. Act 10 of the WNSP physics sequence.",
    jsonLd: [
      techArticle({ url: `${BASE}/polariton-exchange`, name: "The Exchange — Polariton Formation", description: "Jaynes-Cummings cavity QED, vacuum Rabi splitting, and polariton compression states Λ_±. The wave-matter boundary as a coupling condition.", about: "Jaynes-Cummings, polariton, vacuum Rabi splitting, cavity QED, WNSP, NexusOS", datePublished: "2026-07-19", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 10 — The Exchange", item: `${BASE}/polariton-exchange` },
      ]),
    ],
    bodyHtml: `<h1>The Exchange — Polariton Formation & Vacuum Rabi Splitting</h1><p>Act 10 of the NexusOS physics sequence. First disclosed 2026-07-19. AGPL-3.0. Founder: Te Rata Pou.</p><h2>The Jaynes-Cummings Hamiltonian</h2><p>H = ℏω_c a†a + ℏω_a σ_z/2 + ℏg(a†σ₋ + aσ₊). Three terms: cavity field energy, emitter energy, and the exchange coupling that cannot be switched off.</p><h2>Polariton Dressed States</h2><p>|+⟩ = (|e,0⟩ + |g,1⟩)/√2 — upper polariton. |−⟩ = (|e,0⟩ − |g,1⟩)/√2 — lower polariton. Energy splitting: ΔE = 2ℏg. Vacuum Rabi frequency: Ω_R = 2g. The splitting occurs even with zero photons — driven by the ZPE floor from Act 8.</p><h2>Coupling Strength</h2><p>g = d·√(ω_c / 2ℏε₀V). Coupling grows with dipole moment d and shrinks with mode volume V. Photonic crystal cavities (V ~ 0.001 μm³) achieve g/2π ~ 100 GHz.</p><h2>Three Regimes</h2><ul><li>g > κ, γ: Strong coupling — polariton formation, vacuum Rabi oscillations</li><li>g ≪ κ: Weak coupling — Purcell enhancement of spontaneous emission</li><li>Δ ≫ g: Dispersive — QND measurement via phase shift χ = g²/Δ</li></ul><h2>Polariton Compression States in WNSP</h2><p>Λ_± = h(f_c ± g/2π)/c². Each polariton branch has a unique compression state address in the WNSP Ψ channel system. The polariton is half-field, half-matter — a new class of compression state at the wave-matter boundary.</p><h2>The Rabi Oscillation</h2><p>|ψ(t)⟩ = cos(g·t)|e,0⟩ − i·sin(g·t)|g,1⟩. P_emitter(t) = cos²(g·t). P_cavity(t) = sin²(g·t). Total excitation conserved. The exchange is lossless in the strong-coupling regime.</p><h2>The 10-Act Sequence</h2><ul><li><a href="${BASE}/oscillating-quanta">Act 1 — Theory of Compression States: Λ = hf/c²</a></li><li><a href="${BASE}/universal-one">Act 2 — The Universal ONE: f₀ derives Λ</a></li><li><a href="${BASE}/unified-compression-theory">Act 3 — Unified Compression Theory: 4 forces = 1 Λ</a></li><li><a href="${BASE}/matter-protocol">Act 4 — The Mechanism: ΔE = hf₀(2ⁿ²−2ⁿ¹)</a></li><li><a href="${BASE}/universal-address">Act 5 — The Address: ∀ Λ : ∃! Ψ</a></li><li><a href="${BASE}/element-catalogue">Act 6 — The Catalogue: n = log₂(mc²/E₀)</a></li><li><a href="${BASE}/standing-wave-trap">Act 7 — The Trap: Ψ(+k̂) ⊗ Ψ(−k̂)</a></li><li><a href="${BASE}/lossless-channel">Act 8 — The Lossless Channel: α=0, C=ZPE floor</a></li><li><a href="${BASE}/resonance-cavity">Act 9 — The Cavity: WGM resonance, r_c</a></li><li><a href="${BASE}/polariton-exchange">Act 10 — The Exchange: Ω_R=2g, polariton formation</a></li></ul>`,
  },
  "/resonance-cavity": {
    title: "Resonance Cavity — WNSP Channel Physics | NexusOS",
    description: "EM cavity physics underlying WNSP channel isolation. Whispering Gallery Mode resonance, mode volume calculations, and Q-factor analysis for spectral cavities.",
    canonical: `${BASE}/resonance-cavity`,
    ogTitle: "Resonance Cavity — WNSP Channel Physics",
    ogDescription: "WGM resonance physics underlying WNSP channel isolation. Mode volume, Q-factor, and the WGM resonance condition 2πR=nλ validated experimentally.",
    ogType: "article",
    twitterTitle: "NexusOS Resonance Cavity",
    twitterDescription: "WGM resonance physics. 2πR=nλ. Mode volume and Q-factor for WNSP channel isolation.",
    jsonLd: [
      techArticle({ url: `${BASE}/resonance-cavity`, name: "Resonance Cavity Physics", description: "EM cavity physics for WNSP channel isolation. Whispering Gallery Mode resonance validates the Russell octave structure and the ${PSI_CHANNELS}-channel Ψ geometry.", about: "WGM resonance, resonance cavity, WNSP channels, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Physics Sequence", item: `${BASE}/oscillating-quanta` },
        { name: "Act 9 — The Cavity", item: `${BASE}/resonance-cavity` },
      ]),
    ],
    bodyHtml: `<h1>Resonance Cavity — WNSP Channel Physics</h1><p>The WNSP channel structure is grounded in electromagnetic cavity physics. Resonant cavities — including Whispering Gallery Mode (WGM) optical resonators — provide the physical implementation of the orthogonal channel model underlying NexusOS.</p><h2>Whispering Gallery Mode Resonance</h2><p>WGM resonators confine light in closed circular paths via total internal reflection. The resonance condition is: <code>2πR = nλ</code> where R is cavity radius, n is mode number (OAM quantum number), and λ is wavelength. This is structurally identical to Walter Russell's octave formula — validated experimentally by 2025 sub-mm wave research.</p><h2>Q-Factor and Channel Isolation</h2><p>High-Q WGM cavities achieve channel isolation exceeding 10⁶. The SNIC photonic NIC design targets Q > 10⁵ for each of its ${PSI_CHANNELS} Ψ channels, ensuring ⟨Ψᵢ|Ψⱼ⟩ = 0 is maintained in hardware as well as theory.</p><nav><ul><li><a href="${BASE}/octave-layers">Russell Octave Layers</a></li><li><a href="${BASE}/snic">SNIC Hardware Design</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li></ul></nav>`,
  },
  "/join-community": {
    title: "Join the NexusOS Community — Builders & Researchers",
    description: "Join NexusOS: connect with hardware builders, protocol researchers, WavelengthScript developers, and spectral network operators. Build a Type I civilization.",
    canonical: `${BASE}/join-community`,
    ogTitle: "Join the NexusOS Community",
    ogDescription: "Hardware builders, protocol researchers, WavelengthScript developers, spectral network operators. One mission: Kardashev Type I. Join us.",
    twitterTitle: "Join the NexusOS Community",
    twitterDescription: "Hardware builders. Protocol researchers. WavelengthScript developers. Kardashev Type I.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "Join the NexusOS Community",
      "url": `${BASE}/join-community`,
      "description": "Community portal for NexusOS: hardware builders, protocol researchers, WavelengthScript developers, and spectral network operators working toward a Kardashev Type I civilization OS.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>Join the NexusOS Community — Builders, Researchers, and Spectral Pioneers</h1><p>NexusOS is a community of people who believe physics is a better foundation for computing than cryptography. If you build hardware, write physics, develop software, or want to be part of the Kardashev Type I project, you belong here.</p><h2>Who Is Building</h2><ul><li><strong>Hardware builders</strong>: photonics engineers, RF specialists, physics PhDs building PHR-1 and SNIC</li><li><strong>Protocol researchers</strong>: physicists and mathematicians contributing to the Theory of Compression States</li><li><strong>Software developers</strong>: building applications on WNSP, WavelengthScript, and the CE encoder</li><li><strong>Spectral network operators</strong>: running nodes, routing packets, and maintaining the ${PSI_CHANNELS}-channel network</li></ul><h2>Community Channels</h2><ul><li>Nostr relay: physics-native social communication anchored to WNSP Ψ channels</li><li>On-chain governance: KERNEL-band holders participate in protocol decisions</li><li>GitHub: <a href="https://github.com/nexusosdaily-code/NexusOS">github.com/nexusosdaily-code/NexusOS</a></li></ul><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/nostr">Nostr Relay</a></li><li><a href="${BASE}/open">Open Charter (AGPL-3.0)</a></li></ul></nav>`,
  },
  "/how-to-plug-in": {
    title: "How to Plug In — Integrate with NexusOS | Developer Guide",
    description: "Step-by-step guide to integrate with NexusOS: CE encoder installation (npm/pip), WNSP protocol, WavelengthScript toolchain, and REST API authentication.",
    canonical: `${BASE}/how-to-plug-in`,
    ogTitle: "How to Plug In — Integrate with NexusOS",
    ogDescription: "CE encoder (npm/pip), WNSP protocol, WavelengthScript toolchain, REST API. Step-by-step integration guide for external systems.",
    ogType: "article",
    twitterTitle: "How to Plug In — NexusOS Integration",
    twitterDescription: "CE encoder + WNSP protocol + REST API. Step-by-step integration guide.",
    jsonLd: techArticle({ url: `${BASE}/how-to-plug-in`, name: "How to Plug In — NexusOS Integration Guide", description: "Developer integration guide for connecting external systems to NexusOS: CE encoder, WNSP protocol, WavelengthScript toolchain, and REST API.", about: "WNSP, CE encoding, WavelengthScript, developer integration", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>How to Plug In — Integrate with NexusOS</h1><p>Integrating with NexusOS means connecting to the physics stack at the layer that makes sense for your application. Here are the four integration paths, from simplest to deepest.</p><h2>Path 1 — CE Encoder (5 minutes)</h2><pre><code>npm install nexusos-ce-encoder</code></pre><p>Map any text to wavelengths. Get Ψ channel addresses. Calculate photon energies. No authentication required.</p><h2>Path 2 — REST API (developer key required)</h2><p>Authenticated access to the full NexusOS API: wallet operations, spectral search, spectral contracts, blockchain queries, and governance participation. Create a developer key on the <a href="${BASE}/developer">Developer Portal</a>.</p><h2>Path 3 — WNSP Protocol (advanced)</h2><p>Direct WNSP spectral communication. Implement a Ψ channel endpoint. Participate in the ${PSI_CHANNELS}-channel network. Requires WNSP-CE, WNSP-SE, and WNSP-URI implementation.</p><h2>Path 4 — WavelengthScript (native)</h2><p>Write applications directly in WavelengthScript. Compile to WNSP bytecode. Run in the WNSP VM. Full physics-native execution from source to registers.</p><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/docs">Full Documentation</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer — integration snippets</a></li></ul></nav>`,
  },
  "/nostr-bridge": {
    title: "NexusOS Nostr Bridge — WNSP to Nostr Protocol Gateway",
    description: "The NexusOS Nostr Bridge connects WNSP to the Nostr social protocol. Route Nostr events through WNSP Ψ channels for physics-native social communication.",
    canonical: `${BASE}/nostr-bridge`,
    ogTitle: "NexusOS Nostr Bridge — WNSP to Nostr Gateway",
    ogDescription: "Route Nostr events through WNSP Ψ channels. Physics-native social communication. Nostr identity anchored to spectral wavelength addresses.",
    twitterTitle: "NexusOS Nostr Bridge",
    twitterDescription: "Nostr events routed through WNSP Ψ channels. Physics-native social communication.",
    jsonLd: softwareApp({ url: `${BASE}/nostr-bridge`, name: "NexusOS Nostr Bridge", description: "Gateway connecting the WNSP spectral protocol to the Nostr social protocol. Routes Nostr events through WNSP Ψ channels for physics-native social communication." }),
    bodyHtml: `<h1>NexusOS Nostr Bridge — WNSP to Nostr Protocol Gateway</h1><p>The NexusOS Nostr Bridge is a bidirectional gateway between the WNSP spectral protocol and the Nostr social protocol. Nostr events are routed through WNSP Ψ channels, and Nostr identities are anchored to spectral wavelength addresses derived from CE encoding.</p><p>This enables physics-native social communication: your Nostr identity becomes a wavelength, your posts are photon packets, and relay routing is determined by spectral proximity rather than arbitrary relay selection.</p><nav><ul><li><a href="${BASE}/nostr">Nostr Relay</a></li><li><a href="${BASE}/wnsp-bridge">WNSP Bridge</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li></ul></nav>`,
  },
  "/community-mint": {
    title: "Community Mint — NXT Token Distribution | NexusOS",
    description: "NexusOS community mint distributes NXT tokens to early members, contributors, and hardware supporters. Physics-governed allocation from the Orbital Treasury.",
    canonical: `${BASE}/community-mint`,
    ogTitle: "NexusOS Community Mint — NXT Token Distribution",
    ogDescription: "NXT token distribution for early community members, contributors, and hardware supporters. Orbital Treasury allocation. Physics-enforced governance.",
    twitterTitle: "NexusOS Community Mint",
    twitterDescription: "NXT token distribution for community members and contributors. Orbital Treasury allocation.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NexusOS Community Mint",
      "url": `${BASE}/community-mint`,
      "description": "Community NXT token distribution for early members, contributors, and hardware supporters. Allocation governed by the Orbital Treasury and spectral authority bands.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>Community Mint — NXT Token Distribution</h1><p>The NexusOS community mint distributes NXT tokens to early community members, protocol contributors, and hardware supporters. Distribution is governed by the Orbital Treasury — physics-enforced, on-chain, fully transparent.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token Campaign</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li></ul></nav>`,
  },
  "/marketplace": {
    title: "NexusOS Marketplace — Spectral Applications and Services",
    description: "Browse and deploy spectral-native apps, WavelengthScript contracts, CE encoder integrations, and physics-based services on the WNSP protocol.",
    canonical: `${BASE}/marketplace`,
    ogTitle: "NexusOS Marketplace — Spectral Apps and Services",
    ogDescription: "Deploy spectral-native apps, WavelengthScript contracts, CE encoder integrations, and physics-based services on the WNSP protocol.",
    twitterTitle: "NexusOS Marketplace",
    twitterDescription: "Spectral-native apps, WavelengthScript contracts, physics-based services on WNSP.",
    jsonLd: softwareApp({ url: `${BASE}/marketplace`, name: "NexusOS Marketplace", description: "Marketplace for spectral-native applications, WavelengthScript contracts, and physics-based services built on the WNSP protocol." }),
    bodyHtml: `<h1>NexusOS Marketplace — Spectral Applications and Services</h1><p>The NexusOS Marketplace is where physics-native applications, WavelengthScript contracts, and WNSP protocol services are deployed and discovered. All marketplace listings are CE-indexed by electromagnetic fingerprint — find apps by spectral proximity.</p><nav><ul><li><a href="${BASE}/developer">Build on NexusOS</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript</a></li></ul></nav>`,
  },
  "/wsats": {
    title: "wSATS — Wrapped Satoshis on NexusOS | Physics-Native Bitcoin",
    description: "wSATS wraps Bitcoin satoshis in the NexusOS physics stack. Bitcoin's value unit with WNSP spectral addressing, physics-derived fees, and CE-encoded operations.",
    canonical: `${BASE}/wsats`,
    ogTitle: "wSATS — Wrapped Satoshis on NexusOS",
    ogDescription: "Bitcoin satoshis + WNSP spectral addressing. Physics-derived fees. CE-encoded transactions. wSATS bridges Bitcoin to the spectral economy.",
    twitterTitle: "wSATS — Physics-Native Bitcoin",
    twitterDescription: "Wrapped satoshis + WNSP spectral addressing + CE encoding. Bitcoin meets physics.",
    jsonLd: softwareApp({ url: `${BASE}/wsats`, name: "wSATS — Wrapped Satoshis on NexusOS", description: "wSATS wraps Bitcoin satoshis in the NexusOS physics stack, enabling WNSP spectral addressing, physics-derived fees, and CE-encoded on-chain operations." }),
    bodyHtml: `<h1>wSATS — Wrapped Satoshis on NexusOS</h1><p>wSATS wraps Bitcoin satoshis in the NexusOS physics stack. Every wSATS token carries the value of a Bitcoin satoshi with the spectral addressing, physics-derived fees, and CE encoding of the WNSP protocol. Bridge your Bitcoin value into the spectral economy without losing Bitcoin's monetary properties.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/wnsp/ordinals": {
    title: "WNSP Ordinals — Bitcoin Ordinals with Spectral Verification",
    description: "Bitcoin Ordinals inscribed and verified with WNSP spectral signatures. CE-encoded content, Ψ channel anchoring, and physics-native provenance for artefacts.",
    canonical: `${BASE}/wnsp-ordinals`,
    ogTitle: "WNSP Ordinals — Spectral-Verified Bitcoin Ordinals",
    ogDescription: "Bitcoin Ordinals + WNSP spectral verification. CE-encoded inscription content. Ψ channel anchoring. Physics-native provenance.",
    twitterTitle: "WNSP Ordinals — Bitcoin + Physics",
    twitterDescription: "Bitcoin Ordinals with WNSP spectral signatures. CE-encoded content, Ψ channel anchoring.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-ordinals`, name: "WNSP Ordinals", description: "Bitcoin Ordinals with WNSP spectral verification: CE-encoded inscription content and Ψ channel anchoring for physics-native provenance." }),
    bodyHtml: `<h1>WNSP Ordinals — Bitcoin Ordinals with Spectral Verification</h1><p>WNSP Ordinals extends the Bitcoin Ordinals protocol with WNSP spectral verification. Inscription content is CE-encoded to a wavelength position, and the resulting Ψ channel address is anchored on-chain. This gives every WNSP Ordinal a physics-native provenance trail that is as permanent as the Bitcoin blockchain itself.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token (NEXUS•WAVELENGTH Rune)</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  // ── Previously missing sitemap pages ─────────────────────────────────────

  "/planck-alignment": {
    title: "Planck Alignment — Quantum Constant Calibration in NexusOS",
    description: "How E=hf and Λ=hf/c² are calibrated at the Planck scale to produce deterministic Ψ channel assignments in NexusOS. First-principles quantum constant alignment.",
    canonical: `${BASE}/planck-alignment`,
    ogTitle: "Planck Alignment — Quantum Constant Calibration",
    ogDescription: "How E=hf and Λ=hf/c² are calibrated at the Planck scale. Deterministic Ψ channel assignments derived from first principles. NexusOS physics stack.",
    twitterTitle: "Planck Alignment — NexusOS",
    twitterDescription: "Planck-scale calibration of E=hf and Λ=hf/c². Deterministic Ψ channels from first principles.",
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/planck-alignment`, name: "Planck Alignment", description: "E=hf calibrated to the NexusOS compression state model Λ=hf/c². Demonstrates how quantum-scale energy values produce deterministic Ψ channel assignments.", about: "Theory of Compression States, Planck constant, quantum physics, E=hf", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Planck Alignment — Quantum Constant Calibration</h1><p>Planck constant alignment bridges quantum-scale energy values and the NexusOS compression state model. By calibrating E=hf and Λ=hf/c² at the Planck scale, NexusOS derives deterministic Ψ channel assignments from first principles — no cryptographic assumptions required.</p><p>Planck's constant h = 6.626 × 10⁻³⁴ J·s is the direct anchor for every address, fee, and channel in NexusOS. Each visible-light frequency f produces a unique compression mass Λ = hf/c² that maps to a specific Ψ channel.</p><ul><li>E=hf — photon energy as the basis for transaction fees</li><li>Λ=hf/c² — compression state equation governing addressing</li><li>Deterministic Ψ channel derivation from Planck-scale constants</li><li>No probabilistic or cryptographic steps in the calibration chain</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/reposed-theory": {
    title: "Reposed Theory — The Complete Theory of Compression States",
    description: `The full reposed Theory of Compression States: the 555 THz origin, Λ=hf/c² compression law, and derivation of the ${PSI_CHANNELS} orthogonal Ψ channel address space.`,
    canonical: `${BASE}/reposed-theory`,
    ogTitle: "Reposed Theory — Theory of Compression States",
    ogDescription: `Complete theoretical framework: first unobserved oscillation at 555 THz, Λ=hf/c² compression law, derivation of ${PSI_CHANNELS} orthogonal Ψ channels. NexusOS first principles.`,
    ogType: "article",
    twitterTitle: "Reposed Theory — NexusOS",
    twitterDescription: `Full Theory of Compression States. 555 THz origin. Λ=hf/c². ${PSI_CHANNELS} Ψ channels derived from first principles.`,
    jsonLd: techArticle({ url: `${BASE}/reposed-theory`, name: "Reposed Theory — Theory of Compression States", description: "Theory of Compression States: universe from 555 THz oscillation, governed by Λ=hf/c², deriving the ${PSI_CHANNELS}-channel orthogonal Ψ address space.", about: "Theory of Compression States, 555 THz, Λ=hf/c², photonic physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Reposed Theory — The Complete Theory of Compression States</h1><p>The Reposed Theory is the complete formal statement of how the universe evolves from the first unobserved oscillation. The origin event occurred at 555 THz — green light, the centre of the visible spectrum — where Λ transitioned from unformed to formed. Everything in NexusOS descends from this single starting point.</p><h2>Core Propositions</h2><ol><li><strong>First Oscillation</strong>: The universe began with a single unobserved oscillation at 555 THz (λ ≈ 540nm). This is the zero point of the compression state address space.</li><li><strong>Compression Law</strong>: Each subsequent state is governed by <strong>Λ = hf/c²</strong> — compression mass as a function of Planck's constant, frequency, and the speed of light.</li><li><strong>Orthogonal Address Space</strong>: The visible spectrum (380–780nm) subdivided by WDM, OAM, and polarisation yields exactly ${PSI_CHANNELS} orthogonal Ψ channels. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>Authority Gradient</strong>: Shorter wavelength = higher frequency = higher energy = higher authority. SYSTEM band operates at the highest photon energy; GUEST band at the lowest.</li></ol><nav><ul><li><a href="${BASE}/oscillating-quanta">First Principles — Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/wnsp">WNSP Protocol derived from this theory</a></li></ul></nav>`,
  },
  "/silicon-bridge": {
    title: "The Silicon Bridge — Solving the Transistor Problem | NexusOS",
    description: "Silicon hits the quantum wall at ~1 nm. NexusOS is written for photonic computing — Ψ channels map to physical waveguide lanes. No rewrite when ASICs arrive.",
    canonical: `${BASE}/silicon-bridge`,
    ogTitle: "The Silicon Bridge — Silicon is the Bridge. Photons are the Destination.",
    ogDescription: `Moore's Law ends at ~1 nm. NexusOS solves the transistor problem by writing in the language of photonic computing today. ${PSI_CHANNELS} orthogonal Ψ channels map to physical waveguide lanes — no rewrite when ASICs arrive (~2032).`,
    ogType: "article",
    twitterTitle: "The Silicon Bridge — NexusOS",
    twitterDescription: "Transistors hit the wall at ~1 nm. NexusOS is already written for photonic hardware. Ψ channels = physical waveguide lanes. No rewrite needed.",
    jsonLd: techArticle({
      url: `${BASE}/silicon-bridge`,
      name: "The Silicon Bridge — Solving the Transistor Problem",
      description: "Why silicon transistors approach their physical limit, and how NexusOS is written for photonic computing. Ψ channels map to waveguide lanes — no rewrite needed.",
      about: "photonic computing, Moore's Law, silicon transistor limit, WNSP, Ψ channels, semiconductor physics",
      datePublished: "2026-05-16",
      dateModified: "2026-07-20",
    }),
    bodyHtml: `<h1>The Silicon Bridge — Silicon is the Bridge. Photons are the Destination.</h1><p>Transistors are hitting the wall of quantum mechanics. At 2 nm gate widths — roughly 18 silicon atoms — quantum tunnelling becomes uncontrollable. Below ~1 nm, the switch ceases to function as a switch. Intel, TSMC, Samsung, IBM, and Nvidia have all published photonic computing research roadmaps. The question is not <em>whether</em> the industry transitions — it is who has the software model ready when it does.</p><h2>The Transistor Wall</h2><ul><li><strong>2 nm</strong>: current leading node (TSMC N2, Intel 18A) — ~18 silicon atoms wide</li><li><strong>~1 nm</strong>: projected physical gate limit — quantum tunnelling makes the switch unreliable</li><li><strong>100 W/cm²</strong>: thermal density approaching physical ceiling — photons produce no resistive heat</li></ul><h2>The Programming Gap</h2><p>No existing programming language, operating system, or protocol was designed for photonic hardware. Every codebase written for CMOS transistors will need a fundamental rewrite when photonic ASICs arrive. NexusOS is the exception.</p><h2>How NexusOS Solves It</h2><p>The ${PSI_CHANNELS} orthogonal Ψ channels derived from the Theory of Compression States (${PSI_CHANNEL_FORMULA}) map directly to physical hardware lanes. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics — not software policy. Every CE lookup that today runs as a table scan in RAM will execute as a physical wavelength selection in a photonic waveguide. Silicon is the bridge encoder. Photons are the destination.</p><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification — PHR-1, SNIC, Spectral Relay Mesh</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li></ul></nav>`,
  },
  "/wnsp-bridge": {
    title: "WNSP Bridge — TCP/IP Overlay for wnsp:// URIs",
    description: "TCP/IP overlay that maps wnsp://Ψ(wdm,oam,pol)/path to HTTP endpoints via the wnsp_registry. Enables incremental WNSP adoption without replacing your stack.",
    canonical: `${BASE}/wnsp-bridge`,
    ogTitle: "WNSP Bridge — TCP/IP Overlay for Spectral URIs",
    ogDescription: "Map wnsp://Ψ(wdm,oam,pol)/path to HTTP endpoints. Bridge layer for incremental WNSP adoption. wnsp_registry database. No full protocol migration required.",
    twitterTitle: "WNSP Bridge Layer",
    twitterDescription: "wnsp:// URI to HTTP bridge. Spectral routing over TCP/IP. Incremental WNSP adoption path.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-bridge`, name: "WNSP Bridge", description: "TCP/IP overlay mapping wnsp:// URIs to HTTP resources via the wnsp_registry. Allows existing web infrastructure to route WNSP spectral addresses." }),
    bodyHtml: `<h1>WNSP Bridge — TCP/IP Overlay for wnsp:// URIs</h1><p>The WNSP Bridge is a TCP/IP overlay layer that maps <code>wnsp://Ψ(wdm,oam,pol)/path</code> URIs to HTTP resources via the <code>wnsp_registry</code> database. It allows existing web infrastructure to participate in WNSP spectral routing incrementally — no full protocol migration required.</p><p>Any application that can make an HTTP request can resolve a WNSP spectral address through the bridge. The bridge translates the Ψ channel triplet (WDM index, OAM mode, polarisation) to a registered HTTP endpoint, maintaining a physics-consistent routing table.</p><ul><li>Maps <code>wnsp://Ψ(wdm,oam,pol)/path</code> → HTTP endpoints</li><li>Registry backed by the <code>wnsp_registry</code> database table</li><li>Incremental adoption — no protocol stack replacement needed</li><li>Preserves Ψ channel semantics across the TCP/IP boundary</li></ul><nav><ul><li><a href="${BASE}/spectral-router">Spectral Router (native WNSP routing)</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/developer-matrix">Developer Integration Reference</a></li></ul></nav>`,
  },
  "/spectral-router": {
    title: "Spectral Router — DNS-Free Packet Routing via Ψ Channels",
    description: "DNS-free packet routing using Ψ channel addressing. Destinations CE-encoded to wavelengths — no registrars, no name servers, no single point of failure.",
    canonical: `${BASE}/spectral-router`,
    ogTitle: "Spectral Router — DNS-Free Ψ Channel Routing",
    ogDescription: `Route packets without DNS. CE-encoded Ψ channel addresses. Spectral proximity routing. Physics-native networking on ${PSI_CHANNELS} orthogonal channels.`,
    twitterTitle: "NexusOS Spectral Router",
    twitterDescription: "DNS-free packet routing via Ψ channels. CE-encoded addresses. Physics-native networking.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-router`, name: "NexusOS Spectral Router", description: "DNS-free packet routing using Ψ channel addressing. Destination addresses are CE-encoded to wavelengths on the fly across ${PSI_CHANNELS} orthogonal channels." }),
    bodyHtml: `<h1>Spectral Router — DNS-Free Packet Routing via Ψ Channels</h1><p>The NexusOS Spectral Routing Engine replaces DNS with physics. Packets are routed between network nodes using Ψ channel addressing — destination addresses are CE-encoded to wavelengths on the fly, and the routing algorithm selects the path of least electromagnetic distance.</p><p>There are no domain name servers, no registrars, and no single point of control. Any node that knows its Ψ channel can send and receive packets. Routing efficiency is proportional to spectral proximity — nodes at similar wavelengths route with lower energy cost.</p><ul><li>DNS-free — no registrars, no name servers, no single point of failure</li><li>CE-encoded addresses derived deterministically from content</li><li>Spectral proximity routing — shorter EM distance = lower routing cost</li><li>${PSI_CHANNELS} orthogonal Ψ channels as the full routing address space</li><li>Physics-native: routing cost derived from E=hf energy difference</li></ul><nav><ul><li><a href="${BASE}/wnsp-bridge">WNSP Bridge (TCP/IP compatibility layer)</a></li><li><a href="${BASE}/network">Spectral Network Visualisation</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li></ul></nav>`,
  },
  "/spectral-contracts": {
    title: "Spectral Contracts — Physics-Signed Document Signing",
    description: "Replace PKI with physics. Sign documents using spectral wavelength keys: SHA-256(content) ⊕ hex(λ_signer), anchored to the signer's WNSP Ψ channel. AGPL-3.0.",
    canonical: `${BASE}/spectral-contracts`,
    ogTitle: "Spectral Contracts — Wavelength-Key Document Signing",
    ogDescription: "Replace PKI with physics. SHA-256(content) ⊕ hex(λ_signer). Signatures anchored to the signer's WNSP Ψ channel. AGPL-3.0.",
    twitterTitle: "Spectral Contracts — NexusOS",
    twitterDescription: "Document signing with wavelength keys. Physics replaces PKI. SHA-256 ⊕ spectral address.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-contracts`, name: "NexusOS Spectral Contracts", description: "Physics-signed documents: SHA-256(content) ⊕ hex(λ_signer) anchors each signature to the signer's WNSP Ψ channel. Replaces traditional PKI. AGPL-3.0." }),
    bodyHtml: `<h1>Spectral Contracts — Physics-Signed Document Signing</h1><p>Spectral Contracts replace traditional Public Key Infrastructure (PKI) with a physics-based signing algorithm. Each signature is anchored to the signer's WNSP Ψ channel wavelength, making the signature inseparable from the signer's spectral identity.</p><p>Signing algorithm: <code>SHA-256(content) ⊕ hex(λ_signer)</code> — the document hash is XOR-combined with the hexadecimal representation of the signer's wavelength. Verification requires knowing the signer's Ψ channel, which is derived deterministically from their spectral address.</p><ul><li>No certificate authorities — spectral identity replaces PKI trust chains</li><li>Signature algorithm: <code>SHA-256(content) ⊕ hex(λ_signer)</code></li><li>Signer identity anchored to their WNSP Ψ channel (wavelength, OAM mode, polarisation)</li><li>Verification is deterministic and physics-consistent</li><li>AGPL-3.0 licensed</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li></ul></nav>`,
  },
  "/divergence-test": {
    title: "Divergence Test — Dynamical System Analysis for WNSP Channels",
    description: "Parameterised channel-dynamics engine: explore Ψ channel evolution through feedback iterations, classify attractors, and predict regime transitions. NexusOS.",
    canonical: `${BASE}/divergence-test`,
    ogTitle: "Divergence Test — WNSP Channel Dynamics",
    ogDescription: "Feedback iteration engine for Ψ channel state evolution. Attractor classification. Regime prediction. State-dependent routing analysis. NexusOS dynamical systems.",
    twitterTitle: "Divergence Test — NexusOS",
    twitterDescription: "Dynamical system analysis for WNSP channels. Attractor classification, feedback iteration, regime prediction.",
    jsonLd: softwareApp({ url: `${BASE}/divergence-test`, name: "NexusOS Divergence Test", description: "WNSP channel dynamical systems engine. Explores state-dependent routing via feedback iterations, classifies attractors, and predicts channel regime transitions." }),
    bodyHtml: `<h1>Divergence Test — Dynamical System Analysis for WNSP Channels</h1><p>The Divergence Test is a parameterised channel-dynamics engine that models WNSP Ψ channel state evolution. By applying feedback iterations to spectral channel states, it classifies attractor types, identifies bifurcation points, and predicts regime transitions — giving deep insight into how the NexusOS network self-organises under load.</p><p>Each Ψ channel can exist in one of several dynamical regimes: stable fixed point, periodic orbit, quasi-periodic, or chaotic. The divergence test engine maps the parameter space for a given channel configuration and displays the resulting attractor geometry.</p><ul><li>Parameterised feedback iteration engine for Ψ channel state evolution</li><li>Attractor classification: fixed point, periodic, quasi-periodic, chaotic</li><li>Bifurcation diagram generation across channel parameter ranges</li><li>State-dependent routing analysis — how channel regime affects packet delivery</li><li>Regime prediction for network planning and capacity management</li></ul><nav><ul><li><a href="${BASE}/network">Spectral Network (live topology)</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li></ul></nav>`,
  },
  "/campaign": {
    title: "NexusOS Infrastructure Campaign — Building a Type I Civilisation",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. 25 Hardware Founder slots, NXT Supporter packs, and Spectral Bundles.",
    canonical: `${BASE}/campaign`,
    ogTitle: "NexusOS Infrastructure Campaign",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware. 100M sats / 100,000 NXT per slot.",
    ogImage: "https://wnsp.io/crowdfund-og.jpg",
    twitterTitle: "NexusOS Infrastructure Campaign",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots. Building infrastructure for a Type I Civilisation.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "NexusOS Infrastructure Campaign — PHR-1 & SNIC",
      "url": `${BASE}/campaign`,
      "description": "Hardware crowdfunding campaign for the PHR-1 resonator and SNIC photonic NIC. 25 Hardware Founder slots at 100M sats / 100,000 NXT each. Each contribution is recorded on-chain.",
      "brand": { "@type": "Organization", "name": "NexusOS" },
      "offers": {
        "@type": "Offer",
        "price": "100000",
        "priceCurrency": "NXT",
        "availability": "https://schema.org/LimitedAvailability",
        "seller": { "@type": "Organization", "name": "NexusOS" },
      },
    },
    bodyHtml: `<h1>NexusOS Infrastructure Campaign — Building a Type I Civilisation</h1><p>The NexusOS infrastructure campaign funds the world's first physics-based computing hardware stack, one photonic component at a time. The PHR-1 resonator and SNIC photonic NIC bring the Λ=hf/c² compression equation from software simulation into physical reality. Every contribution is recorded on-chain, permanently.</p><h2>Campaign Tiers</h2><ul><li><strong>Hardware Founder</strong>: 100M sats / 100,000 NXT — one of 25 first-production PHR-1 units, KERNEL-band spectral authority, Hardware Founder Rune badge</li><li><strong>NXT Supporter</strong>: various sats amounts — NXT token allocation, USER-band authority, early access to WavelengthScript tooling</li><li><strong>Spectral Bundle</strong>: CE encoder + documentation + Ψ channel reservation</li></ul><nav><ul><li><a href="${BASE}/campaign">Infrastructure Campaign</a></li><li><a href="${BASE}/crowdfund">NXT Crowdfund</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li></ul></nav>`,
  },
  "/evidence": {
    title: "NexusOS Evidence — Experimental Physics Validation",
    description: "Experimental evidence for the Theory of Compression States: sub-mm wave geometry, THz spectroscopy, and WGM resonance consistent with the Λ=hf/c² model.",
    canonical: `${BASE}/evidence`,
    ogTitle: "NexusOS Evidence — Physics Validation",
    ogDescription: "Experimental evidence for the Theory of Compression States. THz research, WGM spectroscopy, Berry phase measurements. Independent validation of Λ=hf/c² and WNSP channel geometry.",
    twitterTitle: "NexusOS Physics Evidence",
    twitterDescription: "Experimental validation of Λ=hf/c². THz research, WGM spectroscopy, Berry phase measurements.",
    ogType: "article",
    jsonLd: [
      techArticle({ url: `${BASE}/evidence`, name: "NexusOS Physics Evidence", description: "Experimental evidence for the Theory of Compression States: THz spectroscopy and WGM resonance consistent with Λ=hf/c² and the ${PSI_CHANNELS}-channel Ψ geometry.", about: "Theory of Compression States, THz spectroscopy, WGM resonance, experimental physics", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      breadcrumbList([
        { name: "NexusOS", item: `${BASE}/` },
        { name: "Theory", item: `${BASE}/oscillating-quanta` },
        { name: "Physics Evidence", item: `${BASE}/evidence` },
      ]),
    ],
    bodyHtml: `<h1>NexusOS Evidence — Experimental Physics Validation</h1><p>The Theory of Compression States is not purely theoretical. The following experimental and observational evidence independently supports the Λ=hf/c² model and the ${PSI_CHANNELS}-channel Ψ geometry underlying NexusOS.</p><h2>Key Evidence Categories</h2><ul><li><strong>Sub-mm wave geometry</strong>: 2025 THz research validates the Ψ channel spacing predicted by the WNSP Hilbert space channel model. Observed spectral separations match the ${PSI_CHANNEL_FORMULA} geometry.</li><li><strong>Whispering Gallery Mode (WGM) resonance</strong>: WGM spectroscopy results are consistent with the Russell octave structure used to derive OAM mode indices in the ${PSI_CHANNELS}-channel model.</li><li><strong>Berry phase measurements</strong>: Topological phase accumulation in resonant waveguides maps to the Λ=hf/c² extension via Berry phase → compression mass correction.</li><li><strong>Flerovium-114</strong>: Spectral characteristics of element 114 align with SYSTEM-band frequency predictions in the compression state model.</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/proof">Formal Physics Proofs</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li></ul></nav>`,
  },
  "/spectral-db": {
    title: "Spectral DB — CE-Encoded Spectral Fingerprint Database",
    description: "NexusOS Spectral DB stores CE-encoded spectral fingerprints for text, documents, and code. Save, search, and retrieve content by its electromagnetic signature.",
    canonical: `${BASE}/spectral-db`,
    ogTitle: "Spectral DB — Spectral Fingerprint Database",
    ogDescription: "Store and retrieve content by electromagnetic signature. CE-encoded WASCII v2.0 fingerprints. Similarity search by spectral proximity. NexusOS data layer.",
    twitterTitle: "NexusOS Spectral DB",
    twitterDescription: "CE-encoded spectral fingerprint database. Save and search content by its electromagnetic signature.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-db`, name: "NexusOS Spectral DB", description: "CE-encoded WASCII v2.0 spectral fingerprint database. Stores text, documents, and code indexed by EM signature; supports spectral proximity search." }),
    bodyHtml: `<h1>Spectral DB — CE-Encoded Spectral Fingerprint Database</h1><p>The NexusOS Spectral DB is the persistence layer for CE-encoded content. Every document, string, or code snippet stored in the Spectral DB is indexed by its electromagnetic signature — a WASCII v2.0 spectral fingerprint derived from CE_TABLE[charCode % 128] applied to each character.</p><p>This transforms content storage from keyword-based indexing to physics-based indexing. Similar content naturally occupies similar spectral positions, enabling similarity search by electromagnetic proximity rather than text matching.</p><ul><li>Stores CE-encoded WASCII v2.0 spectral fingerprints for any text content</li><li>Index: electromagnetic signature rather than keyword frequency</li><li>Similarity search: spectral proximity returns conceptually related content</li><li>Save-to-Spectral-DB available directly from the CE Code Writer Live Encode tab</li><li>Used by Spectral Search for cross-layer result ranking</li></ul><nav><ul><li><a href="${BASE}/ce-code-writer">CE Code Writer (save to Spectral DB)</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  "/constitution": {
    title: "NexusOS Constitution — Governance Framework and Protocol Law",
    description: "NexusOS governance: 11 live protocol parameters, authority bands, voting thresholds, proposal requirements, and NXT supply indestructibility clause.",
    canonical: `${BASE}/constitution`,
    ogTitle: "NexusOS Constitution — Governance and Protocol Law",
    ogDescription: "11 live protocol parameters. Physics-weighted governance. SYSTEM, KERNEL, USER, GUEST authority bands. Vote thresholds, proposal requirements, NXT indestructibility clause.",
    twitterTitle: "NexusOS Constitution",
    twitterDescription: "NexusOS governance: 11 protocol parameters, authority bands, voting thresholds. NXT indestructibility clause.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NexusOS Constitution",
      "url": `${BASE}/constitution`,
      "description": "Governance framework for NexusOS: 11 live protocol parameters governed on-chain, authority band voting weights (SYSTEM, KERNEL, USER, GUEST), proposal thresholds, and the NXT supply indestructibility clause.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
      "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    },
    bodyHtml: `<h1>NexusOS Constitution — Governance Framework and Protocol Law</h1><p>The NexusOS Constitution is the governing document for the NexusOS protocol. It defines what can be changed, who can change it, how changes are ratified, and what can never be changed. The most important clause: the NXT supply is indestructible — fees are never burned.</p><h2>Governance Structure</h2><ul><li><strong>11 live protocol parameters</strong>: base fee rate, burn rate (always 0), treasury allocation ratios (5 buckets), minimum proposal stake, quorum threshold, vote weight floor, OAM mode count, WDM channel count — all adjustable by on-chain governance</li><li><strong>Authority band voting weights</strong>: SYSTEM &gt; KERNEL &gt; USER &gt; GUEST. Shorter wavelength = higher energy = higher governance authority. Physics determines voting weight, not token quantity alone.</li><li><strong>Proposal requirements</strong>: KERNEL-band or higher to submit. Proposals require specific vote counts and weight thresholds to pass.</li><li><strong>Immediate effect</strong>: ratified proposals trigger immediate updates to in-memory fee and burn stores — no waiting period.</li></ul><h2>Indestructibility Clause</h2><p>NXT fees are never burned. All protocol fees flow to the Orbital Treasury and are distributed across five on-chain governance-controlled buckets. The total NXT supply (21 billion) is permanent and conserved.</p><nav><ul><li><a href="${BASE}/open">Open Charter (AGPL-3.0)</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/developer-matrix": {
    title: "Developer Matrix — NexusOS API, SDK, and Integration Reference",
    description: "Full API surface, CE encoder (npm + pip), WavelengthScript toolchain, SDK reference, integration patterns, and developer key tiers. NexusOS Developer Hub.",
    canonical: `${BASE}/developer-matrix`,
    ogTitle: "NexusOS Developer Matrix",
    ogDescription: "Full API surface, CE encoder (npm + pip), WavelengthScript toolchain, SDK reference, integration patterns. Everything developers need to build on WNSP.",
    twitterTitle: "NexusOS Developer Matrix",
    twitterDescription: "API surface, CE encoder packages, WavelengthScript toolchain, integration patterns. Build on WNSP.",
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/developer-matrix`, name: "NexusOS Developer Matrix", description: "NexusOS developer reference: REST API, CE encoder packages (npm and pip), WavelengthScript toolchain, SDK reference, key tiers, and integration patterns.", about: "WNSP, CE encoding, WavelengthScript, developer API", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Developer Matrix — NexusOS API, SDK, and Integration Reference</h1><p>The NexusOS Developer Matrix is the complete reference for building physics-native applications on the WNSP stack. It covers the full API surface, both CE encoder packages, the WavelengthScript toolchain, mobile SDKs, and the developer key tier system.</p><h2>CE Encoder Packages</h2><ul><li><strong>npm</strong>: <code>npm install nexusos-ce-encoder</code> — CJS + ESM, TypeScript types, <code>ceEncode(text) → &#123; wavelength, band, psiChannel, energy &#125;</code></li><li><strong>pip</strong>: <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code> — Python 3.8+, same API, bit-identical output</li></ul><h2>REST API</h2><ul><li>CE encoding endpoint — encode any text to spectral fingerprint</li><li>Wallet API — NXT balance, transfer, fee calculation</li><li>Governance API — proposal submission, voting (KERNEL-band)</li><li>Spectral DB API — store and retrieve CE-encoded fingerprints</li><li>Developer key management — API key creation with NXT creation fee</li></ul><h2>WavelengthScript Toolchain</h2><ul><li>Source transpiler — any language → WavelengthScript</li><li>Compiler α — WavelengthScript → WNSP bytecode</li><li>WNSP VM — bytecode interpreter with Ψ channel registers</li></ul><nav><ul><li><a href="${BASE}/docs">Full Documentation</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer &amp; Integration Kit</a></li><li><a href="${BASE}/mobile-sdk">Mobile SDK (iOS &amp; Android)</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Specification</a></li></ul></nav>`,
  },
  "/nexus-command": {
    title: "Nexus Command — NexusOS System Administration Console",
    description: "NexusOS kernel admin: authority band management, 11 protocol parameters, agent watchdog, and blockchain audit interface. KERNEL-band access required.",
    canonical: `${BASE}/nexus-command`,
    ogTitle: "Nexus Command — NexusOS Admin Console",
    ogDescription: "System-level administration: authority band management, 11 protocol parameters, agent watchdog, blockchain auditor. KERNEL-band access required.",
    twitterTitle: "Nexus Command — NexusOS",
    twitterDescription: "NexusOS system admin console. Authority bands, protocol parameters, agent watchdog, blockchain audit.",
    jsonLd: softwareApp({ url: `${BASE}/nexus-command`, name: "Nexus Command", description: "NexusOS AI OS kernel admin console. Manages authority bands, protocol parameters, agent watchdog, and blockchain audit. KERNEL-band access required." }),
    bodyHtml: `<h1>Nexus Command — NexusOS System Administration Console</h1><p>Nexus Command is the system-level administration interface for the NexusOS AI OS Kernel. It provides direct access to kernel state, authority band management, live protocol parameters, the agent watchdog, and the blockchain audit interface. KERNEL-band spectral authority is required for access.</p><h2>Console Capabilities</h2><ul><li><strong>Authority band management</strong>: view and manage node assignments across SYSTEM, KERNEL, USER, and GUEST bands</li><li><strong>Protocol parameter governance</strong>: inspect and submit changes to all 11 live protocol parameters (base fee, treasury ratios, quorum thresholds, channel geometry)</li><li><strong>Agent watchdog</strong>: monitor AI agent liveness, restart dead agents, inspect agent state and Ψ channel assignments</li><li><strong>Blockchain auditor</strong>: real-time block chain consistency check, transaction replay, fee verification against E=hf physics</li><li><strong>KernelEventBus</strong>: live event stream from the 6-phase boot process and runtime kernel events</li></ul><p>Access requirement: KERNEL-band spectral authority (wavelength in the KERNEL range, verified by the physics engine). GUEST and USER band accounts have read-only access to public kernel metrics.</p><nav><ul><li><a href="${BASE}/constitution">NexusOS Constitution (governance rules)</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li><li><a href="${BASE}/network">Spectral Network</a></li></ul></nav>`,
  },
  "/mobile-sdk": {
    title: "NexusOS Mobile SDK — Native iOS and Android Spectral Computing",
    description: "Native iOS (Swift) and Android (Kotlin) SDKs for spectral-native apps. Offline wasciiEncode(), CE encoding, and WNSP Ψ channel addressing — no server call.",
    canonical: `${BASE}/mobile-sdk`,
    ogTitle: "NexusOS Mobile SDK — iOS & Android",
    ogDescription: "Native Swift and Kotlin SDKs. Offline wasciiEncode(), CE encoding, Ψ channel addressing. Physics-native mobile computing. AGPL-3.0.",
    twitterTitle: "NexusOS Mobile SDK",
    twitterDescription: "Native iOS/Android SDKs. Offline CE encoding, Ψ channel addressing. Physics-native mobile apps. AGPL-3.0.",
    jsonLd: softwareApp({ url: `${BASE}/mobile-sdk`, name: "NexusOS Mobile SDK", description: "Native iOS/Android SDKs for spectral-native mobile development. Offline wasciiEncode(), CE encoding, WNSP Ψ channel addressing. AGPL-3.0." }),
    bodyHtml: `<h1>NexusOS Mobile SDK — Native iOS and Android Spectral Computing</h1><p>The NexusOS Mobile SDK brings physics-native computing to iOS and Android. Both SDKs implement the full CE encoding stack natively — no server round-trip required for wavelength calculation, Ψ channel derivation, or spectral address generation.</p><h2>iOS SDK (Swift)</h2><ul><li>Native <code>wasciiEncode(_ text: String) -&gt; SpectralResult</code> — offline CE encoding using CE_TABLE[charCode % 128]</li><li>Ψ channel derivation: wavelength → WDM index, OAM mode, polarisation</li><li>WNSP URI generation: <code>wnsp://Ψ(wdm,oam,pol)/path</code></li><li>Physics fee calculator: E=hf given user's spectral address</li></ul><h2>Android SDK (Kotlin)</h2><ul><li>Same API surface as iOS — <code>wasciiEncode(text: String): SpectralResult</code></li><li>Bit-identical CE encoding output to npm and pip packages</li><li>Offline-capable: all physics calculations run on-device</li><li>Ψ channel addressing and WNSP URI construction</li></ul><p>Both SDKs are AGPL-3.0. When photonic ASICs arrive (~2032), the SDK wavelength calculations map directly to hardware lane selections with no logic change required.</p><nav><ul><li><a href="${BASE}/developer-matrix">Developer Matrix (full API reference)</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li><li><a href="${BASE}/docs">Documentation</a></li></ul></nav>`,
  },
  "/research-presentation": {
    title: "NexusOS Research Presentation — Physics Stack and Architecture",
    description: "Formal research: Theory of Compression States, Λ=hf/c² derivation, WNSP architecture, SNIC hardware design, and the path to photonic gate arrays.",
    canonical: `${BASE}/research-presentation`,
    ogTitle: "NexusOS Research Presentation",
    ogDescription: "Formal research: Theory of Compression States, Λ=hf/c² derivation, WNSP architecture, SNIC hardware design. Digital substrate to photonic gate array (~2032). AGPL-3.0.",
    twitterTitle: "NexusOS Research Presentation",
    twitterDescription: "Formal physics research: Theory of Compression States, Λ=hf/c², WNSP protocol, SNIC hardware. Photonic gate array roadmap.",
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/research-presentation`, name: "NexusOS Research Presentation", description: "Formal research: Theory of Compression States, Λ=hf/c² derivation, WNSP protocol, SNIC hardware, and the photonic gate array roadmap to ~2032.", about: "Theory of Compression States, WNSP protocol, SNIC, photonic computing, Λ=hf/c²", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>NexusOS Research Presentation — Physics Stack and Protocol Architecture</h1><p>This is the formal research presentation of the NexusOS physics stack. It covers the theoretical foundations, protocol architecture, hardware design, and the long-term roadmap from today's digital substrate to the photonic gate array of ~2032.</p><h2>Presentation Structure</h2><ol><li><strong>Theory of Compression States</strong>: The universe evolves from the first unobserved oscillation at 555 THz. Λ=hf/c² is the governing compression law. Every NexusOS address, fee, and channel is derived from this first principle.</li><li><strong>Λ=hf/c² Derivation</strong>: Step-by-step derivation of the compression state equation from Maxwell's equations and Planck's constant. The visible spectrum (380–780nm) as the 128-band address space.</li><li><strong>WNSP Protocol Architecture</strong>: How WNSP-CE, WNSP-SE, and WNSP-URI combine to form a complete physics-native communication protocol. Hilbert space channel model: ${PSI_CHANNEL_FORMULA} = ${PSI_CHANNELS} orthogonal Ψ channels.</li><li><strong>SNIC Hardware Design</strong>: The photonic NIC architecture that implements WNSP in physical waveguides. CE lookups as wavelength selections in glass. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>Roadmap</strong>: Digital substrate (now) → PHR-1 hardware layer (2026–2028) → photonic gate array (~2032). No code rewrite required at any transition.</li></ol><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li></ul></nav>`,
  },

  "/spectral-mirror": {
    title: "Spectral Mirror — The First Electromagnetic Archive | NexusOS",
    description: "Live archive of every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent. This genesis cannot be recreated.",
    canonical: `${BASE}/spectral-mirror`,
    ogType: "website",
    ogTitle: "Spectral Mirror — The First Electromagnetic Archive",
    ogDescription: "Every WNSP transmission archived by wavelength since 2 May 2026. CE-encoded. Ψ-addressed. The genesis date cannot be recreated. This is a once-only feature.",
    twitterTitle: "Spectral Mirror — Live Electromagnetic Archive",
    twitterDescription: "Recording every WNSP transmission by wavelength since 2 May 2026. CE-encoded, Ψ-addressed, permanent. This genesis date cannot be recreated.",
    jsonLd: techArticle({ url: `${BASE}/spectral-mirror`, name: "Spectral Mirror — Electromagnetic Archive", description: "Live archive of every WNSP transmission CE-encoded by wavelength. Records map to Ψ channels in the 380–780 nm visible spectrum. Recording began 2 May 2026.", about: "WNSP protocol, CE encoding, spectral archive, electromagnetic spectrum", datePublished: "2026-05-02", dateModified: "2026-07-20" }),
    bodyHtml: `<h1>Spectral Mirror — The First Electromagnetic Archive</h1><p>Every message and P2P transmission that passes through the WNSP layer is CE-encoded and permanently stored by its address in the visible light spectrum. Recording began 2 May 2026.</p><p>This archive is a once-only feature. The genesis date of 2 May 2026 cannot be recreated — it is the first and only continuous electromagnetic archive at these coordinates in history.</p><h2>How it works</h2><ul><li>Each character maps to a wavelength: λ = 380 + (charCode % 128) × 3.125 nm</li><li>The Ψ channel address Ψ(wdm, oam, pol) is derived from the content itself</li><li>Authority bands: SYSTEM (380–480 nm), KERNEL (480–495 nm), USER (495–620 nm), GUEST (620–780 nm)</li></ul><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },

  // ── Remaining public routes to achieve full ROUTE_META parity ─────────────
  "/videos": {
    title: "NexusOS Videos — Physics, Protocol, and Hardware Demonstrations",
    description: "Video demonstrations of NexusOS physics stack: CE encoding live, WNSP VM execution, hardware lab measurements, and the Theory of Compression States explained.",
    canonical: `${BASE}/videos`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "NexusOS Videos — Physics, Protocol, and Hardware Demonstrations",
      "url": `${BASE}/videos`,
      "description": "Video demonstrations of the NexusOS physics stack: CE encoding live, WNSP VM execution, hardware lab measurements, and the Theory of Compression States explained.",
      "inLanguage": "en",
      "about": [
        { "@type": "Thing", "name": "WNSP Spectral Communication Protocol" },
        { "@type": "Thing", "name": "Theory of Compression States" },
        { "@type": "Thing", "name": "WavelengthScript" },
        { "@type": "Thing", "name": "CE-SE Encoding Pipeline" },
      ],
      "publisher": {
        "@type": "Organization",
        "name": "NexusOS",
        "url": BASE,
        "logo": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
      },
      "hasPart": [
        {
          "@type": "VideoObject",
          "name": "CE Encoding Live — Characters to Visible-Light Wavelengths",
          "description": "Live demonstration of the NexusOS CE encoder mapping text to visible-light wavelengths across 128 spectral bands (380–780 nm).",
          "thumbnailUrl": "https://wnsp.io/opengraph.jpg",
          "uploadDate": "2026-05-16",
        },
        {
          "@type": "VideoObject",
          "name": "WNSP VM Bytecode Execution — WavelengthScript in Action",
          "description": "Step-by-step execution of WavelengthScript bytecode in the WNSP Virtual Machine, with Ψ channel register inspection.",
          "thumbnailUrl": "https://wnsp.io/opengraph.jpg",
          "uploadDate": "2026-05-16",
        },
        {
          "@type": "VideoObject",
          "name": "Theory of Compression States — Λ=hf/c² Explained",
          "description": "Explanation of the Theory of Compression States: the universe evolving from the first unobserved oscillation, and the Λ=hf/c² compression law governing NexusOS.",
          "thumbnailUrl": "https://wnsp.io/opengraph.jpg",
          "uploadDate": "2026-05-16",
        },
      ],
    },
    bodyHtml: `<h1>NexusOS Videos — Physics, Protocol, and Hardware Demonstrations</h1><p>Watch live demonstrations of the NexusOS physics stack: CE encoding in action, WNSP VM executing bytecode, hardware lab measurements, and explanations of the Theory of Compression States.</p><nav><ul><li><a href="${BASE}/hardware-results">Hardware Verification Results</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live)</a></li></ul></nav>`,
  },
  "/spectral-bundle": {
    title: "Spectral Bundle — NexusOS CE Encoder + SDK + Ψ Channel Package",
    description: "NexusOS Spectral Bundle: CE encoder (npm + pip), Ψ channel reservation, WNSP VM access, WavelengthScript documentation, and developer key in one package.",
    canonical: `${BASE}/spectral-bundle`,
    jsonLd: softwareApp({ url: `${BASE}/spectral-bundle`, name: "NexusOS Spectral Bundle", description: "Bundled developer package: CE encoder (npm + pip), Ψ channel reservation, WNSP VM access, WavelengthScript documentation, and developer API key." }),
    bodyHtml: `<h1>Spectral Bundle — NexusOS Developer Package</h1><p>The NexusOS Spectral Bundle packages everything a developer needs to build physics-native applications: CE encoder (npm + pip), Ψ channel reservation, WNSP VM access, WavelengthScript documentation, and developer API key.</p><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/crowdfund">Crowdfund</a></li></ul></nav>`,
  },
  "/bitcoin-ordinals": {
    title: "Bitcoin Ordinals — NexusOS Spectral-Verified Inscriptions",
    description: "Bitcoin Ordinals with WNSP spectral verification. Inscription content CE-encoded to wavelength, anchored to a Ψ channel on-chain for physics-native provenance.",
    canonical: `${BASE}/wnsp-ordinals`,
    jsonLd: softwareApp({ url: `${BASE}/wnsp-ordinals`, name: "Bitcoin Ordinals — NexusOS", description: "Bitcoin Ordinals with WNSP spectral verification. CE-encoded inscription content anchored to a Ψ channel for physics-native provenance." }),
    bodyHtml: `<h1>Bitcoin Ordinals — NexusOS Spectral-Verified Inscriptions</h1><p>NexusOS extends Bitcoin Ordinals with WNSP spectral verification. Inscription content is CE-encoded and anchored to a Ψ channel.</p><nav><ul><li><a href="${BASE}/wnsp-ordinals">WNSP Ordinals</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li></ul></nav>`,
  },
  "/wnsp-ordinals": {
    title: "WNSP Ordinals — Spectral-Verified Bitcoin Inscriptions",
    description: "WNSP Ordinals extends Bitcoin Ordinals with physics-native spectral verification. CE-encoded inscription content, Ψ channel anchoring, deterministic provenance.",
    canonical: `${BASE}/wnsp-ordinals`,
    ogTitle: "WNSP Ordinals — Bitcoin + WNSP Spectral Verification",
    ogDescription: "Bitcoin Ordinals + WNSP. CE-encoded inscription content anchored to Ψ channels. Physics-native provenance as permanent as the Bitcoin blockchain.",
    twitterTitle: "WNSP Ordinals",
    twitterDescription: "Bitcoin Ordinals + WNSP spectral anchoring. Physics-native provenance.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-ordinals`, name: "WNSP Ordinals", description: "WNSP-extended Bitcoin Ordinals. CE-encoded inscription content anchored to Ψ channels for physics-native provenance. Permanent as Bitcoin." }),
    bodyHtml: `<h1>WNSP Ordinals — Spectral-Verified Bitcoin Inscriptions</h1><p>WNSP Ordinals is the NexusOS extension to Bitcoin Ordinals that adds physics-native spectral verification. Every inscription is CE-encoded to its wavelength position, and the resulting Ψ channel address is anchored on the Bitcoin blockchain — permanent provenance without any trusted third party.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token (NEXUS•WAVELENGTH Rune)</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  "/wnsp-staking": {
    title: "WNSP Staking — Stake NXT for WNUSD Collateral | NexusOS",
    description: "Stake NXT to auto-mint WNUSD collateral. Six lock periods, physics-weighted yield rates, and WNUSD issued at a fixed collateral ratio. NexusOS staking engine.",
    canonical: `${BASE}/wnsp-staking`,
    ogTitle: "WNSP Staking — NXT → WNUSD Auto-Collateral",
    ogDescription: "Stake NXT. Auto-mint WNUSD at a fixed collateral ratio. Six lock periods. Physics-weighted yield. Unstake auto-redeems WNUSD.",
    twitterTitle: "WNSP Staking",
    twitterDescription: "Stake NXT → auto-mint WNUSD. Six lock periods. Physics-weighted yield rates.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-staking`, name: "WNSP Staking", description: "NXT token staking on NexusOS. Six lock periods with physics-weighted yield. Auto-mints WNUSD collateral on stake, auto-redeems on unstake." }),
    bodyHtml: `<h1>WNSP Staking — Stake NXT for WNUSD Collateral</h1><p>NexusOS staking allows you to lock NXT tokens for a fixed period to earn yield and auto-mint WNUSD (a physics-backed stable unit). Six lock periods from 30 days to 2 years, each with an increasing yield rate derived from the physics fee schedule.</p><ul><li>Six lock periods: 30 days, 90 days, 180 days, 1 year, 18 months, 2 years</li><li>Yield rates: physics-weighted from the spectral authority band model</li><li>WNUSD auto-minted at a fixed collateral ratio when you stake</li><li>WNUSD auto-redeemed when you unstake — no manual step required</li><li>Early exit: possible with penalty; penalty returns to Orbital Treasury</li><li>Deposit cap: 10 billion sats</li></ul><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/market": {
    title: "NexusOS Market — Trade NXT, wSATS, and Spectral Assets",
    description: "The NexusOS Market: trade NXT tokens, wSATS, Bitcoin Runes, and spectral assets. Physics-based fee schedule, Orbital Treasury routing, and on-chain settlement.",
    canonical: `${BASE}/market`,
    ogTitle: "NexusOS Market — Trade Spectral Assets",
    ogDescription: "Trade NXT, wSATS, Bitcoin Runes, and spectral assets. Physics-based fees. Orbital Treasury routing. On-chain settlement.",
    twitterTitle: "NexusOS Market",
    twitterDescription: "Trade NXT, wSATS, Bitcoin Runes, and spectral assets. Physics-based fee schedule.",
    jsonLd: softwareApp({ url: `${BASE}/market`, name: "NexusOS Market", description: "Physics-governed market for NXT tokens, wSATS, Bitcoin Runes, and spectral assets. Fee schedule derived from E=hf, settlement on-chain." }),
    bodyHtml: `<h1>NexusOS Market — Trade NXT, wSATS, and Spectral Assets</h1><p>The NexusOS Market is the exchange layer for physics-native assets. Trade NXT tokens, wrapped satoshis (wSATS), Bitcoin Runes, and spectral bundles. All fees are derived from the E=hf physics engine and route to the Orbital Treasury.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/wsats">wSATS</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li></ul></nav>`,
  },
  "/rune-etching": {
    title: "WNSP•WAVELENGTHSCRIPT — NexusOS Canonical Bitcoin Rune",
    description: "NexusOS canonical Bitcoin Rune, etched at block 952596:379. Track etch status, mint progress, Runestone encoding, and on-chain deployment of the physics token.",
    canonical: `${BASE}/rune-etching`,
    ogTitle: "WNSP•WAVELENGTHSCRIPT — NexusOS Canonical Rune",
    ogDescription: "The NexusOS canonical Bitcoin Rune. Etched at block 952596:379. Track etch status, mint progress, Runestone encoding, and spectral token details.",
    twitterTitle: "WNSP•WAVELENGTHSCRIPT — NexusOS Rune",
    twitterDescription: "NexusOS canonical Bitcoin Rune. Etched at block 952596:379. Track etch status, mint progress, and on-chain deployment.",
    jsonLd: softwareApp({ url: `${BASE}/rune-etching`, name: "WNSP•WAVELENGTHSCRIPT", description: "The NexusOS canonical Bitcoin Rune etched at block 952596:379. Status dashboard for etch progress, mint progress, and on-chain deployment." }),
    bodyHtml: `<h1>WNSP•WAVELENGTHSCRIPT — NexusOS Canonical Bitcoin Rune</h1><p>WNSP•WAVELENGTHSCRIPT is the canonical Bitcoin Rune for the NexusOS physics stack — the on-chain token identity of the WNSP physics protocol. Etched at block 952596:379 with 21 billion supply, it links spectral addresses to Bitcoin's UTXO model. This page tracks the etch status, mint progress, and on-chain deployment.</p><h2>Token Details</h2><ul><li><strong>Rune name</strong>: WNSP•WAVELENGTHSCRIPT</li><li><strong>Etched at</strong>: block 952596:379</li><li><strong>Supply</strong>: 21 billion</li><li><strong>Authority</strong>: NexusOS Canonical Token — KERNEL-band</li></ul><nav><ul><li><a href="${BASE}/nxt-campaign">NEXUS•WAVELENGTH — NXT Token</a></li><li><a href="${BASE}/etch-rune">Etch a Custom Rune</a></li><li><a href="${BASE}/rune-mint">Rune Mint</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/rune-mint": {
    title: "Rune Mint — Mint Bitcoin Rune Tokens | NexusOS",
    description: "Mint Bitcoin Rune tokens using the NexusOS Rune toolchain. Rune Guard safe UTXO selection, Runestone encoding, CPFP chaining, and WNSP spectral verification.",
    canonical: `${BASE}/rune-mint`,
    ogTitle: "Rune Mint — Mint Bitcoin Rune Tokens",
    ogDescription: "Mint Bitcoin Rune tokens with safe UTXO selection, Runestone encoding, and CPFP chaining. WNSP spectral verification. Production mainnet.",
    twitterTitle: "NexusOS Rune Mint",
    twitterDescription: "Mint Bitcoin Rune tokens with safe UTXO selection and spectral verification.",
    jsonLd: softwareApp({ url: `${BASE}/rune-mint`, name: "NexusOS Rune Mint", description: "Mint Bitcoin Rune tokens with Rune Guard safe UTXO selection, Runestone encoding, and CPFP chaining on production mainnet." }),
    bodyHtml: `<h1>Rune Mint — Mint Bitcoin Rune Tokens</h1><p>Mint Bitcoin Rune tokens with the NexusOS Rune toolchain. Rune Guard ensures only safe UTXOs are used (protecting existing Rune balances), Runestone encoding uses correct tag numbers, and CPFP chaining supports high-throughput minting.</p><nav><ul><li><a href="${BASE}/rune-etching">Rune Etching</a></li><li><a href="${BASE}/nxt-campaign">NEXUS•WAVELENGTH Rune</a></li></ul></nav>`,
  },
  "/etch-rune": {
    title: "Etch a Custom Rune — Create Your Own Bitcoin Rune | NexusOS",
    description: "Create your own Bitcoin Rune with a custom image. Tapscript commit/reveal for short names, Runestone encoding, Rune Guard UTXO selection, and CPFP chaining.",
    canonical: `${BASE}/etch-rune`,
    ogTitle: "Etch a Custom Rune — NexusOS Bitcoin Rune Creator",
    ogDescription: "Design and etch your own Bitcoin Rune with a custom image. Tapscript commit/reveal, Runestone encoding, Rune Guard UTXO selection. NexusOS Bitcoin Runes toolchain.",
    twitterTitle: "Etch a Custom Rune — NexusOS",
    twitterDescription: "Create your own Bitcoin Rune with a custom image. Tapscript commit/reveal, safe UTXO selection, CPFP chaining.",
    jsonLd: softwareApp({ url: `${BASE}/etch-rune`, name: "Etch a Custom Rune — NexusOS", description: "Custom Bitcoin Rune creator. Upload an image, set a name, and etch on mainnet using tapscript commit/reveal for short names and Rune Guard UTXO protection." }),
    bodyHtml: `<h1>Etch a Custom Rune — Create Your Own Bitcoin Rune</h1><p>The NexusOS Etch-a-Rune tool lets you create your own Bitcoin Rune with a custom image. Choose a name, upload artwork, and etch on Bitcoin mainnet. Short names (under 13 characters) automatically use a tapscript commit/reveal workflow with the required 6-block gap. Rune Guard ensures only safe UTXOs are selected, protecting any existing Rune balances.</p><h2>Features</h2><ul><li>Custom Rune name and image upload</li><li>Tapscript commit/reveal for short names (&lt;13 characters) with 6-block gap</li><li>Correct Runestone encoding (verified tag numbers)</li><li>Rune Guard safe UTXO selection — protects existing Rune balances</li><li>CPFP chaining for high-throughput minting</li></ul><nav><ul><li><a href="${BASE}/rune-etching">WNSP•WAVELENGTHSCRIPT — NexusOS Canonical Rune</a></li><li><a href="${BASE}/rune-mint">Rune Mint</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li></ul></nav>`,
  },
  "/rune-staking": {
    title: "Rune Staking — Stake Bitcoin Runes for NXT Yield | NexusOS",
    description: "Stake Bitcoin Rune tokens in the NexusOS Rune Staking engine to earn NXT yield. Physics-weighted rewards, on-chain settlement, and Orbital Treasury routing.",
    canonical: `${BASE}/rune-staking`,
    jsonLd: softwareApp({ url: `${BASE}/rune-staking`, name: "NexusOS Rune Staking", description: "Stake Bitcoin Rune tokens to earn NXT yield. Physics-weighted rewards and Orbital Treasury fee routing." }),
    bodyHtml: `<h1>Rune Staking — Stake Bitcoin Runes for NXT Yield</h1><p>Stake Bitcoin Rune tokens in the NexusOS Rune Staking engine to earn NXT token yield. Rewards are physics-weighted and settle on-chain.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/rune-etching">Rune Etching</a></li></ul></nav>`,
  },
  "/rune-swap": {
    title: "Rune Swap — Swap Bitcoin Runes and NXT Tokens | NexusOS",
    description: "Swap Bitcoin Rune tokens for NXT or wSATS using the NexusOS atomic swap engine. Physics-based fee calculation, safe UTXO selection, and on-chain settlement.",
    canonical: `${BASE}/rune-swap`,
    jsonLd: softwareApp({ url: `${BASE}/rune-swap`, name: "NexusOS Rune Swap", description: "Atomic swap engine for Bitcoin Rune tokens, NXT, and wSATS. Physics-based fees, Rune Guard UTXO selection, on-chain settlement." }),
    bodyHtml: `<h1>Rune Swap — Swap Bitcoin Runes and NXT Tokens</h1><p>Swap between Bitcoin Rune tokens, NXT, and wSATS using the NexusOS atomic swap engine. Physics-based fee calculation ensures fees reflect the actual energy cost of the transaction.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/wsats">wSATS</a></li><li><a href="${BASE}/market">NexusOS Market</a></li></ul></nav>`,
  },
  "/rune-pipeline": {
    title: "Rune Pipeline — Automated Bitcoin Rune Operations | NexusOS",
    description: "NexusOS Rune Pipeline automates multi-step Rune operations: batch minting, CPFP chaining, Runestone encoding, and safe UTXO management in a single workflow.",
    canonical: `${BASE}/rune-pipeline`,
    jsonLd: softwareApp({ url: `${BASE}/rune-pipeline`, name: "NexusOS Rune Pipeline", description: "Automated multi-step Bitcoin Rune operations: batch minting, CPFP chaining, Runestone encoding, and Rune Guard UTXO management." }),
    bodyHtml: `<h1>Rune Pipeline — Automated Bitcoin Rune Operations</h1><p>The NexusOS Rune Pipeline automates complex multi-step Rune operations. Batch mint, CPFP chain, encode Runestones, and manage UTXOs safely — all in a single automated workflow.</p><nav><ul><li><a href="${BASE}/rune-etching">Rune Etching</a></li><li><a href="${BASE}/rune-mint">Rune Mint</a></li></ul></nav>`,
  },
  "/stake-earn": {
    title: "Stake &amp; Earn — NXT Staking Rewards | NexusOS",
    description: "Stake NXT tokens and earn yield on NexusOS. Physics-weighted reward rates, six lock periods, WNUSD auto-collateral, and Orbital Treasury distribution.",
    canonical: `${BASE}/stake-earn`,
    ogTitle: "Stake &amp; Earn — NXT Staking on NexusOS",
    ogDescription: "Stake NXT. Earn physics-weighted yield. Auto-mint WNUSD. Six lock periods. Orbital Treasury distribution.",
    twitterTitle: "NexusOS Stake &amp; Earn",
    twitterDescription: "Stake NXT for physics-weighted yield and WNUSD auto-collateral.",
    jsonLd: softwareApp({ url: `${BASE}/stake-earn`, name: "NexusOS Stake &amp; Earn", description: "NXT token staking with physics-weighted yield rates, six lock periods, WNUSD auto-collateral, and Orbital Treasury fee routing." }),
    bodyHtml: `<h1>Stake &amp; Earn — NXT Staking Rewards</h1><p>Stake your NXT tokens to earn physics-weighted yield and auto-mint WNUSD collateral. Six lock periods from 30 days to 2 years. All staking activity is on-chain, transparent, and fee-routed to the Orbital Treasury.</p><nav><ul><li><a href="${BASE}/wnsp-staking">WNSP Staking Detail</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li></ul></nav>`,
  },
  "/fractal-btc": {
    title: "Fractal BTC — NexusOS Bitcoin Fractal Network Integration",
    description: "NexusOS Fractal BTC: Bitcoin Fractal testnet for Rune experimentation, CE-encoded inscription testing, and WNSP spectral verification development.",
    canonical: `${BASE}/fractal-btc`,
    jsonLd: softwareApp({ url: `${BASE}/fractal-btc`, name: "NexusOS Fractal BTC", description: "Bitcoin Fractal testnet integration for Rune experimentation, CE-encoded inscription testing, and WNSP spectral verification development." }),
    bodyHtml: `<h1>Fractal BTC — Bitcoin Fractal Network Integration</h1><p>NexusOS Fractal BTC connects to the Bitcoin Fractal testnet for safe experimentation with Runes, CE-encoded inscriptions, and WNSP spectral verification before mainnet deployment.</p><nav><ul><li><a href="${BASE}/rune-etching">Rune Etching (mainnet)</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/fractal-bitcoin": {
    title: "Fractal Bitcoin — NexusOS Fractal Network | NexusOS",
    description: "NexusOS integration with the Bitcoin Fractal network for physics-native Rune and ordinal experimentation at test-network scale.",
    canonical: `${BASE}/fractal-btc`,
    jsonLd: softwareApp({ url: `${BASE}/fractal-btc`, name: "Fractal Bitcoin — NexusOS", description: "NexusOS integration with the Bitcoin Fractal network for physics-native experimentation." }),
    bodyHtml: `<h1>Fractal Bitcoin — NexusOS Fractal Network Integration</h1><p>The Fractal Bitcoin page connects to the Bitcoin Fractal network for test-scale physics-native Rune and ordinal experimentation.</p><nav><ul><li><a href="${BASE}/fractal-btc">Fractal BTC</a></li></ul></nav>`,
  },
  "/nxt-fb-swap": {
    title: "NXT ↔ Fractal BTC Swap | NexusOS",
    description: "Swap between NXT tokens and Fractal BTC (test network) using the NexusOS atomic swap engine. Physics-based fee calculation and on-chain settlement.",
    canonical: `${BASE}/nxt-fb-swap`,
    jsonLd: softwareApp({ url: `${BASE}/nxt-fb-swap`, name: "NXT ↔ Fractal BTC Swap", description: "Atomic swap between NXT tokens and Fractal BTC using the NexusOS physics engine." }),
    bodyHtml: `<h1>NXT ↔ Fractal BTC Swap</h1><p>Swap between NXT tokens and Fractal BTC using the NexusOS atomic swap engine. Physics-based fee calculation ensures fees reflect the energy cost of the swap transaction.</p><nav><ul><li><a href="${BASE}/rune-swap">Rune Swap</a></li><li><a href="${BASE}/market">NexusOS Market</a></li></ul></nav>`,
  },
  "/swap": {
    title: "NXT ↔ Fractal BTC Swap | NexusOS",
    description: "Swap between NXT tokens and Fractal BTC using the NexusOS atomic swap engine. Physics-based fee calculation and on-chain settlement.",
    canonical: `${BASE}/nxt-fb-swap`,
    ogTitle: "NXT ↔ Fractal BTC Swap",
    ogDescription: "Swap NXT tokens and Fractal BTC. Physics-based fees. On-chain settlement.",
    twitterTitle: "NXT ↔ Fractal BTC Swap",
    twitterDescription: "Swap NXT and Fractal BTC. Physics-based fees.",
    jsonLd: softwareApp({ url: `${BASE}/nxt-fb-swap`, name: "NXT ↔ Fractal BTC Swap", description: "Atomic swap between NXT tokens and Fractal BTC using the NexusOS physics engine." }),
    bodyHtml: `<h1>NXT ↔ Fractal BTC Swap</h1><p>Swap between NXT tokens and Fractal BTC using the NexusOS atomic swap engine. Physics-based fee calculation ensures fees reflect the energy cost of the swap transaction.</p><nav><ul><li><a href="${BASE}/nxt-fb-swap">NXT ↔ Fractal BTC Swap</a></li><li><a href="${BASE}/rune-swap">Rune Swap</a></li><li><a href="${BASE}/market">NexusOS Market</a></li></ul></nav>`,
  },
  "/btc-sentinel": {
    title: "BTC Sentinel — Bitcoin Transaction Monitor | NexusOS",
    description: "The NexusOS BTC Sentinel monitors Bitcoin transactions for WNSP-related activity: Rune minting, Ordinal inscriptions, and physics-signed transactions.",
    canonical: `${BASE}/btc-sentinel`,
    jsonLd: softwareApp({ url: `${BASE}/btc-sentinel`, name: "NexusOS BTC Sentinel", description: "Bitcoin transaction monitor for WNSP-related activity: Rune minting, Ordinal inscriptions, physics-signed transactions." }),
    bodyHtml: `<h1>BTC Sentinel — Bitcoin Transaction Monitor</h1><p>The NexusOS BTC Sentinel monitors Bitcoin transactions for WNSP-related activity. Track Rune minting events, Ordinal inscriptions, and physics-signed transactions in real time.</p><nav><ul><li><a href="${BASE}/blockchain">NexusOS Block Explorer</a></li><li><a href="${BASE}/mempool">Mempool Monitor</a></li></ul></nav>`,
  },
  "/btc-assets-sentinel": {
    title: "BTC Assets Sentinel — Bitcoin Asset Monitor | NexusOS",
    description: "Monitor Bitcoin Rune balances, Ordinal holdings, and UTXO state for NexusOS-linked addresses. Physics-verified asset tracking with Rune Guard UTXO safety.",
    canonical: `${BASE}/btc-assets-sentinel`,
    jsonLd: softwareApp({ url: `${BASE}/btc-assets-sentinel`, name: "NexusOS BTC Assets Sentinel", description: "Monitor Bitcoin Rune balances, Ordinal holdings, and UTXO state for NexusOS-linked addresses with Rune Guard safety." }),
    bodyHtml: `<h1>BTC Assets Sentinel — Bitcoin Asset Monitor</h1><p>Monitor your Bitcoin Rune balances, Ordinal holdings, and UTXO state for NexusOS-linked addresses. Rune Guard ensures your UTXOs are protected from accidental burning during Rune operations.</p><nav><ul><li><a href="${BASE}/btc-sentinel">BTC Sentinel</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/mempool": {
    title: "Mempool Monitor — Live Bitcoin Mempool | NexusOS",
    description: "Live Bitcoin mempool fee tracking. Monitor fastest, medium, and slow fee rates, congestion, and optimal fee windows for Rune etching and Ordinal inscriptions.",
    canonical: `${BASE}/mempool`,
    ogTitle: "NexusOS Mempool Monitor",
    ogDescription: "Live Bitcoin mempool: fastest, medium, and slow fee rates. Congestion level, pending tx count. Optimal fee windows for Rune etching and Ordinal inscriptions.",
    twitterTitle: "NexusOS Mempool Monitor",
    twitterDescription: "Live Bitcoin mempool fee rates. Congestion level. Optimal windows for Rune and Ordinal operations.",
    jsonLd: softwareApp({ url: `${BASE}/mempool`, name: "NexusOS Mempool Monitor", description: "Live Bitcoin mempool fee tracking: fastest, medium, and slow fee rates, congestion levels, and pending transaction counts for Rune and Ordinal operations." }),
    bodyHtml: `<h1>Mempool Monitor — Live Bitcoin Mempool</h1><p>The NexusOS Mempool Monitor tracks live Bitcoin mempool fee rates and congestion levels. Use it to select optimal fees for Rune etching, Ordinal inscriptions, and NXT/wSATS transactions on-chain.</p><ul><li>Fastest fee rate: target 1-2 block confirmation</li><li>Medium fee rate: target 3-6 block confirmation</li><li>Slow fee rate: target next hour</li><li>Congestion level: low / medium / high / extreme</li><li>Pending transaction count and mempool vbyte size</li></ul><nav><ul><li><a href="${BASE}/rune-etching">Rune Etching</a></li><li><a href="${BASE}/btc-sentinel">BTC Sentinel</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/receive": {
    title: "Receive — Accept NXT Tokens and Payments | NexusOS",
    description: "Receive NXT tokens and satoshi payments on NexusOS. Generate your Ψ channel receive address, display a QR code, and track incoming transactions on-chain.",
    canonical: `${BASE}/receive`,
    jsonLd: softwareApp({ url: `${BASE}/receive`, name: "NexusOS Receive", description: "Receive NXT tokens and satoshi payments. Spectral receive address (Ψ channel), QR code generation, incoming transaction tracking." }),
    bodyHtml: `<h1>Receive — Accept NXT Tokens and Payments</h1><p>Your NexusOS receive address is your Ψ channel spectral address — deterministically derived from your phone number via CE encoding. Share your Ψ channel address or QR code to receive NXT tokens and satoshi payments.</p><nav><ul><li><a href="${BASE}/blockchain">Block Explorer</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li></ul></nav>`,
  },
  "/portfolio": {
    title: "Portfolio — NXT Balance, Rune Holdings, and Spectral Assets",
    description: "NexusOS portfolio: NXT balance, Bitcoin Rune holdings, wSATS, staking positions, WNUSD collateral, and spectral channel assignments. 8-decimal precision.",
    canonical: `${BASE}/portfolio`,
    jsonLd: softwareApp({ url: `${BASE}/portfolio`, name: "NexusOS Portfolio", description: "Portfolio overview: NXT balance, Bitcoin Rune holdings, wSATS balance, staking positions, WNUSD collateral, and spectral channel assignments." }),
    bodyHtml: `<h1>Portfolio — NXT Balance, Rune Holdings, and Spectral Assets</h1><p>Your NexusOS portfolio aggregates all your physics-native assets in one view: NXT token balance (8 decimals), Bitcoin Rune holdings, wrapped satoshis (wSATS), staking positions with yield accrual, WNUSD auto-collateral, and your Ψ channel spectral address assignments.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/wnsp-staking">Staking</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li></ul></nav>`,
  },
  "/lp-pools": {
    title: "LP Pools — Liquidity Provision for NexusOS Markets | NexusOS",
    description: "Provide liquidity to NexusOS pools. Earn physics-weighted yields on NXT/wSATS and NXT/Rune pairs. On-chain settlement with Orbital Treasury routing.",
    canonical: `${BASE}/lp-pools`,
    jsonLd: softwareApp({ url: `${BASE}/lp-pools`, name: "NexusOS LP Pools", description: "Liquidity provision for NexusOS markets. Physics-weighted yields on NXT/wSATS and NXT/Rune pairs. On-chain settlement, Orbital Treasury routing." }),
    bodyHtml: `<h1>LP Pools — Liquidity Provision for NexusOS Markets</h1><p>Provide liquidity to NexusOS market pools and earn physics-weighted yield. Supported pairs include NXT/wSATS and NXT/Rune tokens. All LP fees route to the Orbital Treasury before redistribution.</p><nav><ul><li><a href="${BASE}/market">NexusOS Market</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/nxt-campaign">NXT Token</a></li></ul></nav>`,
  },
  "/airdrop": {
    title: "NexusOS Airdrop — NXT Token Distribution",
    description: "NexusOS NXT airdrop distributes tokens to early members, hardware supporters, and spectral network contributors. Physics-governed Orbital Treasury allocation.",
    canonical: `${BASE}/airdrop`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "NexusOS Airdrop",
      "url": `${BASE}/airdrop`,
      "description": "NXT token airdrop for early community members, hardware supporters, and spectral network contributors. Allocation governed by the Orbital Treasury.",
      "about": { "@type": "Organization", "name": "NexusOS", "url": `${BASE}/` },
    },
    bodyHtml: `<h1>NexusOS Airdrop — NXT Token Distribution</h1><p>The NexusOS NXT airdrop distributes tokens to early community members, hardware supporters, and spectral network contributors. All airdrop allocations are governed by the Orbital Treasury on-chain — transparent, physics-enforced.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/orbital-treasury">Orbital Treasury</a></li><li><a href="${BASE}/community-mint">Community Mint</a></li></ul></nav>`,
  },
  "/coinsniper": {
    title: "CoinSniper — NexusOS Token Discovery and Voting",
    description: "NexusOS on CoinSniper: vote for the NXT token (NEXUS•WAVELENGTH) and discover other physics-native assets in the NexusOS ecosystem.",
    canonical: `${BASE}/coinsniper`,
    jsonLd: softwareApp({ url: `${BASE}/coinsniper`, name: "NexusOS CoinSniper", description: "NexusOS token discovery and voting page. Vote for NEXUS•WAVELENGTH (NXT) and discover physics-native ecosystem assets." }),
    bodyHtml: `<h1>CoinSniper — NexusOS Token Discovery and Voting</h1><p>Vote for the NXT token (NEXUS•WAVELENGTH) on CoinSniper and discover other physics-native assets in the NexusOS ecosystem. Every vote helps surface WNSP-based projects to a broader audience of crypto enthusiasts who may not yet know that physics is a better foundation than cryptography.</p><nav><ul><li><a href="${BASE}/nxt-campaign">NXT Token</a></li><li><a href="${BASE}/ecosystem">NexusOS Ecosystem</a></li></ul></nav>`,
  },
  "/quest": {
    title: "NexusOS Quests — Complete Missions to Earn NXT | NexusOS",
    description: "Complete NexusOS quests to earn NXT. Missions: CE encode text, stake NXT, vote on governance, run a spectral node, save to Spectral DB, run WavelengthScript.",
    canonical: `${BASE}/quest`,
    ogTitle: "NexusOS Quests — Earn NXT by Exploring the Stack",
    ogDescription: "CE encode your first text. Stake NXT. Vote on governance. Run a node. Complete quests and earn NXT from the Orbital Treasury.",
    twitterTitle: "NexusOS Quests",
    twitterDescription: "Complete missions. Earn NXT. Explore the physics stack.",
    jsonLd: softwareApp({ url: `${BASE}/quest`, name: "NexusOS Quests", description: "Mission-based NXT token rewards for exploring and using the NexusOS physics stack. CE encoding, staking, governance voting, and node operation quests." }),
    bodyHtml: `<h1>NexusOS Quests — Complete Missions to Earn NXT</h1><p>NexusOS quests reward you with NXT tokens for exploring and using the physics stack. Each quest is a guided introduction to a core NexusOS feature — complete the mission, earn NXT from the Orbital Treasury.</p><h2>Available Quests</h2><ul><li>Encode your first text with the CE encoder → earn NXT</li><li>Stake NXT for the first time → earn NXT</li><li>Vote on a governance proposal (KERNEL-band) → earn NXT</li><li>Run a spectral network node for 7 days → earn NXT</li><li>Save a spectral fingerprint to the Spectral DB → earn NXT</li><li>Submit a WavelengthScript program to the WNSP VM → earn NXT</li></ul><nav><ul><li><a href="${BASE}/encode">Live CE Encoder</a></li><li><a href="${BASE}/wnsp-staking">Staking</a></li><li><a href="${BASE}/developer">Developer Portal</a></li></ul></nav>`,
  },
  "/replit-template": {
    title: "NexusOS Replit Template — Physics-Native Starter Project",
    description: "Fork the official NexusOS Replit template. Pre-configured with CE encoder, WNSP protocol library, and WavelengthScript toolchain. Physics-native apps fast.",
    canonical: `${BASE}/replit-template`,
    ogTitle: "NexusOS Replit Template",
    ogDescription: "Fork the official NexusOS Replit template. Pre-configured CE encoder, WNSP library, WavelengthScript toolchain. Build physics-native apps in minutes.",
    twitterTitle: "NexusOS Replit Template",
    twitterDescription: "Fork the official NexusOS template on Replit. CE encoder + WNSP + WavelengthScript pre-configured.",
    jsonLd: softwareApp({ url: `${BASE}/replit-template`, name: "NexusOS Replit Template", description: "Official Replit starter template for NexusOS development. Pre-configured with the CE encoder, WNSP protocol library, and WavelengthScript toolchain." }),
    bodyHtml: `<h1>NexusOS Replit Template — Physics-Native Starter Project</h1><p>The official NexusOS Replit template is the fastest way to start building a physics-native application. Fork the template and you immediately have: the CE encoder (npm installed), WNSP protocol library, WavelengthScript toolchain, and example programs for wallet operations, governance, and P2P transfers.</p><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li><li><a href="${BASE}/docs">Documentation</a></li></ul></nav>`,
  },
  // ── Legacy redirect paths — provide metadata so crawlers see a redirect target, not home fallback ──
  "/spectral-video": {
    title: "Spectral Video — NexusOS Physics Demonstrations",
    description: "NexusOS spectral video demonstrations. Physics-native video content for the WNSP protocol.",
    canonical: `${BASE}/videos`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "NexusOS Spectral Video Demonstrations",
      "url": `${BASE}/videos`,
      "description": "Spectral video demonstrations of the NexusOS physics stack.",
      "inLanguage": "en",
      "publisher": { "@type": "Organization", "name": "NexusOS", "url": BASE },
    },
  },
  "/spectral-uri": {
    title: "Spectral URI — WNSP-URI v1.0 Addressing",
    description: "WNSP-URI v1.0 spectral address format: wnsp://Ψ(wdm,oam,pol)/path. Deterministic, physics-based, censorship-proof addressing for the NexusOS network.",
    canonical: `${BASE}/wnsp`,
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/wnsp`, name: "WNSP-URI v1.0", description: "Spectral URI addressing: wnsp://Ψ(wdm,oam,pol)/path. Deterministic physics-based addressing.", about: "WNSP-URI, spectral addressing, wnsp protocol", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
  },
  "/wnsp-uri": {
    title: "WNSP-URI — Wavelength-Native Spectral URI Addressing",
    description: "WNSP-URI v1.0: wnsp://Ψ(wdm,oam,pol)/path. Deterministic physics-based addressing that replaces DNS with electromagnetic channel coordinates.",
    canonical: `${BASE}/wnsp`,
    ogType: "article",
    jsonLd: techArticle({ url: `${BASE}/wnsp`, name: "WNSP-URI v1.0 — Spectral Addressing", description: "WNSP-URI addressing scheme: wnsp://Ψ(wdm,oam,pol)/path. Deterministic, censorship-proof, physics-derived addresses.", about: "WNSP-URI, spectral addressing, DNS-free routing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
  },
  "/visualizer": {
    title: "NexusOS Visualizer — Spectral Network and Compression Curve",
    description: "Visual tools for NexusOS: spectral network topology, compression curve explorer, Ψ channel maps, and authority band distribution.",
    canonical: `${BASE}/compression-explorer`,
    jsonLd: softwareApp({ url: `${BASE}/compression-explorer`, name: "NexusOS Visualizer", description: "Visual exploration of the NexusOS physics stack: network topology, compression curve, Ψ channel maps." }),
  },
  // /btc-bridge is a 301 redirect to /wnsp/ordinals — no metadata entry needed.

  // ── Previously missing public routes — now with per-route metadata ────────
  "/nexus-analytics": {
    title: "NexusOS Analytics — Traffic, Bots, and Spectral Threat Dashboard",
    description: "Live NexusOS traffic analytics: human vs. bot breakdown, top pages, crawler identification, threat probes, country distribution, and SEO issue detection.",
    canonical: `${BASE}/nexus-analytics`,
    ogTitle: "NexusOS Analytics Dashboard",
    ogDescription: "Live traffic: human vs. bot, top pages, crawler IDs, threat probes, country distribution. Real-time NexusOS network intelligence.",
    twitterTitle: "NexusOS Analytics Dashboard",
    twitterDescription: "Live traffic analytics: bots, humans, threats, top pages. NexusOS network intelligence.",
    jsonLd: softwareApp({ url: `${BASE}/nexus-analytics`, name: "NexusOS Analytics Dashboard", description: "Real-time traffic analytics for NexusOS: human vs. bot breakdown, crawler identification, threat probe detection, SEO signals." }),
    bodyHtml: `<h1>NexusOS Analytics — Traffic, Bots, and Spectral Threat Dashboard</h1><p>The NexusOS Analytics Dashboard provides real-time visibility into who is accessing the network and how. It separates human traffic from bot traffic, identifies crawlers by name (GPTBot, ClaudeBot, Googlebot, and more), surfaces threat probes by path and country, and flags SEO issues caused by 404-heavy bot paths.</p><h2>Dashboard Panels</h2><ul><li><strong>Traffic Summary</strong>: total hits, human vs. bot split, top pages, top bots</li><li><strong>Country Distribution</strong>: geographic breakdown of all requests</li><li><strong>Threat Probes</strong>: paths probed for vulnerabilities, country of origin, unique IPs</li><li><strong>Recent Hits</strong>: live request stream with status codes, bot flags, and user agents</li><li><strong>SEO Issues</strong>: paths returning 404 to bots that indicate missed indexation opportunities</li></ul><h2>Time Windows</h2><p>All panels are available over 1-hour, 24-hour, 7-day, and 30-day windows for trend analysis.</p><nav><ul><li><a href="${BASE}/nexus-analytics">Open Analytics Dashboard</a></li><li><a href="${BASE}/nexus-explorer">Nexus Explorer — blockchain transactions</a></li><li><a href="${BASE}/network">Spectral Network Map</a></li></ul></nav>`,
  },
  "/nexus-explorer": {
    title: "Nexus Explorer — NexusOS Blockchain & Transaction Explorer",
    description: "Explore the NexusOS physics blockchain: browse blocks, transactions, NXT token transfers, wallet balances, and spectral channel activity in real time.",
    canonical: `${BASE}/nexus-explorer`,
    ogTitle: "Nexus Explorer — NexusOS Blockchain Explorer",
    ogDescription: "Browse NexusOS blocks, NXT transactions, wallet balances, and spectral channel activity. Physics-based blockchain transparency.",
    twitterTitle: "Nexus Explorer — NexusOS Blockchain",
    twitterDescription: "Browse blocks, NXT transactions, wallet balances, spectral channels. NexusOS blockchain explorer.",
    jsonLd: softwareApp({ url: `${BASE}/nexus-explorer`, name: "Nexus Explorer", description: "Block and transaction explorer for the NexusOS physics blockchain. Browse NXT transfers, wallet balances, and Ψ channel activity." }),
    bodyHtml: `<h1>Nexus Explorer — NexusOS Blockchain & Transaction Explorer</h1><p>The Nexus Explorer is the public block and transaction explorer for the NexusOS physics blockchain. Unlike conventional blockchain explorers, every transaction here is governed by electromagnetic physics: fees are photon energies (E = hf), addresses are wavelengths, and block validation uses Maxwell equation consistency checks.</p><h2>What You Can Explore</h2><ul><li><strong>Blocks</strong>: block height, timestamp, transaction count, spectral hash</li><li><strong>Transactions</strong>: NXT token transfers, fee amounts, sender/receiver Ψ channels, authority band</li><li><strong>Wallets</strong>: NXT balance, wSATS balance, staked amount, WNUSD collateral, spectral address</li><li><strong>Spectral Channels</strong>: Ψ channel activity, OAM mode usage, polarisation state</li></ul><h2>Physics-Based Transparency</h2><p>Every fee on the NexusOS blockchain is deterministic — derived from the sender's wavelength and the reference energy level. The explorer displays the raw physics parameters alongside each transaction so anyone can independently verify the fee calculation.</p><nav><ul><li><a href="${BASE}/nexus-explorer">Open Nexus Explorer</a></li><li><a href="${BASE}/blockchain">Block Explorer (full)</a></li><li><a href="${BASE}/nxt-campaign">NXT Token Information</a></li></ul></nav>`,
  },
  "/spectral-ide": {
    title: "Spectral IDE — WavelengthScript Dev Environment",
    description: "Write WavelengthScript programs, transpile from any language, compile to WNSP bytecode, deploy as on-chain contracts, and inspect Ψ channel register state.",
    canonical: `${BASE}/spectral-ide`,
    ogTitle: "Spectral IDE — WavelengthScript IDE",
    ogDescription: "Write, transpile, compile, and deploy WavelengthScript programs. WNSP VM bytecode inspection. Physics-native smart contracts.",
    twitterTitle: "Spectral IDE — WavelengthScript IDE",
    twitterDescription: "Write WavelengthScript, compile to bytecode, inspect Ψ registers, deploy on-chain. Physics-native development.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-ide`, name: "Spectral IDE", description: "WavelengthScript IDE: transpile from any language, compile to WNSP VM bytecode, inspect Ψ channel registers, and deploy smart contracts." }),
    bodyHtml: `<h1>Spectral IDE — WavelengthScript Integrated Development Environment</h1><p>The Spectral IDE is the full development environment for writing physics-native programs on NexusOS. It combines the CE→SE transpilation pipeline, the WavelengthScript compiler, the WNSP VM bytecode interpreter, and on-chain contract deployment into a single browser-based workflow.</p><h2>IDE Features</h2><ul><li><strong>Multi-language import</strong>: paste Python, JavaScript, TypeScript, Rust, Go, Solidity, Java, C++, Swift, or Kotlin — the transpiler converts it to WavelengthScript</li><li><strong>Physics annotations</strong>: each statement is annotated with its Ψ channel (wavelength, OAM mode, polarisation) and authority band</li><li><strong>Bytecode compiler</strong>: compile WavelengthScript to WNSP VM opcodes; inspect the instruction stream before execution</li><li><strong>Step execution</strong>: run the bytecode instruction-by-instruction and watch Ψ channel register state update in real time</li><li><strong>Contract deployment</strong>: deploy compiled bytecode as an on-chain NexusOS smart contract with an auto-generated public URL at <code>/app/:slug</code></li></ul><h2>Authority Bands in the IDE</h2><p>The IDE displays the authority band for every instruction: SYSTEM (ultraviolet), KERNEL, USER, GUEST (infrared). Higher bands require higher spectral energy and larger fees. Programs can be designed to operate within a specific band budget.</p><nav><ul><li><a href="${BASE}/spectral-ide">Open Spectral IDE</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (browser tool)</a></li><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Spec</a></li></ul></nav>`,
  },
  "/contact": {
    title: "Contact NexusOS — Regulatory, Investment, Developer & Security",
    description: "Reach NexusOS through the right channel: regulatory inquiry, institutional investment, developer integration, or responsible security disclosure.",
    canonical: `${BASE}/contact`,
    ogTitle: "Contact NexusOS",
    ogDescription: "Four contact tracks: regulatory inquiry, investment & partnership, developer integration, and security disclosure. NexusOS is AGPL-3.0.",
    twitterTitle: "Contact NexusOS",
    twitterDescription: "Regulatory, investment, developer, or security — four structured contact tracks. AGPL-3.0.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact NexusOS",
      "url": `${BASE}/contact`,
      "description": "Four contact tracks for NexusOS: regulatory inquiry, institutional investment and partnership, developer integration, and responsible security disclosure.",
      "contactPoint": [
        { "@type": "ContactPoint", "contactType": "technical support", "availableLanguage": "English" },
        { "@type": "ContactPoint", "contactType": "security", "availableLanguage": "English" },
      ],
    },
    bodyHtml: `<h1>Contact NexusOS</h1><p>NexusOS is governed under AGPL-3.0 and operates as open-source infrastructure for a Kardashev Type I civilization operating system. The right contact track depends on your purpose.</p><h2>Contact Tracks</h2><ul><li><strong>Regulatory Inquiry</strong>: for regulators, compliance teams, and government bodies assessing NexusOS under applicable virtual asset frameworks. NXT was distributed as a free airdrop — no investment of money occurred. All token holders are community participants, not investors.</li><li><strong>Investment &amp; Partnership</strong>: for sovereign wealth funds, institutional investors, and strategic partners evaluating NexusOS as infrastructure. NexusOS holds 6.2B+ sats on Lightning Network. 20+ founding shareholders received NXT at zero cost basis.</li><li><strong>Developer Integration</strong>: for developers and teams building integrations using the NexusOS API, CE encoder (npm/pip), or WNSP protocol. Full REST + WebSocket API available. Developer keys require NXT creation fee.</li><li><strong>Security Disclosure</strong>: for security researchers reporting vulnerabilities under responsible disclosure. All reports acknowledged within 48 hours. See <a href="${BASE}/.well-known/security.txt">security.txt</a> for the machine-readable policy.</li></ul><nav><ul><li><a href="${BASE}/developer">Developer Portal</a></li><li><a href="${BASE}/open">Open Charter (AGPL-3.0)</a></li><li><a href="${BASE}/constitution">NexusOS Constitution</a></li></ul></nav>`,
  },
  "/labs": {
    title: "NexusOS Labs — Global Engineering Lab Network",
    description: "Global network of engineering labs, universities, and independent researchers building the physical hardware layer of the NexusOS physics stack. AGPL-3.0.",
    canonical: `${BASE}/labs`,
    ogTitle: "NexusOS Labs — Global Engineering Lab Network",
    ogDescription: "Engineering labs, universities, and independent researchers building NexusOS hardware: SNIC, PHR-1, Spectral Relay Mesh. Join the network.",
    twitterTitle: "NexusOS Labs",
    twitterDescription: "Global lab network building SNIC, PHR-1, Spectral Relay Mesh. Join NexusOS hardware research.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ResearchProject",
      "name": "NexusOS Labs",
      "url": `${BASE}/labs`,
      "description": "Global network of engineering labs, universities, and independent researchers building the physical hardware layer of the NexusOS physics stack: SNIC optical demonstrator, PHR-1 resonator, Spectral Relay Mesh v1.",
      "about": { "@type": "Thing", "name": "Photonic computing hardware for WNSP spectral communication" },
    },
    bodyHtml: `<h1>NexusOS Labs — Global Engineering Lab Network</h1><p>NexusOS Labs is the distributed hardware research arm of NexusOS. Labs, universities, and independent researchers around the world are building the physical infrastructure that will run the WNSP spectral protocol in silicon and photonics (~2032 target).</p><h2>What Labs Build</h2><ul><li><strong>SNIC (Spectral Network Interface Card)</strong>: the optical demonstrator that maps ${PSI_CHANNELS} WNSP Ψ channels to physical waveguide lanes using WDM × OAM × polarisation multiplexing</li><li><strong>PHR-1 Resonator</strong>: the physics hardware resonator for sub-mm wave experiments validating the Λ=hf/c² compression curve</li><li><strong>Spectral Relay Mesh v1</strong>: the multi-node relay network for testing WNSP-native packet routing without DNS</li></ul><h2>How to Join</h2><ol><li><strong>Hardware</strong>: assemble your lab — spectrometer, compute, network connection. The physics engine speaks in wavelengths; your hardware is the receiver.</li><li><strong>Sync Code</strong>: clone the NexusOS repo (AGPL-3.0), run the hardware calibration verifier at <code>/hardware-lab</code>, and confirm your spectrometer readings match the PHR-1 reference curve.</li><li><strong>Connect</strong>: register your lab node on the Spectral Network. Your node gets a Ψ channel address and joins the relay mesh.</li><li><strong>Collaborate</strong>: contribute hardware research improvements — all hardware specs are AGPL-3.0, so improvements must be open-sourced.</li></ol><nav><ul><li><a href="${BASE}/labs">Join NexusOS Labs</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/hardware-lab">Hardware Calibration Lab</a></li><li><a href="${BASE}/network">Spectral Network Map</a></li></ul></nav>`,
  },
  "/build-catalogue": {
    title: "NexusOS Build Catalogue — Feature & Improvement Log",
    description: "Searchable log of every shipped NexusOS feature and improvement. Filter by physics, protocol, security, analytics, SEO, wallet, or infrastructure category.",
    canonical: `${BASE}/build-catalogue`,
    ogTitle: "NexusOS Build Catalogue",
    ogDescription: "Every shipped NexusOS feature and protocol improvement. Searchable by category: physics, protocol, security, analytics, wallet, infrastructure.",
    twitterTitle: "NexusOS Build Catalogue",
    twitterDescription: "Searchable log of every NexusOS build: physics, protocol, security, wallet, infrastructure. Open and transparent.",
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "NexusOS Build Catalogue",
      "url": `${BASE}/build-catalogue`,
      "description": "Categorised log of every shipped NexusOS feature and improvement: physics engine, WNSP protocol, security, analytics, SEO, wallet, infrastructure, and more.",
    },
    bodyHtml: `<h1>NexusOS Build Catalogue — Feature & Improvement Log</h1><p>The Build Catalogue is the transparent, searchable record of everything shipped in NexusOS. Every entry is tagged with a category, an impact level, and a commit reference so engineers and researchers can trace any feature back to its implementation.</p><h2>Categories</h2><ul><li><strong>Physics</strong>: changes to the core physics engine, CE encoding, compression curve, Λ calculations</li><li><strong>Protocol</strong>: WNSP protocol updates, WNSP VM opcodes, WavelengthScript compiler, CE→SE pipeline</li><li><strong>Security</strong>: authentication, authority band enforcement, UTXO guard, rune protection</li><li><strong>Analytics</strong>: traffic monitoring, bot detection, threat probe identification</li><li><strong>SEO</strong>: metadata injection, canonical URLs, JSON-LD structured data, AI-readable body content</li><li><strong>Wallet</strong>: NXT token, wSATS, staking, WNUSD auto-collateral, Lightning integration</li><li><strong>Infrastructure</strong>: database schema, API routes, Python kernel, dual-runtime architecture</li></ul><h2>Impact Levels</h2><p>Each build is marked high, medium, or low impact. High-impact builds touch the physics engine, protocol specification, or economic layer. Medium-impact builds extend existing features. Low-impact builds fix edge cases or improve developer experience.</p><nav><ul><li><a href="${BASE}/build-catalogue">Open Build Catalogue</a></li><li><a href="${BASE}/roadmap">NexusOS Roadmap</a></li><li><a href="${BASE}/build">Build With NexusOS</a></li></ul></nav>`,
  },
  "/psi-board": {
    title: "Ψ Board — Live Spectral Signal Monitor | NexusOS",
    description: "Real-time monitor for WNSP spectral signals across SYSTEM, KERNEL, USER, and GUEST authority bands. Watch Ψ channel activity and the live event stream.",
    canonical: `${BASE}/psi-board`,
    ogTitle: "Ψ Board — Live Spectral Signal Monitor",
    ogDescription: "Real-time monitor for WNSP spectral signals across SYSTEM, KERNEL, USER, and GUEST authority bands. Visualise Ψ channel activity on the NexusOS physics network.",
    twitterTitle: "Ψ Board — Live WNSP Signal Monitor",
    twitterDescription: "Live spectral signal board for the NexusOS physics network. Watch Ψ channel events across all authority bands in real time.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "NexusOS Ψ Board",
      "url": `${BASE}/psi-board`,
      "description": "Real-time monitor for WNSP spectral signals. Displays live Ψ channel events, authority-band activity counts, and a scrolling signal stream for the NexusOS physics network.",
      "applicationCategory": "DeveloperApplication",
      "about": { "@type": "Thing", "name": "WNSP spectral communication protocol signal monitoring" },
    },
    bodyHtml: `<h1>Ψ Board — Live Spectral Signal Monitor</h1><p>The Ψ Board is a real-time dashboard that displays every WNSP spectral signal emitted on the NexusOS network as it happens. Each signal is mapped to a wavelength in the visible spectrum (380–780 nm) and placed in one of four authority bands: SYSTEM, KERNEL, USER, or GUEST.</p><h2>What the Ψ Board Shows</h2><ul><li><strong>Live canvas</strong>: animated wavelength pulses sweep across the visible-light spectrum — each pulse is a real network event encoded as a physical wavelength</li><li><strong>Band counters</strong>: running signal totals for SYSTEM (violet, &lt;450 nm), KERNEL (blue, 450–490 nm), USER (green, 490–565 nm), and GUEST (orange, 565–780 nm)</li><li><strong>Signal stream</strong>: timestamped list of recent events showing Ψ channel address, band, and label</li><li><strong>Network stats</strong>: total signals, active channels, on-chain records, and pool entries</li></ul><h2>How WNSP Signals Work</h2><p>Every action in NexusOS — a wallet transfer, a governance vote, a smart contract execution — is encoded as a spectral event. The CE (Character Encoding) layer maps the action label to a wavelength (λ nm) using the 128-band WASCII table. The SE (Spectral Encoding) layer wraps it in a physical wave frame (frequency, energy E=hf, OAM mode, polarisation). The Ψ Board captures these frames as they arrive and renders them as light pulses at their native wavelength.</p><h2>Authority Bands</h2><p>The WNSP authority model uses wavelength to encode permission level. Shorter wavelengths carry higher energy and higher authority. The four public bands visible on the Ψ Board correspond to the four NexusOS permission tiers: SYSTEM commands the ultraviolet edge, GUEST sits in the red-to-infrared boundary.</p><nav><ul><li><a href="${BASE}/psi-board">Open Ψ Board</a></li><li><a href="${BASE}/compression-explorer">Compression State Explorer (Λ=hf/c²)</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Spec</a></li><li><a href="${BASE}/blockchain">WNSP Blockchain Explorer</a></li></ul></nav>`,
  },
};

// ── HTML meta injection ───────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BASE_OG_IMAGE = "https://wnsp.io/opengraph.jpg";

function buildMetaBlock(m: PageMeta): string {
  const title       = esc(m.title);
  const desc        = esc(m.description);
  const canonical   = esc(m.canonical);
  const ogTitle     = esc(m.ogTitle ?? m.title);
  const ogDesc      = esc(m.ogDescription ?? m.description);
  const ogSite      = esc(m.ogSiteName ?? "NexusOS");
  const twTitle     = esc(m.twitterTitle ?? m.title);
  const twDesc      = esc(m.twitterDescription ?? m.description);
  const ogUrl       = canonical;
  const ogImage     = esc(m.ogImage ?? BASE_OG_IMAGE);
  const twImage     = ogImage;

  const jsonLdBlocks = m.jsonLd
    ? (Array.isArray(m.jsonLd) ? m.jsonLd : [m.jsonLd])
        .map((obj) => `<script type="application/ld+json">\n    ${JSON.stringify(obj, null, 2).replace(/\n/g, "\n    ")}\n    </script>`)
        .join("\n    ")
    : "";

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${ogTitle}" />`,
    `<meta property="og:description" content="${ogDesc}" />`,
    `<meta property="og:type" content="${esc(m.ogType ?? "website")}" />`,
    `<meta property="og:url" content="${ogUrl}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:site_name" content="${ogSite}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="${esc(m.twitterSite ?? "@NexusOS_io")}" />`,
    `<meta name="twitter:title" content="${twTitle}" />`,
    `<meta name="twitter:description" content="${twDesc}" />`,
    `<meta name="twitter:image" content="${twImage}" />`,
    jsonLdBlocks,
  ].filter(Boolean).join("\n    ");
}

const META_PLACEHOLDER_RE = [
  /<title>[^<]*<\/title>/,
  /<meta name="description"[^>]*\/>/,
  /<link rel="canonical"[^>]*\/>/,
  /<meta property="og:title"[^>]*\/>/,
  /<meta property="og:description"[^>]*\/>/,
  /<meta property="og:type"[^>]*\/>/,
  /<meta property="og:url"[^>]*\/>/,
  /<meta property="og:image"[^>]*\/>/,
  /<meta property="og:site_name"[^>]*\/>/,
  /<meta property="og:locale"[^>]*\/>/,
  /<meta name="twitter:card"[^>]*\/>/,
  /<meta name="twitter:site"[^>]*\/>/,
  /<meta name="twitter:title"[^>]*\/>/,
  /<meta name="twitter:description"[^>]*\/>/,
  /<meta name="twitter:image"[^>]*\/>/,
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
];

// Minimal shape of a TelegramVideo used for video schema generation.
interface VideoForSchema {
  id: number;
  fileId: string;
  fileSize: number | null;
  caption: string | null;
  duration: number | null;
  channelUsername: string | null;
  channelPostId: number | null;
  messageId: number | null;
  thumbFileId: string | null;
  createdAt: string | Date;
}

/** 20 MB — Telegram bot download cap; matches client/src/pages/video-detail.tsx */
const TG_STREAM_THRESHOLD = 20 * 1024 * 1024;

function isStreamable(v: VideoForSchema): boolean {
  // Treat unknown size as streamable (conservative); large files are Telegram-only.
  return v.fileSize === null || v.fileSize <= TG_STREAM_THRESHOLD;
}

function videoStreamUrl(v: VideoForSchema): string {
  return `${BASE}/api/telegram/video/${encodeURIComponent(v.fileId)}/stream`;
}

function fmtIsoDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `PT${h > 0 ? h + "H" : ""}${m > 0 ? m + "M" : ""}${s}S`;
}

function videoTelegramUrl(v: VideoForSchema): string {
  if (v.channelUsername && v.channelPostId) return `https://t.me/${v.channelUsername}/${v.channelPostId}`;
  if (v.channelUsername && v.messageId)     return `https://t.me/${v.channelUsername}/${v.messageId}`;
  return "https://t.me/nexusosdaily";
}

// First-party NexusOS URL for a video's detail page — the canonical
// crawlable destination. Telegram remains a secondary/outbound (sameAs)
// link for playback syndication, never the primary schema URL.
function videoFirstPartyUrl(v: VideoForSchema): string {
  return `${BASE}/videos/${v.id}`;
}

/**
 * Build a live PageMeta for /videos using real video records from the DB.
 * Pass the result into injectCustomMeta() instead of injectMeta().
 *
 * JSON-LD strategy: emit VideoObject entries as top-level schema entities
 * (alongside the CollectionPage) so Google's video indexer can discover each
 * item directly without having to traverse hasPart nesting.
 */
export function buildVideosPageMeta(videos: VideoForSchema[]): PageMeta {
  const baseEntry = ROUTE_META["/videos"];
  const publisher = {
    "@type": "Organization",
    "name": "NexusOS",
    "url": BASE,
    "logo": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
  };

  // Build top-level VideoObject entries — Google's video rich-result spec
  // requires VideoObject to appear at the top level of JSON-LD, not nested
  // inside CollectionPage.hasPart, to be eligible for video carousels.
  const videoObjects = videos.slice(0, 20).map(v => {
    const uploadDate = new Date(v.createdAt).toISOString().split("T")[0];
    const tgUrl      = videoTelegramUrl(v);
    const fpUrl      = videoFirstPartyUrl(v);
    const name       = v.caption ? v.caption.slice(0, 110) : `NexusOS Video #${v.id}`;
    const streamable = isStreamable(v);
    const obj: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "name": name,
      "description": v.caption ?? "NexusOS physics demonstration video.",
      "uploadDate": uploadDate,
      "url": fpUrl,
      // contentUrl must point to the actual playable media file, not the HTML page.
      "contentUrl": streamable ? videoStreamUrl(v) : tgUrl,
      "sameAs": tgUrl,
      "publisher": publisher,
    };
    // embedUrl is only valid when NexusOS actually embeds a player on the page.
    // Large videos (>20 MB) cannot be streamed via the bot API and are
    // Telegram-only, so we omit embedUrl for those.
    if (streamable) obj["embedUrl"] = fpUrl;
    if (v.thumbFileId) {
      obj["thumbnailUrl"] = `${BASE}/api/telegram/video/${encodeURIComponent(v.thumbFileId)}/thumb`;
    } else {
      obj["thumbnailUrl"] = "https://wnsp.io/opengraph.jpg";
    }
    if (v.duration) obj["duration"] = fmtIsoDuration(v.duration);
    return obj;
  });

  // CollectionPage references the VideoObjects as hasPart (without @context
  // on each child — they share the top-level array context).
  const hasPart = videoObjects.map(o => {
    const { "@context": _ctx, ...rest } = o as Record<string, unknown>;
    return rest;
  });

  const collectionPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "NexusOS Videos — Physics, Protocol, and Hardware Demonstrations",
    "url": `${BASE}/videos`,
    "description": "Video demonstrations of the NexusOS physics stack: CE encoding live, WNSP VM execution, hardware lab measurements, and the Theory of Compression States explained.",
    "inLanguage": "en",
    "about": [
      { "@type": "Thing", "name": "WNSP Spectral Communication Protocol" },
      { "@type": "Thing", "name": "Theory of Compression States" },
      { "@type": "Thing", "name": "WavelengthScript" },
      { "@type": "Thing", "name": "CE-SE Encoding Pipeline" },
    ],
    "publisher": publisher,
    "hasPart": hasPart.length > 0 ? hasPart : (baseEntry as any)?.jsonLd?.hasPart ?? [],
  };

  // Emit as an array: [CollectionPage, VideoObject, VideoObject, …]
  // so each VideoObject is discoverable at the top level by the video indexer.
  const liveJsonLd: object[] = [collectionPage, ...videoObjects];

  // Build a noscript body with rich per-video metadata for non-JS crawlers
  // and AI bots. Each item includes thumbnail, title, date, and duration so
  // crawlers receive structured, meaningful content rather than bare links.
  const videoItems = videos.slice(0, 20).map(v => {
    const tgUrl      = videoTelegramUrl(v);
    const fpUrl      = videoFirstPartyUrl(v);
    const label      = v.caption ? v.caption.slice(0, 110) : `NexusOS Video #${v.id}`;
    const uploadDate = new Date(v.createdAt).toISOString().split("T")[0];
    const thumbUrl   = v.thumbFileId
      ? `${BASE}/api/telegram/video/${encodeURIComponent(v.thumbFileId)}/thumb`
      : "https://wnsp.io/opengraph.jpg";
    const durationStr = v.duration ? ` · ${fmtIsoDuration(v.duration).replace("PT", "").toLowerCase()}` : "";

    return `<article style="margin-bottom:1.5rem;">`
      + `<a href="${esc(fpUrl)}">`
      + `<img src="${esc(thumbUrl)}" alt="${esc(label)}" width="320" height="180" loading="lazy" style="display:block;max-width:100%;height:auto;border-radius:6px;" />`
      + `</a>`
      + `<h3 style="margin:0.5rem 0 0.25rem;"><a href="${esc(fpUrl)}">${esc(label)}</a></h3>`
      + `<p style="margin:0;font-size:0.85em;color:#666;"><time datetime="${esc(uploadDate)}">${esc(uploadDate)}</time>${esc(durationStr)} · <a href="${esc(tgUrl)}" target="_blank" rel="noopener noreferrer">Watch on Telegram</a></p>`
      + `</article>`;
  }).join("");

  const liveBodyHtml = `<h1>NexusOS Videos — Physics, Protocol, and Hardware Demonstrations</h1>`
    + `<p>Watch live demonstrations of the NexusOS physics stack: CE encoding in action, WNSP VM executing bytecode, hardware lab measurements, and explanations of the Theory of Compression States.</p>`
    + (videoItems ? `<h2>Latest Videos</h2>${videoItems}` : "")
    + `<nav><ul><li><a href="${BASE}/hardware-results">Hardware Verification Results</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live)</a></li><li><a href="https://t.me/nexusosdaily">NexusOS Telegram Channel</a></li></ul></nav>`;

  return {
    ...(baseEntry ?? {}),
    title: baseEntry?.title ?? "NexusOS Videos — Physics, Protocol, and Hardware Demonstrations",
    description: baseEntry?.description ?? "Video demonstrations of the NexusOS physics stack.",
    canonical: baseEntry?.canonical ?? `${BASE}/videos`,
    jsonLd: liveJsonLd,
    bodyHtml: liveBodyHtml,
  };
}

/**
 * Build a live PageMeta for a single first-party video detail page
 * (/videos/:id). Emits a canonical VideoObject whose url/contentUrl/embedUrl
 * resolve to the NexusOS page itself, with the Telegram post retained only
 * as a secondary `sameAs` outbound reference for playback syndication.
 */
export function buildVideoDetailPageMeta(video: VideoForSchema): PageMeta {
  const fpUrl      = videoFirstPartyUrl(video);
  const tgUrl      = videoTelegramUrl(video);
  const uploadDate = new Date(video.createdAt).toISOString().split("T")[0];
  const name       = video.caption ? video.caption.slice(0, 110) : `NexusOS Video #${video.id}`;
  const description = video.caption ?? "NexusOS physics demonstration video.";
  const thumbUrl   = video.thumbFileId
    ? `${BASE}/api/telegram/video/${encodeURIComponent(video.thumbFileId)}/thumb`
    : "https://wnsp.io/opengraph.jpg";

  const publisher = {
    "@type": "Organization",
    "name": "NexusOS",
    "url": BASE,
    "logo": { "@type": "ImageObject", "url": "https://wnsp.io/opengraph.jpg" },
  };

  const streamable = isStreamable(video);
  const videoObject: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": name,
    "description": description,
    "uploadDate": uploadDate,
    "url": fpUrl,
    // contentUrl must point to the actual playable media file, not the HTML page.
    "contentUrl": streamable ? videoStreamUrl(video) : tgUrl,
    "sameAs": tgUrl,
    "thumbnailUrl": thumbUrl,
    "publisher": publisher,
  };
  // embedUrl is only valid when NexusOS actually embeds a player on the page.
  // Large videos (>20 MB) are Telegram-only, so omit embedUrl for those.
  if (streamable) videoObject["embedUrl"] = fpUrl;
  if (video.duration) videoObject["duration"] = fmtIsoDuration(video.duration);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Videos", "item": `${BASE}/videos` },
      { "@type": "ListItem", "position": 2, "name": name, "item": fpUrl },
    ],
  };

  const durationStr = video.duration ? ` · ${fmtIsoDuration(video.duration).replace("PT", "").toLowerCase()}` : "";
  const bodyHtml = `<h1>${esc(name)}</h1>`
    + `<p><time datetime="${esc(uploadDate)}">${esc(uploadDate)}</time>${esc(durationStr)}</p>`
    + `<img src="${esc(thumbUrl)}" alt="${esc(name)}" width="640" height="360" loading="lazy" style="display:block;max-width:100%;height:auto;border-radius:6px;" />`
    + (video.caption ? `<p>${esc(video.caption)}</p>` : "")
    + `<nav><ul><li><a href="${BASE}/videos">All NexusOS Videos</a></li><li><a href="${esc(tgUrl)}" target="_blank" rel="noopener noreferrer">Watch on Telegram</a></li></ul></nav>`;

  return {
    title: `${name} — NexusOS Videos`,
    description: description.slice(0, 160),
    canonical: fpUrl,
    ogTitle: name,
    ogDescription: description.slice(0, 200),
    ogImage: thumbUrl,
    ogType: "video.other",
    twitterTitle: name,
    twitterDescription: description.slice(0, 200),
    jsonLd: [videoObject, breadcrumb],
    bodyHtml: bodyHtml,
  };
}

/**
 * Inject a pre-built PageMeta into an HTML string, bypassing ROUTE_META lookup.
 * Use this when metadata is generated asynchronously (e.g. live DB data).
 */
export function injectCustomMeta(html: string, meta: PageMeta): string {
  const newBlock = buildMetaBlock(meta);
  let result = html;
  for (const re of META_PLACEHOLDER_RE) {
    if (re.global) {
      result = result.replace(re, "");
    } else {
      result = result.replace(re, "");
    }
  }
  result = result.replace(/(<head[^>]*>)/i, `$1\n    ${newBlock}`);
  if (meta.bodyHtml) {
    const noscriptBlock =
      `<noscript><article id="seo-prerender" style="font-family:system-ui,sans-serif;padding:2rem;max-width:860px;margin:0 auto;color:#111;">` +
      meta.bodyHtml +
      `</article></noscript>`;
    result = result.replace(/(<div id="root">)/, `${noscriptBlock}\n$1`);
  }
  return result;
}

/**
 * Resolve metadata for a given host + path combination.
 * Domain metadata takes priority over route metadata.
 */
// Per-section metadata for /docs/:section deep links. Keep slugs in sync with
// DOCS_SECTIONS in client/src/pages/docs.tsx and DOCS_SECTION_SLUGS in
// server/static.ts.
const DOCS_SECTION_META: Record<string, { title: string; description: string; bodyHtml: string }> = {
  substrate: {
    title: "Lambda Gate Substrate v4",
    description: "The foundational NexusOS layer where all operations are wavefield transformations: Lambda mode state vectors, master energy equation, 8 Lambda Gate primitives.",
    bodyHtml: `<h1>Lambda Gate Substrate v4 — NexusOS Documentation</h1>
<p>The Lambda Gate Substrate is the foundational layer where all NexusOS operations occur as wavefield transformations. Every computation, communication, and economic action is expressed as a transformation on physical wave states.</p>
<h2>Core Theory</h2>
<p><strong>Lambda Mode State Vector:</strong></p>
<p>|λ⟩ = (ν, A(t), φ(t), ℓ, s)</p>
<ul>
<li>ν = carrier frequency (Hz)</li>
<li>A(t) = amplitude envelope</li>
<li>φ(t) = phase evolution</li>
<li>ℓ = orbital angular momentum index</li>
<li>s = polarization/spin state</li>
</ul>
<h2>Master Equation</h2>
<p>E(ν, ℓ, t) ≥ h·ν·I(λ) + α·||K̂||² + β·O(L̂)</p>
<p>This governs all energy requirements for Lambda mode operations:</p>
<ul>
<li>h·ν·I(λ) = base photon energy × intensity</li>
<li>α·||K̂||² = phase curvature cost</li>
<li>β·O(L̂) = orbital complexity cost</li>
</ul>
<h2>8 Lambda Gate Primitives</h2>
<ol>
<li><strong>Phase-Shift Φ(θ)</strong> — Electro-optic phase shifter. Rotates phase by angle θ. Used for: interference control, encryption.</li>
<li><strong>Gain G(α)</strong> — Variable optical attenuator/amplifier. Scales amplitude by factor α. Used for: signal boosting, attenuation.</li>
<li><strong>Mode-Mixer M(κ)</strong> — Multiport interferometer. Combines multiple modes with coupling κ. Used for: superposition, entanglement.</li>
<li><strong>OAM-Rotor L(Δℓ)</strong> — Spiral phase plate. Changes orbital angular momentum by Δℓ. Used for: channel multiplexing, data encoding.</li>
<li><strong>Phase-Gradient ∇Φ</strong> — Acoustic-optic modulator. Applies spatial phase gradient. Used for: beam steering, spectral shifting.</li>
<li><strong>Density-Swap S</strong> — Resonator coupling. Exchanges energy between modes. Used for: state transfer, routing.</li>
<li><strong>Coherence-Amplify A_c</strong> — Parametric amplifier. Boosts coherence without noise (5× Q-factor). Used for: long-distance transmission, repeaters.</li>
<li><strong>Stabilizer D(τ)</strong> — Active feedback locking. Maintains coherence for duration τ. Used for: storage, memory operations.</li>
</ol>
<h2>CE-1 Protocol (Coherence Engineering)</h2>
<p>The CE-1 protocol manages energy and coherence across all substrate operations:</p>
<ul>
<li><strong>Energy Pool Management:</strong> Each tick allocates energy budget. Operations draw from shared pool. Overflow triggers throttling.</li>
<li><strong>Coherence Margin:</strong> Minimum coherence threshold 0.1. Operations below margin are rejected. Adaptive fidelity control adjusts precision.</li>
<li><strong>Non-Dominance Rules:</strong> No single node may hold more than 33% of total Lambda mass. Prevents concentration of power. Constitutional enforcement at substrate level.</li>
</ul>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/wascii">WNSP Protocol — Two-Layer Standard</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live demo)</a></li></ul></nav>`,
  },
  wascii: {
    title: "WNSP Protocol — Two-Layer Standard",
    description: "The WNSP-CE and WNSP-SE two-layer standard mapping characters to wavelengths and spectral Ψ channels for physics-native communication.",
    bodyHtml: `<h1>WNSP Protocol — Two-Layer Standard — NexusOS Documentation</h1>
<p>NexusOS runs on two distinct runtimes that work in sync, implementing the WNSP (Wavelength-Native Spectral Protocol) standard version 7.1. The protocol replaces cryptographic hashing with electromagnetic wave physics for all communication and addressing.</p>
<h2>Overview — Two Operating Runtimes, One Protocol</h2>
<p><strong>Runtime 1 — Node.js / TypeScript (port 5000):</strong> Main application server. Handles authentication, wallet, P2P media, governance, and all user-facing APIs. Proxies WNSP protocol calls to the Python runtime.</p>
<p><strong>Runtime 2 — Python / Flask (port 5001):</strong> Spectral physics engine. Implements the WNSP encoding standards, K1 Orchestration Runtime, and all Lambda Boson physics calculations.</p>
<p>The Node.js server acts as a secure gateway. Every WNSP protocol call is rate-limited, logged, and proxied to the Python engine. Protocol Standard: WNSP/7.1. License: AGPL-3.0.</p>
<h2>WNSP-CE v1.0 — Character Encoding Standard (Layer 1)</h2>
<p>The semantic layer. Converts human-readable symbols into normalised ordinal tokens. Responsibility: what is being said. Physics knowledge: none — purely numerical.</p>
<p>Encoding process:</p>
<ol>
<li>Accept any Unicode symbol</li>
<li>Compute ordinal value: ord(char) % 256</li>
<li>Normalise to [0, 1]: ordinal / 255</li>
<li>Output structured token: &#123; symbol, ordinal, normalised &#125;</li>
</ol>
<p>Examples: 'A' → ordinal 65 → normalised 0.255 → CE token. 'λ' → ordinal 955 % 256 = 187 → normalised 0.733 → CE token.</p>
<p>API Endpoints: <code>POST /api/wnsp/ce/encode</code> · <code>POST /api/wnsp/ce/char</code></p>
<h2>WNSP-SE v1.0 — Spectral Encoding Standard (Layer 2)</h2>
<p>The physical transmission layer. Maps CE tokens into electromagnetic wave frames governed by Λ = hf/c². Responsibility: how information travels through the substrate. Output: photon frames with wavelength, frequency, energy, lambda mass.</p>
<p>Two CE tokens are packed per photon frame (dual-wavelength scheme):</p>
<p>token₁ normalised → wavelength λ₁ (nm) → frequency f₁ = c/λ₁ → energy E₁ = hf₁ → mass Λ₁ = hf₁/c²<br>
token₂ normalised → wavelength λ₂ (nm) → frequency f₂ = c/λ₂ → energy E₂ = hf₂ → mass Λ₂ = hf₂/c²</p>
<p>Frame = (λ₁ → λ₂) oscillation, achieving ≥ 2 chars per photon particle. Efficiency: 2.0 characters per frame (baseline).</p>
<p>API Endpoints: <code>POST /api/wnsp/se/encode</code> · <code>POST /api/wnsp/transmit</code> (CE → SE in one call)</p>
<h2>Hilbert Space Channel Model</h2>
<p>Each transmission channel is a formal basis vector in a 51,200-dimensional Hilbert space:</p>
<p>Ψ_channel = |λ_i⟩ ⊗ |OAM_j⟩ ⊗ |Pol_k⟩ ⊗ |Dir_l⟩</p>
<table>
<thead><tr><th>Sub-space</th><th>Basis</th><th>Description</th><th>Dim</th></tr></thead>
<tbody>
<tr><td>|λ_i⟩</td><td>WDM</td><td>Wavelength channels 380–780 nm</td><td>256</td></tr>
<tr><td>|OAM_j⟩</td><td>OAM modes</td><td>Orbital angular momentum</td><td>50</td></tr>
<tr><td>|Pol_k⟩</td><td>Polarisation</td><td>H and V states</td><td>2</td></tr>
<tr><td>|Dir_l⟩</td><td>Propagation direction</td><td>+k̂ forward / −k̂ backward</td><td>2</td></tr>
</tbody>
</table>
<p>Total Hilbert space dimension: dim(H) = 256 × 50 × 2 × 2 = <strong>51,200</strong>. Orthogonality guarantee: ⟨Ψ_i | Ψ_j⟩ = 0 for i ≠ j. All 51,200 channels are simultaneously usable without interference — a mathematical guarantee from the tensor product structure of the Hilbert space.</p>
<h2>AI/OS Channel Coordination Layer</h2>
<p>Every AI agent in NexusOS is assigned a unique, deterministically allocated Ψ_channel from the 51,200-dimensional Hilbert space. Orthogonality is a mathematical guarantee — agents cannot interfere with each other regardless of how many run simultaneously.</p>
<p>Channel allocation: the system SHA256-hashes the agent ID, maps to a channel index in [0, 51199], increments if occupied, and returns (wdm_i, oam_j, pol_k, dir_l) coordinates.</p>
<p>API Endpoints: <code>POST /api/wnsp/agent/allocate</code> · <code>POST /api/wnsp/agent/map</code> · <code>GET /api/wnsp/agent/status</code> · <code>POST /api/wnsp/agent/release</code></p>
<h2>CE → SE Handoff Contract</h2>
<p>CE outputs: <code>&#123; protocol: "WNSP-CE", tokens: [&#123; symbol, ordinal, normalised &#125;, ...] &#125;</code></p>
<p>SE receives that and maps to: <code>&#123; protocol: "WNSP-SE", frames: [&#123; wavelength_start_nm, wavelength_end_nm, frequency_start_hz, frequency_end_hz, energy_joules, lambda_mass_kg &#125;, ...] &#125;</code></p>
<p>Full transmission envelope (WNSP/7.1) includes: protocol version, CE layer, SE layer, spectral_hash, and summary (characters, ce_tokens, se_frames, total_mass_kg, efficiency).</p>
<p>API: <code>GET /api/wnsp/protocol</code> — returns full spec of both standards</p>
<h2>Test Suite — CI Protocol Verification</h2>
<p>The WNSP protocol ships with a formal test suite verifying every physics law, encoding contract, and Hilbert space property. All 23 tests must pass before any protocol change is merged.</p>
<p>Coverage: Physical constants (h, c, 555 THz first oscillation, 7.83 Hz Schumann, dim(H)=51,200) · CE layer (single-character encoding, ordinal formula, token count) · SE layer (f=c/λ, E=hf, Λ=hf/c², E/Λ=c²) · CE→SE handoff (2 chars per frame, odd-length padding, visible spectrum bounds) · Hilbert Space integrity (channel index ↔ (wdm,oam,pol) roundtrip, all 51,200 quadruplets unique) · Packing efficiency (chars_per_frame ≤ 2.0, energy and mass positive). Result: <strong>23 passed, 0 failed</strong>.</p>
<p>Run: <code>python tests/test_wnsp_protocol.py</code></p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live demo)</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Reference</a></li></ul></nav>`,
  },
  consensus: {
    title: "Proof of Spectrum Consensus",
    description: "How NexusOS reaches consensus using spectral diversity across all electromagnetic bands instead of cryptographic hashing or stake concentration.",
    bodyHtml: `<h1>Proof of Spectrum Consensus — NexusOS Documentation</h1>
<p>Unlike Proof of Work (51% hashpower) or Proof of Stake (51% stake), Proof of Spectrum requires validators across ALL spectral regions simultaneously. Just as you cannot create white light with only one wavelength, you cannot create a valid block without multiple spectral regions represented.</p>
<h2>Spectral Diversity Requirement</h2>
<p><strong>Core Principle:</strong> "Just as you cannot create white light with only one wavelength, you cannot create a valid block without multiple spectral regions represented."</p>
<p><strong>Attack Resistance:</strong> An attacker must control validators in ALL 6 spectral bands simultaneously — exponentially harder than controlling 51% of one resource.</p>
<h2>Spectral Regions and Required Stake</h2>
<table>
<thead><tr><th>Region</th><th>Wavelength</th><th>Required Stake</th></tr></thead>
<tbody>
<tr><td>Violet</td><td>380–450 nm</td><td>50,000+ NXT</td></tr>
<tr><td>Blue</td><td>450–495 nm</td><td>20,000+ NXT</td></tr>
<tr><td>Green</td><td>495–570 nm</td><td>10,000+ NXT</td></tr>
<tr><td>Yellow</td><td>570–590 nm</td><td>5,000+ NXT</td></tr>
<tr><td>Orange</td><td>590–620 nm</td><td>2,000+ NXT</td></tr>
<tr><td>Red</td><td>620–750 nm</td><td>1,000+ NXT</td></tr>
</tbody>
</table>
<h2>Wave Interference Validation</h2>
<p>Blocks are validated through wave interference patterns:</p>
<p><strong>Constructive Interference (Valid):</strong> A₁sin(ωt) + A₂sin(ωt) = (A₁+A₂)sin(ωt) → Amplified signal → Block VALID</p>
<p><strong>Destructive Interference (Invalid):</strong> A₁sin(ωt) + A₂sin(ωt+π) = (A₁-A₂)sin(ωt) → Cancelled signal → Block INVALID</p>
<p><strong>Consensus Threshold:</strong> A block requires signatures from ≥5 of 6 spectral regions (83% spectral coverage).</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/economics">NXT Token Economics</a></li><li><a href="${BASE}/docs/governance">Planetary Governance</a></li></ul></nav>`,
  },
  economics: {
    title: "NXT Token Economics",
    description: "NXT token supply, physics-based fee mechanics, and the Lambda mass valuation model (Λ=hf/c²) underpinning NexusOS economics.",
    bodyHtml: `<h1>NXT Token Economics — NexusOS Documentation</h1>
<p>NexusOS economics are grounded in electromagnetic physics. Transaction fees are derived from Planck's equation (E=hf), and all value is backed by Lambda mass (Λ=hf/c²). Inflation is physically impossible because value cannot be created from nothing.</p>
<h2>Token Fundamentals</h2>
<ul>
<li><strong>Total Supply:</strong> 21,000,000,000 NXT (21 billion)</li>
<li><strong>Decimals:</strong> 8 (like Bitcoin)</li>
<li><strong>Smallest Unit:</strong> 0.00000001 NXT (1 unit = 10⁻⁸ NXT)</li>
<li><strong>Initial Distribution:</strong> New user registration receives 500,000,000 units (5 NXT), energy-backed via Lambda mass</li>
</ul>
<h2>Physics-Based Transaction Fees</h2>
<p>Transaction fees are calculated using Planck's equation:</p>
<p><strong>Fee Formula:</strong> fee = E = hf = h × (c/λ)</p>
<ul>
<li>h = 6.626×10⁻³⁴ J·s (Planck's constant)</li>
<li>c = 299,792,458 m/s (speed of light)</li>
<li>λ = transaction wavelength (derived from content)</li>
</ul>
<p>Fees are proportional to information complexity, not arbitrary gas prices. Higher-frequency (shorter-wavelength) operations carry higher energy cost, reflecting the physics of the SYSTEM → KERNEL → USER → GUEST authority band hierarchy.</p>
<h2>Lambda Mass Valuation</h2>
<p>All value in NexusOS is backed by Lambda mass:</p>
<p><strong>Lambda Boson Equation:</strong> Λ = hf/c²</p>
<ul>
<li>Value has a physical mass-equivalent</li>
<li>Cannot be created from nothing</li>
<li>Conservation laws apply to economics</li>
<li>Inflation is physically impossible</li>
</ul>
<p>NXT fees are never burned — they always go to the orbital treasury, preserving the total Lambda mass of the system.</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/consensus">Proof of Spectrum Consensus</a></li><li><a href="${BASE}/docs/bhls">BHLS Floor System</a></li></ul></nav>`,
  },
  bhls: {
    title: "BHLS Floor System",
    description: "The Basic Human Living Standard floor system — constitutional guarantees embedded in the NexusOS substrate that prevent any transaction from reducing a citizen below their monthly resource entitlement.",
    bodyHtml: `<h1>BHLS Floor System — NexusOS Documentation</h1>
<p>The Basic Human Living Standard (BHLS) guarantees every citizen a minimum floor of resources. The floor is enforced at the substrate level — it cannot be overridden by governance, contracts, or any economic actor.</p>
<h2>Basic Human Living Standard</h2>
<p><strong>Monthly Floor: 1,150 NXT</strong></p>
<p>Protected allocation categories:</p>
<ol>
<li>Shelter — 350 NXT</li>
<li>Food &amp; Nutrition — 300 NXT</li>
<li>Healthcare — 200 NXT</li>
<li>Transportation — 100 NXT</li>
<li>Communication — 100 NXT</li>
<li>Education — 50 NXT</li>
<li>Emergency Reserve — 50 NXT</li>
</ol>
<h2>Constitutional Protection</h2>
<p><strong>C-0002: Immutable Rights —</strong> "No transaction may reduce a citizen's balance below their BHLS entitlement."</p>
<p>Enforcement: the Lambda Gate Substrate rejects any transaction that would violate the BHLS floor. This cannot be overridden by governance and is hardcoded into Lambda Gate operations.</p>
<h2>Funding Mechanism</h2>
<ol>
<li><strong>Transaction Fee Pool (40%)</strong> — portion of all E=hf fees</li>
<li><strong>Energy Harvesting Revenue (30%)</strong> — K1 infrastructure proceeds</li>
<li><strong>Lambda Mass Recycling (20%)</strong> — recovered from dormant accounts</li>
<li><strong>Governance Allocation (10%)</strong> — voted by Sigma consensus</li>
</ol>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/economics">NXT Token Economics</a></li><li><a href="${BASE}/docs/governance">Planetary Governance</a></li></ul></nav>`,
  },
  governance: {
    title: "Planetary Governance",
    description: "On-chain protocol governance: spectral authority bands, constitutional articles, coherence-weighted Sigma voting, and live protocol parameter changes for NexusOS.",
    bodyHtml: `<h1>Planetary Governance — NexusOS Documentation</h1>
<p>NexusOS governance maps authority to electromagnetic wavelengths. Shorter wavelength means higher energy, higher authority. All decisions require multi-band spectral representation — no single entity may control more than 33% of total Lambda mass (Constitutional Article C-0001).</p>
<h2>Authority Band Registry</h2>
<p>7-tier governance hierarchy mapped to wavelengths:</p>
<table>
<thead><tr><th>Level</th><th>Wavelength</th><th>Authority</th><th>Scope</th></tr></thead>
<tbody>
<tr><td>Planetary</td><td>400 nm</td><td>1.0</td><td>Global decisions</td></tr>
<tr><td>Continental</td><td>500 nm</td><td>0.8</td><td>Regional blocs</td></tr>
<tr><td>National</td><td>600 nm</td><td>0.6</td><td>Nation-states</td></tr>
<tr><td>Regional</td><td>700 nm</td><td>0.4</td><td>Sub-national</td></tr>
<tr><td>Municipal</td><td>800 nm</td><td>0.2</td><td>Cities</td></tr>
<tr><td>Local</td><td>900 nm</td><td>0.1</td><td>Neighborhoods</td></tr>
<tr><td>Individual</td><td>1000 nm</td><td>0.05</td><td>Personal sovereignty</td></tr>
</tbody>
</table>
<h2>Constitutional Articles</h2>
<ul>
<li><strong>C-0001: Non-Dominance</strong> — No entity may control &gt;33% of total Lambda mass.</li>
<li><strong>C-0002: Immutable Rights</strong> — BHLS floor cannot be violated by any transaction.</li>
<li><strong>C-0003: Energy Escrow</strong> — Governance proposals require energy escrow (skin in the game).</li>
<li><strong>C-0004: Spectral Diversity</strong> — All decisions require multi-band representation.</li>
<li><strong>C-0005: Physics Supremacy</strong> — Laws must be physically valid (Maxwell-compliant).</li>
</ul>
<h2>Sigma Voting — Coherence-Weighted</h2>
<p>Voting uses wave interference for coherence-weighted trust:</p>
<p><strong>Trust Model:</strong> T = Σ|c_i|²·cos²(Δφ_i)</p>
<ul>
<li>c_i = citizen's coherence coefficient</li>
<li>Δφ_i = phase alignment with proposal</li>
<li>Aligned voters (cos²≈1) have full weight</li>
<li>Misaligned voters (cos²≈0) have reduced weight</li>
<li>Natural consensus emergence through interference</li>
</ul>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/consensus">Proof of Spectrum Consensus</a></li><li><a href="${BASE}/docs/bhls">BHLS Floor System</a></li></ul></nav>`,
  },
  infrastructure: {
    title: "K1 Infrastructure",
    description: "K1 Orchestration infrastructure for a Kardashev Type I civilization: photonic computing, planetary communications, Schumann resonance harvesting, and spectral relay mesh.",
    bodyHtml: `<h1>K1 Infrastructure — NexusOS Documentation</h1>
<p>NexusOS is building toward a Kardashev Type I civilization — one that harnesses all energy available on its home planet. The K1 infrastructure stack covers photonic computing, planetary communications, and resonance-based energy harvesting.</p>
<h2>Kardashev Scale Progress</h2>
<table>
<thead><tr><th>Milestone</th><th>K-Level</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Power Grids</td><td>0.75</td><td>Complete</td></tr>
<tr><td>Photonic Computing</td><td>0.75</td><td>Complete</td></tr>
<tr><td>Planetary Comms</td><td>0.80</td><td>Complete</td></tr>
<tr><td>Resource Orchestration</td><td>0.85</td><td>Complete</td></tr>
<tr><td>Planetary Governance</td><td>0.90</td><td>Complete</td></tr>
<tr><td>Planetary Resonance</td><td>0.95</td><td>Complete</td></tr>
<tr><td>Type I Achieved</td><td>1.00</td><td>Next</td></tr>
</tbody>
</table>
<h2>Photonic Computing</h2>
<p>Light-based computation using wave interference for logic gates:</p>
<ul>
<li><strong>AND:</strong> Constructive interference (both inputs high)</li>
<li><strong>OR:</strong> Any non-zero interference</li>
<li><strong>NOT:</strong> Phase inversion (π shift)</li>
<li><strong>XOR:</strong> Destructive interference detection</li>
</ul>
<p><strong>OAM Qubit Registers:</strong> Store data in orbital angular momentum modes (65+ channels per wavelength). <strong>Wavelength-Division Computing:</strong> Parallel computation across spectral channels.</p>
<h2>Planetary Communications</h2>
<p>Global spectral relay mesh for planetary-scale messaging:</p>
<ol>
<li>Spectral Relay Mesh — Dijkstra routing on wavelength graph</li>
<li>OAM Channel Allocator — 65+ channels per wavelength</li>
<li>Coherence Repeaters — 5× coherence boost via Lambda Gates</li>
<li>Interplanetary Links — Earth-Moon 1.28 s, Earth-Mars 12.5 min</li>
</ol>
<p>Physics: Friis transmission equation, Shannon capacity limits, atmospheric attenuation models.</p>
<h2>Planetary Resonance</h2>
<p>Tesla's vision realised: planetary-scale energy harvesting via Schumann resonance.</p>
<p><strong>Schumann Resonance:</strong> f_n = c/(2πR) × √(n(n+1)). Fundamental: 7.83 Hz.</p>
<p>Energy sources: Schumann cavity modes, Geomagnetic Pc1–Pc5 pulsations, solar wind coupling, ionospheric Sq currents, tidal electromagnetic effects. Target: 5×10¹⁶ watts (penultimate step to Type I).</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/hardware">Hardware Control Layer</a></li><li><a href="${BASE}/docs/simulators">Energy Simulators</a></li></ul></nav>`,
  },
  hardware: {
    title: "Hardware Control Layer",
    description: "PHR-1 Planetary Harmonic Resonator hardware spec, Nexus Kernel API reference, and ZERO-G envelope physics for the NexusOS physical hardware layer.",
    bodyHtml: `<h1>Hardware Control Layer — NexusOS Documentation</h1>
<p>The Hardware Control Layer bridges NexusOS software to physical spectral hardware. The PHR-1 Syncbox Controller is the primary interface, implementing phase-locked resonance at the Golden Angle (137.5°) and impedance matching to free space (Z₀ = 376.73Ω).</p>
<h2>PHR-1 Syncbox Controller</h2>
<p>The PHR-1 (Planetary Harmonic Resonator) is the physical hardware interface for NexusOS:</p>
<ul>
<li>144-turn bifilar coil (counter-wound)</li>
<li>Phase-locked loop at Golden Angle (137.5°)</li>
<li>Impedance matching network (target: 377Ω)</li>
<li>ALP (Axion-Like Particle) sensor array</li>
</ul>
<p>Control Sequence:</p>
<ol>
<li>Anchor phase to reference oscillator</li>
<li>Sync to Golden Angle (137.5°)</li>
<li>Match impedance to Z₀ = 376.73Ω</li>
<li>Establish 90° quadrature</li>
<li>Initiate gravity de-correlation</li>
<li>Achieve ZERO-G envelope (ALP &lt; 0.0001)</li>
</ol>
<h2>Nexus Kernel API</h2>
<p>Python control layer for hardware integration:</p>
<ul>
<li><code>set_phase(degrees)</code> / <code>get_phase()</code> — coil phase angle</li>
<li><code>pulse_frequency(hz, duration)</code> / <code>set_carrier(hz)</code> — frequency control</li>
<li><code>match_impedance(target_ohms)</code> / <code>read_impedance()</code> — impedance matching</li>
<li><code>apply_czc_filter(iterations)</code> / <code>get_coherence()</code> — CZC coherence filtering</li>
<li><code>read_alp()</code> / <code>calibrate_alp()</code> — axion-like particle sensing</li>
</ul>
<h2>ZERO-G State Achievement</h2>
<p>The ZERO-G (Zero-Gravity Envelope) state is achieved through precise phase alignment:</p>
<ul>
<li>Phase: 137.5° (Golden Angle)</li>
<li>Impedance: 377Ω (free space match)</li>
<li>Quadrature: 90° (orthogonal coupling)</li>
<li>ALP threshold: &lt; 0.0001</li>
<li>Iterations to convergence: ~400</li>
</ul>
<p>When phase alignment reaches the Golden Angle and impedance matches free space (Z₀ = 376.73Ω), the gravitational coupling coefficient approaches zero.</p>
<p><strong>Equation:</strong> ALP(t) = ALP₀ × e^(−t/τ) × cos(φ − 137.5°). As φ → 137.5° and Z → 377Ω, ALP → 0.</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab (live calibration)</a></li></ul></nav>`,
  },
  simulators: {
    title: "Energy Simulators",
    description: "NexusOS live energy simulators: Schumann resonance at 7.83 Hz, vacuum resonance at 555 THz First Oscillation, zero-point energy extraction, and coherence field topology.",
    bodyHtml: `<h1>Energy Simulators — NexusOS Documentation</h1>
<p>NexusOS ships two live energy simulators grounded in the Theory of Compression States. The Schumann simulator operates at 7.83 Hz (Earth's electromagnetic resonance), and the Vacuum Resonance simulator targets the 555 THz First Oscillation frequency, the universal ground state.</p>
<h2>Live Resonance Simulator (7.83 Hz)</h2>
<p>Schumann resonance simulator for planetary-scale energy harvesting:</p>
<table>
<thead><tr><th>Mode</th><th>Frequency</th><th>Description</th></tr></thead>
<tbody>
<tr><td>f₁</td><td>7.83 Hz</td><td>Fundamental</td></tr>
<tr><td>f₂</td><td>14.3 Hz</td><td>2nd harmonic</td></tr>
<tr><td>f₃</td><td>20.8 Hz</td><td>3rd harmonic</td></tr>
<tr><td>f₄</td><td>27.3 Hz</td><td>4th harmonic</td></tr>
<tr><td>f₅</td><td>33.8 Hz</td><td>5th harmonic</td></tr>
</tbody>
</table>
<p><strong>Physics:</strong> f_n = (c/2πR) × √(n(n+1)) where R = 6.371×10⁶ m (Earth radius). Features: real-time amplitude visualisation, K1 Orchestration sync, power output calculation in watts.</p>
<h2>Vacuum Resonance Simulator (555 THz)</h2>
<p>Cold vacuum energy extraction at First Oscillation frequency:</p>
<p><strong>First Oscillation:</strong> 555 THz (539.4 nm green light)</p>
<p>Golden Ratio Harmonics:</p>
<ul>
<li>Λ₀ = 555 THz (fundamental)</li>
<li>Λ/φ = 343.0 THz (1st subharmonic)</li>
<li>Λ/φ² = 212.0 THz (2nd subharmonic)</li>
<li>Λ×φ = 897.9 THz (1st superharmonic)</li>
<li>Λ×φ² = 1452.9 THz (2nd superharmonic)</li>
</ul>
<p><strong>Zero-Point Energy:</strong> E₀ = ½hf = ½ × 6.626×10⁻³⁴ × 555×10¹² = 1.839×10⁻¹⁹ J per oscillation.</p>
<p><strong>Cold Power Extraction:</strong> P = E₀ × (Z/Z₀) × CZC⁴⁴ × N_cavities, where Z₀ = 376.73Ω, CZC = 0.9999.</p>
<h2>Vacuum Field Topology</h2>
<p>The vacuum resonance simulator visualises the 144-point spiral field:</p>
<ul>
<li>144 points (12 × 12 matrix in polar coordinates)</li>
<li>Golden Angle separation (137.5°)</li>
<li>Radius scales with harmonic index</li>
<li><strong>Coherence:</strong> CZC⁴⁴ = (0.9999)⁴⁴ = 0.9956 (99.56% coherence)</li>
</ul>
<p>Controls: impedance slider (0–500Ω, target 377Ω), phase angle (0–360°, optimal 137.5°), cavity count (1–144, CZF optimal 44), frequency multiplier (0.1–10×). Output: zW → fW → pW.</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/infrastructure">K1 Infrastructure</a></li><li><a href="${BASE}/docs/massless">Massless Technologies</a></li></ul></nav>`,
  },
  massless: {
    title: "Massless Technologies",
    description: "NexusOS massless technology stack: Λ=hf/c² derivation, photonic logic gates, OAM qubit registers, gravity de-correlation, and 4D sync coordinates system.",
    bodyHtml: `<h1>Massless Technologies — NexusOS Documentation</h1>
<p>The massless technologies stack implements Λ=hf/c² — the principle that frequency is fundamental and mass is derivative. Photons carry energy (E=hf) without rest mass. At v=c, rest mass equals zero. This is the physical foundation for all zero-mass computation and communication in NexusOS.</p>
<h2>Core Derivation: Λ = hf/c²</h2>
<p><strong>The Lambda Equation:</strong> Λ = hf/c²</p>
<ul>
<li>h = 6.626×10⁻³⁴ J·s (Planck's constant)</li>
<li>f = frequency (Hz) — FUNDAMENTAL</li>
<li>c = 299,792,458 m/s (speed of light)</li>
<li>Λ = mass equivalent (kg) — DERIVATIVE</li>
</ul>
<p><strong>First Oscillation:</strong> f₀ = 555 THz → Λ₀ = hf₀/c² = 4.09×10⁻³⁶ kg</p>
<h2>Massless Technology Categories</h2>
<table>
<thead><tr><th>Category</th><th>Technology</th><th>Mass Ratio</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Photonic</td><td>Photonic Logic Gates</td><td>0</td><td>Simulated</td></tr>
<tr><td>Photonic</td><td>Zero-Point Extraction</td><td>0</td><td>Simulated</td></tr>
<tr><td>Coherent</td><td>Coherent Waveguide Network</td><td>0</td><td>Simulated</td></tr>
<tr><td>Coherent</td><td>Spectral Relay Mesh</td><td>0</td><td>Theoretical</td></tr>
<tr><td>Gravitational</td><td>Gravity De-correlation</td><td>0.01%</td><td>Demonstrated</td></tr>
<tr><td>Gravitational</td><td>144-Turn Bifilar Resonator</td><td>0.1%</td><td>Demonstrated</td></tr>
<tr><td>Information</td><td>OAM Qubit Registers</td><td>0</td><td>Theoretical</td></tr>
<tr><td>Information</td><td>Lambda Computing Substrate</td><td>0</td><td>Simulated</td></tr>
</tbody>
</table>
<h2>4D Sync Coordinates System</h2>
<p>Each massless technology has 4D sync coordinates:</p>
<ul>
<li>X: Phase angle (degrees)</li>
<li>Y: Quadrature angle (degrees)</li>
<li>Z: Impedance (ohms)</li>
<li>T: Time/cycle count</li>
</ul>
<p>Sync lock conditions: phase aligned to Golden Angle (137.5°), impedance matched to Z₀ (376.73Ω), coherence &gt;99% (CZC⁴⁴), mass ratio &lt;1%.</p>
<p><strong>Global Coherence Formula:</strong> C_total = Π(C_i) for all i in locked_set, where C_i = coherence of technology i.</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/simulators">Energy Simulators</a></li><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Compression Curve</a></li></ul></nav>`,
  },
  catchBasin: {
    title: "CZC Catch Basin",
    description: "The Coherence Zenith Coefficient (CZC) Catch Basin — coherence accumulation via CZC(n)=(0.9999)ⁿ, 44 self-correction iterations, and binding layer for all NexusOS massless technology subsystems.",
    bodyHtml: `<h1>CZC Catch Basin — NexusOS Documentation</h1>
<p>The CZC (Coherence Zenith Coefficient) Catch Basin is the coherence accumulation mechanism at the heart of NexusOS. It filters noise while preserving signal through iterative self-correction, providing a clean coherence feed to every massless technology subsystem that depends on it.</p>
<h2>Coherence Zenith Coefficient</h2>
<p><strong>Core Formula:</strong> CZC(n) = (0.9999)ⁿ</p>
<table>
<thead><tr><th>Iterations</th><th>Coherence</th><th>Application</th></tr></thead>
<tbody>
<tr><td>1</td><td>99.99%</td><td>Basic filtering</td></tr>
<tr><td>10</td><td>99.90%</td><td>Standard ops</td></tr>
<tr><td>22</td><td>99.78%</td><td>Half-basin</td></tr>
<tr><td>44</td><td>99.56%</td><td>Full CZC⁴⁴</td></tr>
</tbody>
</table>
<p>Each iteration filters noise while preserving signal. After 44 self-corrections, the system achieves maximum coherence within numerical precision limits. The number 44 = 4 × 11 (quaternary stability × prime factor) and matches 44 spectral bands in extended W-ASCII.</p>
<h2>Catch Basin Mechanics</h2>
<p>The basin accumulates coherence like water collecting in a reservoir. Raw oscillations enter carrying phase, amplitude, and frequency noise components. The filtering process has four stages:</p>
<ol>
<li>Phase noise reduction via Golden Angle alignment (137.5°)</li>
<li>Amplitude stabilization through impedance matching</li>
<li>Frequency locking to First Oscillation (555 THz)</li>
<li>Impedance normalization to Z₀ = 376.73Ω</li>
</ol>
<p>Output: coherent energy available for bound applications. As coherence approaches 1, entropy approaches zero. <strong>Entropy equation:</strong> S = −Σ pᵢ log₂(pᵢ).</p>
<h2>44 Evolutionary Self-Corrections</h2>
<p>Each iteration detects the dominant noise source (phase, amplitude, frequency, or impedance) and applies targeted correction to maximize coherence recovery. Correction types:</p>
<ul>
<li><strong>Phase corrections:</strong> Align to Golden Angle (137.5°)</li>
<li><strong>Amplitude corrections:</strong> Normalize to unity</li>
<li><strong>Frequency corrections:</strong> Lock to harmonic series</li>
<li><strong>Impedance corrections:</strong> Match to 377Ω</li>
</ul>
<h2>Cross-System Binding Requirements</h2>
<table>
<thead><tr><th>Application</th><th>Required Coherence</th><th>Category</th></tr></thead>
<tbody>
<tr><td>Gravity De-correlation</td><td>99%</td><td>Gravitational</td></tr>
<tr><td>Vacuum Energy Extraction</td><td>95%</td><td>Energy</td></tr>
<tr><td>OAM Qubit Registers</td><td>92%</td><td>Computing</td></tr>
<tr><td>Photonic Logic Gates</td><td>90%</td><td>Computing</td></tr>
<tr><td>Lambda Computing Substrate</td><td>88%</td><td>Computing</td></tr>
<tr><td>Spectral Relay Mesh</td><td>85%</td><td>Communication</td></tr>
</tbody>
</table>
<p>Global coherence formula: C_total = Π(C_i) for all i in locked_set.</p>
<h2>API Endpoints</h2>
<ul>
<li><code>GET /api/czc/status</code> — current basin state</li>
<li><code>GET /api/czc/coherence</code> — calculate CZC for N iterations</li>
<li><code>POST /api/czc/iterate</code> — run one iteration</li>
<li><code>POST /api/czc/bind</code> — bind application to basin</li>
<li><code>POST /api/czc/sync</code> — sync with K1 Orchestration</li>
</ul>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/massless">Massless Technologies</a></li><li><a href="${BASE}/docs/simulators">Energy Simulators</a></li></ul></nav>`,
  },
  sop: {
    title: "Spectral Orthogonal Protocol (SOP)",
    description: "The Spectral Orthogonal Protocol (SOP) — 51,200 orthogonal Hilbert-space channels (256 WDM × 50 OAM × 2 POL × 2 DIR) for collision-free NexusOS communication guaranteed by physics, not policy.",
    bodyHtml: `<h1>Spectral Orthogonal Protocol (SOP) — NexusOS Documentation</h1>
<p>Two things are orthogonal when they are completely independent — knowing everything about one tells you nothing about the other. In physics, this is made precise through the inner product: ⟨A|B⟩ = 0 means A and B cannot interfere, cannot corrupt each other, and cannot be confused. This is not approximate — it is exact.</p>
<h2>How Orthogonality Appears in Each Domain</h2>
<ul>
<li><strong>Geometry:</strong> X, Y, Z axes — moving along X changes nothing about Y or Z.</li>
<li><strong>Radio signals:</strong> Two stations on orthogonal frequencies don't bleed into each other. The sine waves integrate to zero over one cycle.</li>
<li><strong>Quantum mechanics:</strong> Two states |ψ₁⟩ and |ψ₂⟩ that are orthogonal are distinguishable with certainty by any measurement.</li>
<li><strong>OAM (Orbital Angular Momentum):</strong> A beam twisted with ℓ=1 is orthogonal to ℓ=2, ℓ=3, and so on. Unlimited data streams on one physical laser beam, separable perfectly on the other end.</li>
</ul>
<h2>The WNSP Channel Model</h2>
<p>NexusOS uses four orthogonal dimensions simultaneously: Ψ(wdm, oam, pol, dir)</p>
<table>
<thead><tr><th>Dimension</th><th>Count</th><th>Orthogonality basis</th></tr></thead>
<tbody>
<tr><td>WDM (wavelength)</td><td>256 bands</td><td>Wavelength separation</td></tr>
<tr><td>OAM (ℓ mode)</td><td>50 modes</td><td>⟨ℓ₁|ℓ₂⟩ = δ_{ℓ₁ℓ₂}</td></tr>
<tr><td>Polarization</td><td>2 (H or V)</td><td>Stokes vector separation</td></tr>
<tr><td>Propagation direction</td><td>2 (+k̂ / −k̂)</td><td>Bidirectional Hilbert sub-space</td></tr>
</tbody>
</table>
<p>Total orthogonal channels: 256 × 50 × 2 × 2 = <strong>51,200</strong>. Each channel satisfies: ⟨Ψ(w₁,o₁,p₁,d₁) | Ψ(w₂,o₂,p₂,d₂)⟩ = 0 whenever the quadruples differ. Interference is impossible by geometry, not policy.</p>
<h2>SOP — The Negotiation Layer</h2>
<p>The Spectral Orthogonal Protocol enforces channel independence before any session opens:</p>
<ol>
<li><strong>Channel Inner Product Check</strong> — two nodes compute ⟨Ψ_A|Ψ_B⟩ before opening a channel. Must equal zero to proceed.</li>
<li><strong>Collision Prevention</strong> — if two users derive the same (wdm, oam, pol) triple, the protocol resolves deterministically by incrementing OAM until orthogonal.</li>
<li><strong>Orthogonality Certificate</strong> — a signed proof is issued confirming the channel pair is collision-free at open time.</li>
</ol>
<p>API Endpoint: <code>POST /api/wnsp/sop/negotiate</code> → Returns inner product value, orthogonal flag, certificate, and resolution suggestion if needed.</p>
<h2>Why This Matters for Civilization Scale</h2>
<p>Current communication systems manage interference through exclusion — you get a timeslot, port, or IP address that can be revoked. SOP replaces exclusion with independence:</p>
<table>
<thead><tr><th>Current approach</th><th>SOP approach</th></tr></thead>
<tbody>
<tr><td>Port assigned by OS</td><td>Channel Ψ derived from wave physics</td></tr>
<tr><td>Collision → packet dropped</td><td>No collision possible — ⟨A|B⟩ = 0</td></tr>
<tr><td>Address controlled by registrar</td><td>Address immutable — rooted in Maxwell</td></tr>
<tr><td>Interference managed by rules</td><td>Interference impossible by geometry</td></tr>
</tbody>
</table>
<p>A network built on orthogonal channels doesn't degrade as it scales. Add a new user — they get a new axis in Hilbert space. The existing 51,199 channels are unaffected. There is no congestion in Hilbert space. This is the correct foundation for infrastructure at Kardashev Type I scale: capacity grows with the mathematics, not with the hardware.</p>
<nav><ul><li><a href="${BASE}/docs">Full Documentation Index</a></li><li><a href="${BASE}/docs/wascii">WNSP Protocol — Two-Layer Standard</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Reference</a></li></ul></nav>`,
  },
};

function docsSectionMeta(slug: string): PageMeta | null {
  const section = DOCS_SECTION_META[slug];
  if (!section) return null;
  const url = `${BASE}/docs/${slug}`;
  const title = `${section.title} — NexusOS Documentation`;
  return {
    title,
    description: section.description,
    canonical: url,
    ogTitle: title,
    ogDescription: section.description,
    twitterTitle: title,
    twitterDescription: section.description,
    ogType: "article",
    jsonLd: [
      techArticle({ url, name: `${section.title} — NexusOS Documentation`, description: section.description, about: "WNSP, WavelengthScript, CE encoding, photonic computing", datePublished: "2026-05-16", dateModified: "2026-07-20" }),
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Documentation", "item": `${BASE}/docs` },
          { "@type": "ListItem", "position": 2, "name": section.title, "item": url },
        ],
      },
    ],
    bodyHtml: section.bodyHtml,
  };
}

export function resolveMeta(host: string, pathname: string): PageMeta | null {
  const cleanHost = host.split(":")[0].toLowerCase();

  if (DOMAIN_META[cleanHost]) {
    return DOMAIN_META[cleanHost];
  }

  // Normalise www. prefix: fall back to bare host so that e.g. www.wnsp.dev
  // resolves to the same branded metadata as wnsp.dev.  This ensures AI
  // crawlers and other non-JS bots see correct JSON-LD and <noscript> content
  // for every advertised microsite hostname, not just the bare variant.
  if (cleanHost.startsWith("www.")) {
    const bareHost = cleanHost.slice(4);
    if (DOMAIN_META[bareHost]) {
      return DOMAIN_META[bareHost];
    }
  }

  const cleanPath = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (cleanPath.startsWith("/docs/")) {
    const rest = cleanPath.slice("/docs/".length);
    // Only resolve metadata for exact /docs/<known-section> — no deeper paths.
    if (rest.includes("/")) return null;
    return docsSectionMeta(rest);
  }

  return ROUTE_META[cleanPath] ?? null;
}

/**
 * Inject host/route-aware metadata into an HTML string, replacing
 * the static NexusOS home-page values with correct per-page values.
 * Also injects a <noscript> landing block before <div id="root"> so
 * non-JS crawlers receive domain-specific above-the-fold content.
 */
export function injectMeta(html: string, host: string, pathname: string): string {
  const meta = resolveMeta(host, pathname);
  if (!meta) return html;

  const newBlock = buildMetaBlock(meta);

  let result = html;

  for (const re of META_PLACEHOLDER_RE) {
    if (re.global) {
      result = result.replace(re, "");
    } else {
      result = result.replace(re, "");
    }
  }

  result = result.replace(
    /(<head[^>]*>)/i,
    `$1\n    ${newBlock}`,
  );

  // Inject domain/route-specific body content for non-JS crawlers
  if (meta.bodyHtml) {
    const noscriptBlock =
      `<noscript><article id="seo-prerender" style="font-family:system-ui,sans-serif;padding:2rem;max-width:860px;margin:0 auto;color:#111;">` +
      meta.bodyHtml +
      `</article></noscript>`;
    result = result.replace(
      /(<div id="root">)/,
      `${noscriptBlock}\n$1`,
    );
  }

  return result;
}
