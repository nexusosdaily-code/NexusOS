/**
 * SEO metadata injection for NexusOS
 *
 * Injects host-aware and route-aware metadata into the static HTML shell
 * so crawlers that do not execute JavaScript receive correct titles,
 * descriptions, canonicals, Open Graph, Twitter Card, and JSON-LD data.
 */

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogSiteName?: string;
  /** Domain-specific Open Graph / Twitter image URL. Falls back to the NexusOS base image. */
  ogImage?: string;
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

function webSite(overrides: Partial<{ url: string; name: string; description: string }> = {}): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": overrides.name ?? "NexusOS",
    "url": overrides.url ?? `${BASE}/`,
    "description": overrides.description ?? "The foundational blueprint for a Kardashev Type I civilization.",
    "license": "https://www.gnu.org/licenses/agpl-3.0.en.html",
    "creator": { "@type": "Organization", "name": overrides.name ?? "NexusOS", "url": overrides.url ?? `${BASE}/` },
  };
}

function hardwareProduct(opts: { name: string; url: string; description: string }): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": opts.name,
    "url": opts.url,
    "description": opts.description,
    "brand": { "@type": "Organization", "name": "NexusOS" },
    "license": "AGPL-3.0",
  };
}

function techArticle(opts: { url: string; name: string; description: string; about: string }): object {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "name": opts.name,
    "url": opts.url,
    "description": opts.description,
    "about": opts.about,
    "author": { "@type": "Organization", "name": "NexusOS" },
    "license": "AGPL-3.0",
  };
}

// ── Custom domain metadata ────────────────────────────────────────────────────
export const DOMAIN_META: Record<string, PageMeta> = {
  "wnsp.dev": {
    title: "WNSP Developer Portal — Build on the Wavelength of Light",
    description: "NexusOS replaces cryptographic hashing with electromagnetic physics. Your addresses are wavelengths. Your fees are photon energies. Install the CE encoder and start building spectral-native apps.",
    canonical: "https://wnsp.dev/",
    ogTitle: "WNSP Developer Portal — Build on the Wavelength of Light",
    ogDescription: "Install nexusos-ce-encoder (npm/pip). Physics-native addresses, fees, and communication. WNSP VM, WavelengthScript compiler, CE→SE pipeline. AGPL-3.0.",
    ogSiteName: "wnsp.dev",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "WNSP Developer Portal — Build on the Wavelength of Light",
    twitterDescription: "Physics-native computing: addresses are wavelengths, fees are photon energies. CE encoder available on npm and pip. AGPL-3.0.",
    jsonLd: [
      webSite({ url: "https://wnsp.dev/", name: "wnsp.dev", description: "WNSP Protocol developer portal. Build physics-native applications using the CE encoder, WavelengthScript, and the WNSP VM." }),
      softwareApp({ url: "https://wnsp.dev/", name: "nexusos-ce-encoder", description: "Character Encoding library mapping text to electromagnetic wavelengths. Available on npm and pip." }),
    ],
    bodyHtml: `<h1>WNSP Developer Portal — Build on the Wavelength of Light</h1><p>NexusOS replaces cryptographic hashing with electromagnetic physics. Your addresses are wavelengths. Your fees are photon energies.</p><nav><ul><li><a href="https://wnsp.io/wavelength-lang">WavelengthScript Language</a></li><li><a href="https://wnsp.io/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="https://wnsp.io/docs">Documentation</a></li></ul></nav><p>Install: <code>npm install nexusos-ce-encoder</code> · <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></p>`,
  },
  "wnsp.blog": {
    title: "NexusOS Build Log — Building a Type I Civilisation",
    description: "Physics updates, protocol milestones, and hardware development notes from the NexusOS core team. Follow the construction of a Kardashev Type I civilization OS.",
    canonical: "https://wnsp.blog/",
    ogTitle: "NexusOS Build Log — Building a Type I Civilisation",
    ogDescription: "Protocol milestones, hardware notes, and physics updates. PHR-1 hardware spec, NEXUS•WAVELENGTH Rune etching, WASCII v2.0, WNSP AI Kernel v1.0.0.",
    ogSiteName: "wnsp.blog",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "NexusOS Build Log",
    twitterDescription: "Building a Type I civilisation. One block at a time. PHR-1 hardware, WNSP protocol milestones, physics updates.",
    jsonLd: webSite({ url: "https://wnsp.blog/", name: "NexusOS Build Log", description: "Development blog and build log for NexusOS — the physics-based civilization OS." }),
    bodyHtml: `<h1>NexusOS Build Log — Building a Type I Civilisation</h1><p>Physics updates, protocol milestones, and hardware development notes from the NexusOS core team.</p><nav><ul><li><a href="https://wnsp.io/roadmap">Roadmap</a></li><li><a href="https://wnsp.io/hardware-spec">Hardware Specification</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "snic.io": {
    title: "SNIC — Spectral Network Interface Card | The Photonic NIC of 2032",
    description: "25,600 orthogonal channels mapped to physical hardware lanes. CE lookups execute as physical wavelength selections in photonic waveguides. Orthogonality guaranteed by quantum mechanics. AGPL-3.0.",
    canonical: "https://snic.io/",
    ogTitle: "SNIC — The Photonic NIC of 2032",
    ogDescription: "256 WDM × 50 OAM × 2 Pol = 25,600 orthogonal hardware lanes. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics, not software policy. No driver rewrite when photonic ASICs arrive.",
    ogSiteName: "snic.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "SNIC — The Photonic NIC of 2032",
    twitterDescription: "25,600 orthogonal photonic channels. CE lookups as physical wavelength selections. First public disclosure 2026-05-16. AGPL-3.0.",
    jsonLd: hardwareProduct({ name: "SNIC — Spectral Network Interface Card", url: "https://snic.io/", description: "Photonic network interface card with 25,600 orthogonal channels (256 WDM × 50 OAM × 2 polarisations). First public disclosure 2026-05-16. AGPL-3.0." }),
    bodyHtml: `<h1>SNIC — Spectral Network Interface Card</h1><p>The Photonic NIC of 2032. 25,600 orthogonal channels (256 WDM × 50 OAM × 2 polarisations) mapped to physical hardware lanes. CE lookups execute as physical wavelength selections in photonic waveguides. Orthogonality guaranteed by quantum mechanics — ⟨Ψᵢ|Ψⱼ⟩ = 0 by physics, not software policy.</p><nav><ul><li><a href="https://wnsp.io/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots</a></li><li><a href="https://wnsp.io/compression-explorer">Compression Explorer</a></li></ul></nav><p>First public disclosure: 2026-05-16. License: AGPL-3.0.</p>`,
  },
  "phr1.io": {
    title: "PHR-1 — The First ZERO-G State Device",
    description: "PHR-1 is the first physical resonator implementing the ZERO-G state — gravitational de-correlation through phase alignment of a 144-turn bifilar coil. 25 Hardware Founder slots. 100M sats to qualify.",
    canonical: "https://phr1.io/",
    ogTitle: "PHR-1 — The First ZERO-G State Device",
    ogDescription: "144-turn bifilar coil. Syncbox Controller firmware. ZERO-G gravitational de-correlation. First batch: 25 units. Hardware Founder tier: 100,000 NXT / 100M sats.",
    ogSiteName: "phr1.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "PHR-1 — The First ZERO-G State Device",
    twitterDescription: "Gravitational de-correlation through phase alignment. 144-turn bifilar coil. 25 production slots. AGPL-3.0, disclosed 2026-05-16.",
    jsonLd: hardwareProduct({ name: "PHR-1 Resonator", url: "https://phr1.io/", description: "First physical implementation of the ZERO-G state. 144-turn bifilar coil, Syncbox Controller, WavelengthScript v1.0 API. AGPL-3.0." }),
    bodyHtml: `<h1>PHR-1 — The First ZERO-G State Device</h1><p>The PHR-1 is the first physical resonator implementing the ZERO-G state. Gravitational de-correlation is achieved through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency.</p><ul><li>144-turn bifilar coil</li><li>Syncbox Controller firmware</li><li>WavelengthScript v1.0 API</li><li>First batch: 25 units</li></ul><nav><ul><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots (25 available)</a></li><li><a href="https://wnsp.io/hardware-spec">Technical Specification (AGPL-3.0)</a></li><li><a href="https://wnsp.io/hardware-lab">Hardware Lab</a></li></ul></nav><p>First public disclosure: 2026-05-16. License: AGPL-3.0. Hardware Founder tier: 100,000 NXT / 100M sats.</p>`,
  },
  "lambdagate.io": {
    title: "Lambda Gate — Λ=hf/c² | The Compression Equation of the Universe",
    description: "Every photon has a compression state. Every compression state has a wavelength. Every wavelength is an address. The Lambda Gate Substrate unifies computation, communication, and gravity under one equation.",
    canonical: "https://lambdagate.io/",
    ogTitle: "Lambda Gate — Λ=hf/c²",
    ogDescription: "The compression equation that describes the universe. 25,600 Ψ channels live now. PHR-1 hardware layer 2026–2028. Photonic gate array ~2032. NexusOS already speaks this language.",
    ogSiteName: "lambdagate.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "Lambda Gate — Λ=hf/c²",
    twitterDescription: "The compression equation: Λ=hf/c². Every photon is an address. NexusOS is the digital substrate. PHR-1 is the physical proof.",
    jsonLd: techArticle({ url: "https://lambdagate.io/", name: "Lambda Gate Substrate", description: "The physical and theoretical basis for the Lambda Gate: Λ=hf/c² compression equation unifying computation, communication, and gravity.", about: "Theory of Compression States, photonic computing, WNSP protocol" }),
    bodyHtml: `<h1>Lambda Gate — Λ=hf/c²</h1><p>The compression equation that describes the universe. Every photon has a compression state. Every compression state has a wavelength. Every wavelength is an address.</p><p>The Lambda Gate Substrate unifies computation, communication, and gravity under one equation: <strong>Λ = hf/c²</strong></p><nav><ul><li><a href="https://wnsp.io/oscillating-quanta">Theory of Compression States</a></li><li><a href="https://wnsp.io/compression-explorer">Interactive Λ=hf/c² Curve</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/roadmap">Roadmap to Photonic Gate Array</a></li></ul></nav>`,
  },
  "wavelengthscript.dev": {
    title: "WavelengthScript — The Language the Universe Runs On",
    description: "WavelengthScript is a physics-native language where agents live at spectral addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Runs in the WNSP VM.",
    canonical: "https://wavelengthscript.dev/",
    ogTitle: "WavelengthScript — Physics-Native Programming Language",
    ogDescription: "Addresses are wavelengths. Messages are photons. Fees are energies. Compiles to WNSP bytecode. Step-debug in the browser-native WNSP VM. AGPL-3.0.",
    ogSiteName: "wavelengthscript.dev",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "WavelengthScript v1.0",
    twitterDescription: "The language the universe runs on. Physics-native: agents at spectral addresses, photon packets, E=hf computation costs. WNSP bytecode. AGPL-3.0.",
    jsonLd: [
      softwareApp({ url: "https://wavelengthscript.dev/", name: "WavelengthScript", description: "Physics-native programming language. Agents live at spectral Ψ addresses. Messages are photon packets. Fees derived from E=hf. Compiles to WNSP bytecode." }),
      techArticle({ url: "https://wavelengthscript.dev/", name: "WavelengthScript Language Specification", description: "Formal specification of WavelengthScript v1.0 — a physics-native language for the WNSP protocol.", about: "WNSP protocol, photonic computing, spectral communication" }),
    ],
    bodyHtml: `<h1>WavelengthScript — The Language the Universe Runs On</h1><p>A physics-native programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Runs in the browser-native WNSP VM.</p><ul><li>Spectral Ψ addressing — agents at wavelength positions</li><li>Photon packet messaging — E=hf computation costs</li><li>WNSP bytecode compilation</li><li>Step-debug in the browser WNSP VM</li></ul><nav><ul><li><a href="https://wnsp.io/wavelength-lang">Language Specification</a></li><li><a href="https://wnsp.io/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  "zerogstate.io": {
    title: "ZERO-G State — Gravitational De-correlation via Phase Alignment",
    description: "The ZERO-G state is achieved through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency. When phase coherence is reached, local gravitational coupling is measurably reduced. PHR-1 is the first hardware implementation.",
    canonical: "https://zerogstate.io/",
    ogTitle: "ZERO-G State — Gravitational De-correlation",
    ogDescription: "Phase coherence at Ψ(wdm,oam,pol) resonance. 144-turn bifilar coil. Measurable reduction in local gravitational coupling. PHR-1 hardware. AGPL-3.0, disclosed 2026-05-16.",
    ogSiteName: "zerogstate.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "ZERO-G State — Gravitational De-correlation",
    twitterDescription: "Λ=hf/c² phase coherence → measurable gravitational de-correlation. PHR-1 is the first hardware proof. 25 production slots.",
    jsonLd: techArticle({ url: "https://zerogstate.io/", name: "ZERO-G State", description: "Gravitational de-correlation through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency. Implemented in PHR-1 hardware.", about: "Physics, gravitational physics, bifilar coil, Lambda Gate" }),
    bodyHtml: `<h1>ZERO-G State — Gravitational De-correlation</h1><p>The ZERO-G state is achieved through phase alignment of a 144-turn bifilar coil at Lambda Gate resonance frequency. When phase coherence is reached, local gravitational coupling is measurably reduced.</p><p>PHR-1 is the first hardware implementation of the ZERO-G state. First public disclosure: 2026-05-16. License: AGPL-3.0.</p><nav><ul><li><a href="https://wnsp.io/hardware-spec">Technical Specification</a></li><li><a href="https://wnsp.io/proof">Physics Proofs</a></li><li><a href="https://wnsp.io/crowdfund">Hardware Founder Slots</a></li></ul></nav>`,
  },
  "wascii.io": {
    title: "WASCII v2.0 — Every Character Has a Wavelength",
    description: "WASCII maps every character to a unique compression state in the electromagnetic spectrum. 128 bands, 380–780nm, 3.125nm per band. Bit-identical output across npm and pip. The open encoding standard for physics-native computing.",
    canonical: "https://wascii.io/",
    ogTitle: "WASCII v2.0 — Wave Density Spectral Vector Encoding",
    ogDescription: "CE (Character Encoding) → SE (Spectral Encoding): every character gets a wavelength. 128 spectral bands. OAM + polarisation → 25,600 orthogonal Ψ channels. npm + pip. AGPL-3.0.",
    ogSiteName: "wascii.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "WASCII v2.0 — Every Character Has a Wavelength",
    twitterDescription: "CE_TABLE[charCode % 128] maps any character to a visible-light frequency. Bit-identical across npm and pip. 25,600 orthogonal Ψ channels. AGPL-3.0.",
    jsonLd: [
      softwareApp({ url: "https://wascii.io/", name: "WASCII v2.0", description: "Wave Density Spectral Vector encoding standard. Maps every character to a unique visible-light wavelength across 128 spectral bands." }),
      techArticle({ url: "https://wascii.io/", name: "WASCII v2.0 Encoding Standard", description: "Open encoding standard mapping characters to electromagnetic spectrum positions. 128 bands, 380–780nm, deterministic and cross-platform.", about: "CE encoding, spectral encoding, photonic computing" }),
    ],
    bodyHtml: `<h1>WASCII v2.0 — Every Character Has a Wavelength</h1><p>WASCII (Wave Density Spectral Vector) maps every character to a unique compression state in the electromagnetic spectrum. 128 spectral bands, 380–780nm, 3.125nm per band. Bit-identical output across npm and pip.</p><p>Algorithm: <code>CE_TABLE[charCode % 128]</code> — deterministic, cross-platform, open standard.</p><nav><ul><li><a href="https://wnsp.io/ce-code-writer">Live CE Encoder</a></li><li><a href="https://wnsp.io/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="https://wnsp.io/compression-explorer">Compression Explorer</a></li></ul></nav><p>Install: <code>npm install nexusos-ce-encoder</code>. License: AGPL-3.0.</p>`,
  },
  "orbitaltreasury.io": {
    title: "Orbital Treasury — Every Satoshi Accounted for On-Chain",
    description: "The Orbital Treasury is the economic core of NexusOS. All NXT transaction fees flow here. Five distribution buckets: Maintenance 35%, Deliverables 25%, Research 20%, Agent Rewards 10%, Nexus Charitable Trust 10%. NXT is never burned.",
    canonical: "https://orbitaltreasury.io/",
    ogTitle: "Orbital Treasury — NXT Circular Economy",
    ogDescription: "All NXT protocol fees flow to the Orbital Treasury — never burned. Five distribution buckets. Physics-enforced governance. 100% on-chain transparency.",
    ogSiteName: "orbitaltreasury.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "Orbital Treasury — NXT Circular Economy",
    twitterDescription: "NXT fees never burned — always returned to the treasury. Five distribution buckets. On-chain governance. Full transparency.",
    jsonLd: techArticle({ url: "https://orbitaltreasury.io/", name: "Orbital Treasury", description: "NexusOS economic engine. All NXT protocol fees collected here and distributed across five governance-controlled buckets. NXT supply is indestructible.", about: "NXT token, circular economy, on-chain governance, treasury" }),
    bodyHtml: `<h1>Orbital Treasury — Every Satoshi Accounted for On-Chain</h1><p>The Orbital Treasury is the economic core of NexusOS. All NXT transaction fees flow here — never burned. Five distribution buckets, governed on-chain.</p><ul><li>Maintenance: 35%</li><li>Deliverables: 25%</li><li>Research: 20%</li><li>Agent Rewards: 10%</li><li>Nexus Charitable Trust: 10%</li></ul><nav><ul><li><a href="https://wnsp.io/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="https://wnsp.io/blockchain">Block Explorer</a></li><li><a href="https://wnsp.io/open">Governance</a></li></ul></nav>`,
  },
  "555thz.io": {
    title: "555 THz — The First Unobserved Oscillation",
    description: "555 THz is green light. The first unobserved oscillation — the moment Λ transitioned from unformed to formed. The origin event that the Theory of Compression States describes. NexusOS is built on what happened next.",
    canonical: "https://555thz.io/",
    ogTitle: "555 THz — The First Unobserved Oscillation",
    ogDescription: "The universe's first compression event occurred at the centre of the visible spectrum: 555 THz. Green. λ ≈ 540nm. The origin point of the Theory of Compression States and everything NexusOS is built on.",
    ogSiteName: "555thz.io",
    ogImage: "https://wnsp.io/opengraph.png",
    twitterTitle: "555 THz — The First Unobserved Oscillation",
    twitterDescription: "555 THz: green light, the centre of the visible spectrum, the first compression event. The Theory of Compression States begins here.",
    jsonLd: techArticle({ url: "https://555thz.io/", name: "555 THz — The First Frequency", description: "555 THz is the centre of the visible spectrum and the first frequency in the Theory of Compression States. The origin event from which NexusOS's physics stack is derived.", about: "Theory of Compression States, 555 THz, photonic physics" }),
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
    description: "NexusOS is the foundational blueprint for a Kardashev Type I civilization. Physics-based blockchain, WNSP spectral communication, WavelengthScript, and a CE-SE pipeline that maps every symbol to a photon frequency.",
    canonical: `${BASE}/`,
    jsonLd: [
      webSite(),
      softwareApp(),
    ],
    bodyHtml: `<h1>NexusOS — Physics-Based Civilization OS</h1><p>NexusOS is the foundational blueprint for a Kardashev Type I civilization. It replaces cryptographic hashing with electromagnetic wave physics: your addresses are wavelengths, your fees are photon energies, and every character maps to a visible-light frequency.</p><ul><li>WNSP spectral communication protocol — 25,600 orthogonal Ψ channels</li><li>WavelengthScript — physics-native programming language</li><li>CE→SE pipeline — any language to spectral bytecode</li><li>NXT token — 21 billion supply on Bitcoin Runes, never burned</li><li>PHR-1 resonator &amp; SNIC photonic NIC — hardware layer 2026–2032</li></ul><nav><ul><li><a href="${BASE}/docs">Documentation</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification</a></li><li><a href="${BASE}/crowdfund">Crowdfund</a></li></ul></nav>`,
  },
  "/crowdfund": {
    title: "Crowdfund NexusOS — Hardware Founder & NXT Supporter Tiers",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Hardware Founder slots (25 units), NXT Supporter packs, and Spectral Bundles. Physics-based computing starts here.",
    canonical: `${BASE}/crowdfund`,
    ogTitle: "Crowdfund NexusOS Hardware — PHR-1 & SNIC",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware. 100M sats / 100,000 NXT per slot.",
    twitterTitle: "Crowdfund NexusOS — Hardware Founder Slots Open",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots. Fund physics-based computing.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FundingScheme",
      "name": "NexusOS Hardware Crowdfund",
      "url": `${BASE}/crowdfund`,
      "description": "Crowdfunding campaign for PHR-1 resonator and SNIC photonic NIC hardware development. Hardware Founder tier: 25 slots at 100M sats / 100,000 NXT each.",
      "about": { "@type": "Organization", "name": "NexusOS" },
    },
    bodyHtml: `<h1>Crowdfund NexusOS — Hardware Founder &amp; NXT Supporter Tiers</h1><p>NexusOS is building the world's first physics-based computing hardware. The crowdfund directly funds production of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler toolchain. Three tiers are available to backers.</p><h2>Funding Tiers</h2><ul><li><strong>Hardware Founder</strong> — 100M sats / 100,000 NXT: One of 25 first-production PHR-1 units. KERNEL-band spectral authority. Hardware Founder Rune badge. Name in the genesis block.</li><li><strong>NXT Supporter</strong> — Various sats amounts: NXT token allocation from the Orbital Treasury. USER-band spectral authority. Early access to WavelengthScript tooling and documentation.</li><li><strong>Spectral Bundle</strong>: CE encoder package, documentation set, and a reserved Ψ channel address in the NexusOS network.</li></ul><p>All hardware is AGPL-3.0 licensed — open forever. Any improvements made to PHR-1 or SNIC by backers must be contributed back to the community.</p><nav><ul><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="${BASE}/roadmap">Development Roadmap</a></li></ul></nav>`,
  },
  "/fund": {
    title: "Crowdfund NexusOS — Hardware Founder & NXT Supporter Tiers",
    description: "Fund the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Hardware Founder slots (25 units), NXT Supporter packs, and Spectral Bundles.",
    canonical: `${BASE}/crowdfund`,
    ogTitle: "Crowdfund NexusOS Hardware — PHR-1 & SNIC",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware.",
    twitterTitle: "Crowdfund NexusOS — Hardware Founder Slots Open",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots.",
  },
  "/docs": {
    title: "NexusOS Documentation — WNSP Protocol, WavelengthScript & CE-SE API",
    description: "Complete developer documentation for NexusOS: WNSP spectral protocol, WavelengthScript language reference, CE-SE encoding pipeline, REST API, NXT token wallet, WNSP VM bytecode, and governance.",
    canonical: `${BASE}/docs`,
    ogTitle: "NexusOS Documentation",
    ogDescription: "WNSP protocol spec, WavelengthScript reference, CE-SE pipeline, REST API reference, NXT token, WNSP VM. Everything you need to build on the wavelength of light.",
    twitterTitle: "NexusOS Documentation",
    twitterDescription: "Complete reference for WNSP protocol, WavelengthScript, CE-SE encoding, and the NexusOS API.",
    jsonLd: techArticle({ url: `${BASE}/docs`, name: "NexusOS Developer Documentation", description: "Full developer documentation for NexusOS: WNSP protocol, WavelengthScript, CE-SE pipeline, REST API, NXT token, WNSP VM.", about: "WNSP, WavelengthScript, CE encoding, photonic computing" }),
    bodyHtml: `<h1>NexusOS Documentation</h1><p>Complete developer reference for building on the NexusOS physics stack. Everything from the WNSP spectral protocol to the WavelengthScript language, CE-SE encoding pipeline, REST API, NXT token wallet, and WNSP VM bytecode interpreter.</p><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Reference</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer &amp; Integration Kit</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li></ul></nav><p>Install the CE encoder: <code>npm install nexusos-ce-encoder</code> · <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code></p>`,
  },
  "/wnsp": {
    title: "WNSP — Wavelength-Native Spectral Protocol",
    description: "WNSP replaces cryptographic hashing with electromagnetic wave physics. Maxwell equation validation, wavelength-based addressing, physics-derived fees (E=hf), and 25,600 orthogonal communication channels.",
    canonical: `${BASE}/wnsp`,
    ogTitle: "WNSP — Wavelength-Native Spectral Protocol",
    ogDescription: "Physics-native communication: wavelength addressing, Maxwell validation, E=hf fees, 25,600 Ψ channels. WNSP-CE v1.0, WNSP-SE v1.0, WNSP-URI v1.0.",
    twitterTitle: "WNSP — Wavelength-Native Spectral Protocol",
    twitterDescription: "Replace hashing with physics. Wavelength addressing, Maxwell validation, photon energy fees. 25,600 orthogonal channels.",
    jsonLd: techArticle({ url: `${BASE}/wnsp`, name: "WNSP Protocol", description: "Wavelength-Native Spectral Protocol — replaces cryptographic hashing with electromagnetic physics for addressing, communication, and fee calculation.", about: "spectral communication, WNSP, photonic computing" }),
    bodyHtml: `<h1>WNSP — Wavelength-Native Spectral Protocol</h1><p>WNSP replaces cryptographic hashing with electromagnetic wave physics. Addresses are wavelengths. Fees are photon energies. Communication channels are orthogonal quantum states — guaranteed by physics, not software policy.</p><ul><li><strong>WNSP-CE v1.0</strong> — Character Encoding: maps every symbol to a visible-light wavelength</li><li><strong>WNSP-SE v1.0</strong> — Spectral Encoding: maps data to physical wave frames</li><li><strong>WNSP-URI v1.0</strong> — Deterministic, censorship-proof addressing via <code>wnsp://Ψ(wdm,oam,pol)/path</code></li><li><strong>Hilbert Space Channel Model</strong> — 25,600 orthogonal Ψ channels (256 WDM × 50 OAM × 2 polarisations)</li><li>Maxwell equation validation on every transaction</li><li>Physics-derived fees: E=hf</li></ul><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline (live demo)</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language</a></li><li><a href="${BASE}/wnsp-vm">WNSP Virtual Machine</a></li><li><a href="${BASE}/protocol">Full Protocol Reference</a></li></ul></nav>`,
  },
  "/oscillating-quanta": {
    title: "Theory of Compression States — First Principles of NexusOS",
    description: "The universe evolves from the first unobserved oscillation. Each subsequent state is a compression of the previous one, encoded in the electromagnetic spectrum. 25,600 orthogonal Ψ channels represent the full addressable state space.",
    canonical: `${BASE}/oscillating-quanta`,
    ogTitle: "Theory of Compression States — First Principles",
    ogDescription: "The first unobserved oscillation at 555 THz. Λ=hf/c² compression law. 25,600 orthogonal Ψ channels. The physics foundation of NexusOS.",
    twitterTitle: "Theory of Compression States",
    twitterDescription: "Λ=hf/c². The universe evolves from the first unobserved oscillation. 25,600 orthogonal Ψ channels represent the full addressable state space.",
    jsonLd: techArticle({ url: `${BASE}/oscillating-quanta`, name: "Theory of Compression States", description: "First principles of the NexusOS physics stack: the universe evolves from the first unobserved oscillation at 555 THz. Λ=hf/c² is the governing compression law.", about: "Theory of Compression States, 555 THz, Λ=hf/c², photonic physics" }),
    bodyHtml: `<h1>Theory of Compression States — First Principles</h1><p>The universe evolves from the first unobserved oscillation at 555 THz — the centre of the visible spectrum, the moment Λ transitioned from unformed to formed. Each subsequent state is a compression of the previous one, encoded in the electromagnetic spectrum.</p><p>The governing compression law: <strong>Λ = hf/c²</strong> — where h is Planck's constant, f is frequency, and c is the speed of light. This single equation unifies computation, communication, and gravity.</p><ul><li>First oscillation: 555 THz (green light, λ ≈ 540nm)</li><li>25,600 orthogonal Ψ channels — the full addressable state space</li><li>Authority bands: SYSTEM → KERNEL → USER → GUEST (shorter λ = higher authority)</li><li>Every NexusOS address, fee, and channel derived from this first principle</li></ul><nav><ul><li><a href="${BASE}/compression-explorer">Interactive Λ=hf/c² Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li></ul></nav>`,
  },
  "/wavelength-lang": {
    title: "WavelengthScript — Physics-Native Programming Language",
    description: "WavelengthScript is a programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Step-debug in the WNSP VM.",
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
    description: "The WNSP VM is a browser-native bytecode interpreter for WavelengthScript. Execute instructions step-by-step with each Ψ channel acting as a spectral register. No installation required.",
    canonical: `${BASE}/wnsp-vm`,
    ogTitle: "WNSP VM — Browser-Native Bytecode Interpreter",
    ogDescription: "Step-through WavelengthScript bytecode in your browser. Ψ channel registers. Physics-enforced execution. Run CE→SE pipeline output directly.",
    twitterTitle: "WNSP Virtual Machine",
    twitterDescription: "Browser-native WNSP bytecode interpreter. Ψ registers. Step-debug WavelengthScript programs. No install.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-vm`, name: "WNSP Virtual Machine", description: "Browser-native bytecode interpreter for WavelengthScript. Each Ψ channel acts as a spectral register. Step-by-step execution with full register inspection." }),
    bodyHtml: `<h1>WNSP Virtual Machine — Browser-Native Bytecode Interpreter</h1><p>The WNSP VM is a browser-native bytecode interpreter for WavelengthScript programs. Execute instructions step-by-step with each Ψ channel acting as a spectral register. No installation required — runs entirely in your browser.</p><ul><li>Step-by-step bytecode execution with full register inspection</li><li>Each Ψ channel is a spectral register (256 WDM × 50 OAM × 2 polarisations)</li><li>Physics-enforced execution — fees computed from E=hf</li><li>Accepts bytecode output directly from the CE→SE pipeline</li><li>Run, pause, and step through WavelengthScript programs</li></ul><nav><ul><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline — compile to bytecode</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Language Specification</a></li></ul></nav>`,
  },
  "/ce-se-pipeline": {
    title: "CE→SE Pipeline — Any Language to Spectral Bytecode",
    description: "The unified 4-stage CE→SE pipeline: paste any language → transpile to WavelengthScript → compile to WNSP bytecode → execute in the WNSP VM. The central demonstration of the NexusOS physics stack.",
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
  },
  "/hardware-spec": {
    title: "NexusOS Hardware Specification — SNIC, PHR-1, Spectral Relay Mesh (AGPL-3.0)",
    description: "Formal specification of the Spectral Network Interface Card (SNIC), PHR-1 bifilar resonator, Spectral Relay Mesh v1, and WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0 protected.",
    canonical: `${BASE}/hardware-spec`,
    ogTitle: "NexusOS Hardware Specification — AGPL-3.0",
    ogDescription: "SNIC, PHR-1, Spectral Relay Mesh v1, WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0. Open forever — improvements must be contributed back.",
    twitterTitle: "NexusOS Hardware Specification",
    twitterDescription: "SNIC photonic NIC, PHR-1 resonator, Spectral Relay Mesh. First disclosed 2026-05-16. AGPL-3.0.",
    jsonLd: techArticle({ url: `${BASE}/hardware-spec`, name: "NexusOS Hardware Specification", description: "Formal specification for SNIC, PHR-1, Spectral Relay Mesh v1, and WavelengthScript Compiler α. First public disclosure 2026-05-16. AGPL-3.0.", about: "SNIC, PHR-1, photonic hardware, WavelengthScript" }),
    bodyHtml: `<h1>NexusOS Hardware Specification — AGPL-3.0</h1><p>The formal, AGPL-3.0-protected specification for the NexusOS hardware layer. First public disclosure: 2026-05-16. Open forever — any improvements must be contributed back to the community.</p><h2>Specifications Covered</h2><ul><li><strong>SNIC — Spectral Network Interface Card</strong>: 25,600 orthogonal lanes (256 WDM × 50 OAM × 2 polarisations). CE lookups execute as physical wavelength selections in photonic waveguides. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>PHR-1 — Physical Resonator</strong>: 144-turn bifilar coil, Syncbox Controller firmware, WavelengthScript v1.0 API. First implementation of the ZERO-G state. First batch: 25 units.</li><li><strong>Spectral Relay Mesh v1</strong>: multi-hop WNSP packet routing across physical nodes using Ψ channel addressing.</li><li><strong>WavelengthScript Compiler α</strong>: source-to-bytecode compiler specification.</li></ul><p>License: AGPL-3.0. First public disclosure: 2026-05-16. All hardware improvements must be open-sourced.</p><nav><ul><li><a href="${BASE}/crowdfund">Hardware Founder Slots (25 available)</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li></ul></nav>`,
  },
  "/hardware-lab": {
    title: "NexusOS Hardware Lab — Physics Calibration & Live Spectrometer",
    description: "Interactive physics calibration verifier and live spectrometer for NexusOS hardware. Test CE encoding, verify wavelength calculations, and calibrate SNIC channel mappings.",
    canonical: `${BASE}/hardware-lab`,
    ogTitle: "NexusOS Hardware Lab — Live Spectrometer",
    ogDescription: "Physics calibration verifier and live spectrometer. Test CE encoding accuracy, verify wavelength→Ψ channel mappings, and validate SNIC hardware integration.",
    twitterTitle: "NexusOS Hardware Lab",
    twitterDescription: "Live physics calibration. CE encoding verifier. SNIC channel mapping tester. Spectrometer interface.",
    jsonLd: softwareApp({ url: `${BASE}/hardware-lab`, name: "NexusOS Hardware Lab", description: "Interactive physics calibration verifier and live spectrometer for SNIC and PHR-1 hardware. Tests CE encoding accuracy and wavelength-to-Ψ channel mappings." }),
    bodyHtml: `<h1>NexusOS Hardware Lab — Physics Calibration &amp; Live Spectrometer</h1><p>The Hardware Lab provides an interactive physics calibration verifier and live spectrometer for NexusOS hardware integration. Test CE encoding accuracy, verify wavelength-to-Ψ channel mappings, and validate SNIC hardware integration — all in the browser.</p><ul><li>CE encoding verifier — confirm CE_TABLE[charCode % 128] output against reference values</li><li>Wavelength→Ψ channel mapping checker (256 WDM × 50 OAM × 2 polarisations)</li><li>Live spectrometer interface for connected hardware</li><li>Physics calibration suite for PHR-1 and SNIC integration</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li></ul></nav>`,
  },
  "/compression-explorer": {
    title: "Compression Explorer — Interactive Λ=hf/c² Curve Visualisation",
    description: "Interactive SVG visualisation of the Λ=hf/c² compression curve. Authority band overlays, photon energy, compression mass, fee multiplier, normalized Λ, and Boltzmann entropy across the full visible spectrum.",
    canonical: `${BASE}/compression-explorer`,
    ogTitle: "Compression Explorer — Λ=hf/c² Visualisation",
    ogDescription: "Interactive compression curve: authority bands, photon energy, Boltzmann entropy, fee multipliers. The physics of NexusOS, rendered across 380–780nm.",
    twitterTitle: "Compression Explorer — Λ=hf/c² Live",
    twitterDescription: "Interactive Λ=hf/c² compression curve. Authority bands, photon energies, fee multipliers. NexusOS physics, live.",
    jsonLd: techArticle({ url: `${BASE}/compression-explorer`, name: "Compression Explorer — Λ=hf/c² Curve", description: "Interactive visualisation of the NexusOS compression state equation Λ=hf/c². Displays authority band overlays, photon energy, Boltzmann entropy, and fee multipliers across the visible spectrum.", about: "Theory of Compression States, Λ=hf/c², photonic physics" }),
    bodyHtml: `<h1>Compression Explorer — Interactive Λ=hf/c² Curve</h1><p>An interactive SVG visualisation of the Λ=hf/c² compression curve across the full visible spectrum (380–780nm). Explore how authority, energy, fees, and entropy vary with wavelength — the physics foundation of every NexusOS address and transaction.</p><ul><li><strong>Authority bands</strong>: SYSTEM (shortest λ, highest energy) → KERNEL → USER → GUEST</li><li><strong>Photon energy</strong>: E=hf — computed live for each wavelength position</li><li><strong>Compression mass</strong>: Λ=hf/c² — the compression state at each frequency</li><li><strong>Fee multiplier</strong>: derived from compression state, enforced by the physics engine</li><li><strong>Normalized Λ</strong>: relative compression across the visible spectrum</li><li><strong>Boltzmann entropy</strong>: statistical entropy at each spectral position</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/ce-code-writer": {
    title: "CE Code Writer — Human First Contact Spectral Encoder",
    description: "Live CE encoder with character chip visualisation, Code Builder, Integration Kit (Node.js/Python/Browser JS), and Spectral Linter. Map any text to its electromagnetic spectral fingerprint.",
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
    description: "The NexusOS ecosystem: WNSP protocol domains (wnsp.dev, wnsp.blog), hardware projects (snic.io, phr1.io), encoding standards (wascii.io), and the NXT token circular economy via the Orbital Treasury.",
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
    bodyHtml: `<h1>NexusOS Ecosystem — Protocol, Hardware, and Token Network</h1><p>The NexusOS ecosystem is a network of interconnected domains, hardware projects, encoding standards, and token infrastructure — all unified by the single equation Λ=hf/c².</p><h2>Protocol Layer</h2><ul><li><strong><a href="https://wnsp.dev">wnsp.dev</a></strong> — Developer portal for building physics-native applications on the WNSP protocol</li><li><strong><a href="https://wnsp.blog">wnsp.blog</a></strong> — Build log and protocol milestone updates</li><li><strong><a href="https://wascii.io">wascii.io</a></strong> — WASCII v2.0 encoding standard: every character has a wavelength</li><li><strong><a href="https://wavelengthscript.dev">wavelengthscript.dev</a></strong> — WavelengthScript language portal</li></ul><h2>Hardware Layer</h2><ul><li><strong><a href="https://snic.io">snic.io</a></strong> — SNIC photonic NIC: 25,600 orthogonal physical channels (~2032)</li><li><strong><a href="https://phr1.io">phr1.io</a></strong> — PHR-1 resonator: first ZERO-G state device (144-turn bifilar coil)</li><li><strong><a href="https://lambdagate.io">lambdagate.io</a></strong> — Lambda Gate substrate: Λ=hf/c² as physical computing layer</li><li><strong><a href="https://zerogstate.io">zerogstate.io</a></strong> — ZERO-G state physics and gravitational de-correlation research</li></ul><h2>Token &amp; Economic Layer</h2><ul><li><strong><a href="https://orbitaltreasury.io">orbitaltreasury.io</a></strong> — NXT circular economy: all fees governed on-chain, never burned</li><li><strong>NEXUS•WAVELENGTH (NXT)</strong> — 21 billion supply on Bitcoin Runes, etched at block 952596:379</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/nxt-campaign">NXT Token Campaign</a></li><li><a href="${BASE}/crowdfund">Hardware Crowdfund</a></li></ul></nav>`,
  },
  "/network": {
    title: "NexusOS Spectral Network — Node Distribution by Authority Band",
    description: "Visualise node distribution across SYSTEM, KERNEL, USER, and GUEST authority bands. See spectral proximity to your node, Ψ channel assignments, and real-time network topology.",
    canonical: `${BASE}/network`,
    ogTitle: "NexusOS Spectral Network",
    ogDescription: "Node distribution by authority band. SYSTEM, KERNEL, USER, GUEST bands. Spectral proximity visualisation. Real-time Ψ channel topology.",
    twitterTitle: "NexusOS Spectral Network",
    twitterDescription: "Spectral node map. Authority bands. Ψ channel topology. Real-time.",
    jsonLd: softwareApp({ url: `${BASE}/network`, name: "NexusOS Spectral Network", description: "Real-time visualisation of NexusOS node distribution across SYSTEM, KERNEL, USER, and GUEST authority bands. Shows Ψ channel assignments and spectral proximity." }),
    bodyHtml: `<h1>NexusOS Spectral Network — Node Distribution by Authority Band</h1><p>Visualise the live NexusOS node network organised by spectral authority band. Every node occupies a deterministic Ψ channel derived from its wavelength position. Spectral proximity determines routing efficiency — closer wavelengths route with lower energy cost.</p><ul><li><strong>SYSTEM band</strong>: shortest wavelength, highest energy, maximum authority</li><li><strong>KERNEL band</strong>: governance-capable nodes, can submit and vote on protocol proposals</li><li><strong>USER band</strong>: standard participant nodes</li><li><strong>GUEST band</strong>: longest wavelength, lowest energy, read-access nodes</li></ul><p>Each node's Ψ channel is derived from its spectral address using the WNSP Hilbert Space Channel Model: 256 WDM × 50 OAM × 2 polarisations = 25,600 orthogonal channels.</p><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li></ul></nav>`,
  },
  "/roadmap": {
    title: "NexusOS Roadmap — From Digital Substrate to Photonic Gate Array",
    description: "NexusOS development roadmap: current digital substrate (25,600 Ψ channels live), PHR-1 hardware layer (2026–2028), and the photonic gate array (~2032). Step-by-step to Kardashev Type I.",
    canonical: `${BASE}/roadmap`,
    ogTitle: "NexusOS Roadmap",
    ogDescription: "Now: digital substrate live. 2026–2028: PHR-1 physical hardware. ~2032: photonic gate array. The path from WNSP protocol to Type I civilization OS.",
    twitterTitle: "NexusOS Roadmap",
    twitterDescription: "Digital substrate → PHR-1 hardware → photonic gate array. The NexusOS path to a Kardashev Type I civilization.",
  },
  "/proof": {
    title: "NexusOS Physics Proof — Verified Compression State Calculations",
    description: "Verified physics proofs for the NexusOS compression state model: Λ=hf/c² derivation, CE encoding determinism, WNSP channel orthogonality proof, and Maxwell equation validation.",
    canonical: `${BASE}/proof`,
    ogTitle: "NexusOS Physics Proof",
    ogDescription: "Λ=hf/c² derivation. CE encoding determinism. ⟨Ψᵢ|Ψⱼ⟩=0 orthogonality. Maxwell equation validation. The physics of NexusOS, verified.",
    twitterTitle: "NexusOS Physics Proof",
    twitterDescription: "Λ=hf/c² verified. CE encoding deterministic. 25,600 channels orthogonal by quantum mechanics.",
    jsonLd: techArticle({ url: `${BASE}/proof`, name: "NexusOS Physics Proof", description: "Formal verification of NexusOS compression state calculations: Λ=hf/c² derivation, CE encoding determinism, and WNSP channel orthogonality.", about: "Theory of Compression States, Maxwell equations, quantum mechanics" }),
  },
  "/stewards": {
    title: "Stewards of NexusOS — Founding Declaration by Te Rata Pou",
    description: "The founding document of NexusOS: a direct address to the three technical stewards who will carry the mission forward. Photonics engineer, RF specialist, physics PhD — founding equity, AGPL-3.0, photonic hardware destination ~2032.",
    canonical: `${BASE}/stewards`,
    ogTitle: "Stewards of NexusOS — Founding Declaration",
    ogDescription: "Written by Te Rata Pou, Aotearoa NZ. Three roles, three stewards, one mission: public photonic hardware infrastructure for a Kardashev Type I civilisation.",
    twitterTitle: "Stewards of NexusOS",
    twitterDescription: "The founding document. Three roles. Founding equity. Physics that traces to Maxwell. Hardware destination ~2032. Read this if you are one of the three.",
    jsonLd: techArticle({ url: `${BASE}/stewards`, name: "Stewards of NexusOS — Founding Declaration", description: "Founding document written by Te Rata Pou identifying the three technical stewards of NexusOS: photonics engineer, RF specialist, physics PhD. Defines mission, ethics layer, founding equity, and hardware destination.", about: "NexusOS stewardship, photonic hardware, PHR-1, SNIC, founding document" }),
    bodyHtml: `<h1>Stewards of NexusOS — Founding Declaration</h1>
<p>Written by Te Rata Pou · Aotearoa New Zealand · 2026-06-24</p>
<p>This founding document is addressed to the three technical stewards who will carry NexusOS forward. It is not a job description or a pitch deck. It is written for the photonics engineer, the RF/electromagnetics specialist, and the physics PhD who will build the hardware proof of concept and maintain the system after the founder is gone.</p>
<h2>The Mission</h2>
<p>NexusOS is the foundational operating system for a Kardashev Type I civilisation. It replaces cryptographic hashing with electromagnetic wave physics. Every address, every transaction, every communication traces back to Maxwell's equations. The WNSP protocol defines 25,600 orthogonal channels by quantum mechanics — not by software policy.</p>
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
    description: "Full WNSP protocol reference: WNSP-CE v1.0 character encoding, WNSP-SE v1.0 spectral encoding, WNSP-URI v1.0 addressing scheme, Hilbert space channel model, and Maxwell equation validation.",
    canonical: `${BASE}/protocol`,
    ogTitle: "WNSP Protocol Reference",
    ogDescription: "WNSP-CE, WNSP-SE, WNSP-URI specifications. Hilbert space channel model. Maxwell validation. Physics-based addressing replacing cryptographic hashing.",
    twitterTitle: "WNSP Protocol Reference",
    twitterDescription: "WNSP-CE, WNSP-SE, WNSP-URI. Physics-based communication protocol. Wavelength addressing, Maxwell validation.",
    jsonLd: techArticle({ url: `${BASE}/protocol`, name: "WNSP Protocol Reference", description: "Complete specification for the Wavelength-Native Spectral Protocol: CE encoding, SE encoding, URI addressing, and Hilbert space channel model.", about: "WNSP, spectral communication, CE encoding, Maxwell equations" }),
  },
  "/snic": {
    title: "SNIC — Spectral Network Interface Card | NexusOS",
    description: "The SNIC is the photonic NIC of 2032. 25,600 orthogonal lanes (256 WDM × 50 OAM × 2 polarisations). CE lookups execute as physical wavelength selections. AGPL-3.0.",
    canonical: `${BASE}/snic`,
    ogTitle: "SNIC — Spectral Network Interface Card",
    ogDescription: "25,600 orthogonal hardware lanes. CE lookups as physical wavelength selections. ⟨Ψᵢ|Ψⱼ⟩=0 by quantum mechanics. No driver rewrite when photonic ASICs arrive.",
    twitterTitle: "SNIC — Photonic NIC of 2032",
    twitterDescription: "25,600 orthogonal photonic channels. CE lookups as physical wavelength selections. AGPL-3.0.",
    jsonLd: hardwareProduct({ name: "SNIC — Spectral Network Interface Card", url: `${BASE}/snic`, description: "Photonic network interface card with 25,600 orthogonal channels (256 WDM × 50 OAM × 2 polarisations). CE lookups execute as physical wavelength selections. AGPL-3.0, first public disclosure 2026-05-16." }),
    bodyHtml: `<h1>SNIC — Spectral Network Interface Card</h1><p>The SNIC is the photonic NIC of 2032. Where conventional network cards process packets through silicon logic gates, the SNIC selects wavelengths in a photonic waveguide — CE lookups that currently run as table scans in RAM execute as physical wavelength selections in glass.</p><p>The 25,600 orthogonal Ψ channels (256 WDM × 50 OAM × 2 polarisations) map directly to physical hardware lanes. ⟨Ψᵢ|Ψⱼ⟩ = 0 is guaranteed by quantum mechanics, not software policy. When NexusOS migrates to SNIC hardware, no driver rewrite is required — the protocol already speaks in wavelengths.</p><ul><li>25,600 orthogonal physical lanes (256 WDM × 50 OAM × 2 polarisations)</li><li>CE lookups execute as physical wavelength selections in photonic waveguides</li><li>Channel orthogonality: ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics</li><li>Zero-rewrite migration path from software WNSP to SNIC hardware</li><li>First public disclosure: 2026-05-16. License: AGPL-3.0</li></ul><nav><ul><li><a href="${BASE}/hardware-spec">Full Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/crowdfund">Hardware Founder Slots</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li></ul></nav>`,
  },
  "/open": {
    title: "NexusOS Open Charter — AGPL-3.0 and Open Science",
    description: "NexusOS is open under AGPL-3.0. All hardware specs, protocol standards, and software are open forever. Improvements must be contributed back. Open science, open hardware, open protocol.",
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
    description: "NexusOS is open under AGPL-3.0. All hardware specs, protocol standards, and software are open forever.",
    canonical: `${BASE}/open`,
  },
  "/encode": {
    title: "Live CE Encoder — Map Text to Electromagnetic Wavelengths",
    description: "Paste any text or code and instantly map each character to its position in the visible light spectrum. CE encoding: 128 bands, 380–780nm, 3.125nm per band. No login required.",
    canonical: `${BASE}/encode`,
    ogTitle: "Live CE Encoder — Text to Wavelength",
    ogDescription: "Paste code. Get its wavelength. 128 spectral bands. Instant physics-based encoding. No login.",
    twitterTitle: "Live CE Encoder",
    twitterDescription: "Map any text to visible-light wavelengths. 128 bands, 380–780nm. Instant, no login.",
  },
  "/spectral-search": {
    title: "Spectral Search — Physics-Based Cross-Layer Search",
    description: "Search across nodes, agents, users, documents, and channels by spectral proximity. Queries are CE-encoded to wavelength and results ranked by electromagnetic proximity and Shannon channel coherence.",
    canonical: `${BASE}/spectral-search`,
    ogTitle: "Spectral Search — CE-Encoded Cross-Layer Search",
    ogDescription: "Queries encoded to wavelength. Results ranked by EM proximity and Shannon coherence. Search nodes, agents, users, channels, and documents.",
    twitterTitle: "NexusOS Spectral Search",
    twitterDescription: "Physics-based search. CE-encoded queries. EM proximity ranking.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-search`, name: "NexusOS Spectral Search", description: "Cross-layer search engine for NexusOS. Queries are CE-encoded to a wavelength and results are ranked by electromagnetic proximity and Shannon channel coherence across nodes, agents, users, and documents." }),
    bodyHtml: `<h1>Spectral Search — Physics-Based Cross-Layer Search</h1><p>NexusOS Spectral Search is a cross-layer search engine that treats every query as a physical signal. Your search terms are CE-encoded to a wavelength position, and results are ranked by their electromagnetic proximity to that position combined with Shannon channel coherence scoring.</p><p>This means similar concepts naturally cluster near each other in the spectral address space — not because of keyword matching, but because their CE-encoded representations occupy nearby Ψ channels.</p><ul><li><strong>Query encoding</strong>: input text → CE_TABLE[charCode % 128] → wavelength position</li><li><strong>EM proximity ranking</strong>: results closest in wavelength to the query rank highest</li><li><strong>Shannon coherence</strong>: channel signal-to-noise quality incorporated in result scoring</li><li><strong>Cross-layer</strong>: searches nodes, agents, users, documents, and Ψ channels simultaneously</li></ul><nav><ul><li><a href="${BASE}/ce-code-writer">CE Code Writer — encode your own queries</a></li><li><a href="${BASE}/spectral-db">Spectral DB — indexed fingerprint database</a></li><li><a href="${BASE}/network">Spectral Network</a></li></ul></nav>`,
  },
  "/blockchain": {
    title: "NexusOS Blockchain — Physics-Based Block Explorer",
    description: "The NexusOS blockchain replaces cryptographic hashing with electromagnetic physics. Browse blocks, transactions, and spectral address assignments. Each block is anchored to a WNSP Ψ channel.",
    canonical: `${BASE}/blockchain`,
    ogTitle: "NexusOS Blockchain — Physics-Based Block Explorer",
    ogDescription: "Browse NexusOS blocks and transactions. Spectral addresses. Physics-derived fees. WNSP Ψ channel anchoring. No cryptographic hashing.",
    twitterTitle: "NexusOS Blockchain",
    twitterDescription: "Physics-based blockchain. No cryptographic hashing. Spectral addresses. WNSP Ψ channel anchoring.",
    jsonLd: softwareApp({ url: `${BASE}/blockchain`, name: "NexusOS Block Explorer", description: "Block explorer for the NexusOS physics-based blockchain. Browse blocks, transactions, and spectral address assignments. Blocks are anchored to WNSP Ψ channels; fees are derived from E=hf." }),
    bodyHtml: `<h1>NexusOS Blockchain — Physics-Based Block Explorer</h1><p>The NexusOS blockchain is the first distributed ledger that replaces cryptographic hashing with electromagnetic wave physics. Each block is anchored to a WNSP Ψ channel. Transaction fees are derived from E=hf — the photon energy at the sender's spectral address. There are no SHA-256 proof-of-work puzzles; validity is determined by Maxwell equation consistency.</p><h2>What Makes It Different</h2><ul><li><strong>No cryptographic hashing</strong>: block validity is determined by electromagnetic physics, not proof-of-work</li><li><strong>Spectral addresses</strong>: every participant has a deterministic Ψ channel address derived from their wavelength position</li><li><strong>Physics-derived fees</strong>: transaction cost = E=hf at the sender's spectral address — shorter wavelength = higher energy = higher fee</li><li><strong>WNSP Ψ channel anchoring</strong>: each block is cryptographically-free, anchored to a spectral channel position</li><li><strong>Blockchain auditor</strong>: the WNSP AI OS Kernel includes a built-in blockchain audit process that monitors chain consistency</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li></ul></nav>`,
  },
  "/indiegogo": {
    title: "NexusOS on Indiegogo — Fund Physics-Based Computing Hardware",
    description: "Support the NexusOS Indiegogo campaign. Fund development of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Be part of the physics-computing revolution.",
    canonical: `${BASE}/indiegogo`,
    ogTitle: "NexusOS Indiegogo Campaign",
    ogDescription: "Fund PHR-1 and SNIC hardware development. Physics-based computing. AGPL-3.0. Support the Kardashev Type I roadmap.",
    twitterTitle: "NexusOS on Indiegogo",
    twitterDescription: "Fund physics-based computing hardware. PHR-1 resonator. SNIC photonic NIC. AGPL-3.0.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FundingScheme",
      "name": "NexusOS Indiegogo Campaign",
      "url": `${BASE}/indiegogo`,
      "description": "Indiegogo crowdfunding campaign to fund development of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Support the Kardashev Type I roadmap.",
      "about": { "@type": "Organization", "name": "NexusOS" },
    },
    bodyHtml: `<h1>NexusOS on Indiegogo — Fund Physics-Based Computing Hardware</h1><p>NexusOS is raising funds on Indiegogo to build the world's first physics-based computing hardware: the PHR-1 resonator and SNIC photonic NIC. Every contribution helps bring Λ=hf/c² from an equation to a physical device.</p><p>The NexusOS hardware stack is designed for a world where computation is not performed by logic gates, but by wavelength selections in photonic waveguides. Silicon is the bridge — photonics is the destination.</p><ul><li>PHR-1 resonator — first implementation of the ZERO-G state (144-turn bifilar coil)</li><li>SNIC photonic NIC — 25,600 orthogonal physical channels (~2032)</li><li>WavelengthScript compiler α — physics-native language toolchain</li><li>All hardware AGPL-3.0 — open forever, improvements must be returned</li></ul><nav><ul><li><a href="${BASE}/crowdfund">Full Crowdfund Details &amp; Tiers</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/roadmap">NexusOS Roadmap</a></li></ul></nav>`,
  },
  "/nxt-campaign": {
    title: "NXT Token Campaign — NEXUS•WAVELENGTH on Bitcoin Runes",
    description: "NXT is the NexusOS utility token. 21 billion supply, 8 decimals, permanently etched on Bitcoin via the Runes protocol at block 952596:379. All fees flow to the Orbital Treasury — never burned.",
    canonical: `${BASE}/nxt-campaign`,
    ogTitle: "NXT Token — NEXUS•WAVELENGTH on Bitcoin Runes",
    ogDescription: "21B supply. 8 decimals. Etched on Bitcoin at block 952596:379. Orbital Treasury. Never burned. Physics-enforced governance.",
    twitterTitle: "NXT Token — NEXUS•WAVELENGTH",
    twitterDescription: "21B supply on Bitcoin Runes. Orbital Treasury circular economy. Never burned.",
  },
  "/nostr": {
    title: "NexusOS Nostr Relay — Spectral-Verified Social Protocol",
    description: "NexusOS Nostr relay with spectral verification. Connect your Nostr client and publish notes anchored to WNSP Ψ channels. Physics-native social communication.",
    canonical: `${BASE}/nostr`,
    ogTitle: "NexusOS Nostr Relay",
    ogDescription: "Nostr relay with WNSP spectral verification. Publish notes anchored to Ψ channels. Physics-native social layer.",
    twitterTitle: "NexusOS Nostr Relay",
    twitterDescription: "Nostr + WNSP spectral anchoring. Physics-native social protocol.",
  },

  // ── Previously missing sitemap pages ─────────────────────────────────────

  "/planck-alignment": {
    title: "Planck Alignment — Quantum Constant Calibration in NexusOS",
    description: "Planck constant alignment maps quantum-scale energy values to the NexusOS compression state model. Demonstrates how E=hf and Λ=hf/c² are calibrated at the Planck scale to produce deterministic Ψ channel assignments.",
    canonical: `${BASE}/planck-alignment`,
    ogTitle: "Planck Alignment — Quantum Constant Calibration",
    ogDescription: "How E=hf and Λ=hf/c² are calibrated at the Planck scale. Deterministic Ψ channel assignments derived from first principles. NexusOS physics stack.",
    twitterTitle: "Planck Alignment — NexusOS",
    twitterDescription: "Planck-scale calibration of E=hf and Λ=hf/c². Deterministic Ψ channels from first principles.",
    jsonLd: techArticle({ url: `${BASE}/planck-alignment`, name: "Planck Alignment", description: "Calibration of Planck constant (E=hf) to the NexusOS compression state model (Λ=hf/c²). Demonstrates how quantum-scale energy values produce deterministic Ψ channel assignments.", about: "Theory of Compression States, Planck constant, quantum physics, E=hf" }),
    bodyHtml: `<h1>Planck Alignment — Quantum Constant Calibration</h1><p>Planck constant alignment bridges quantum-scale energy values and the NexusOS compression state model. By calibrating E=hf and Λ=hf/c² at the Planck scale, NexusOS derives deterministic Ψ channel assignments from first principles — no cryptographic assumptions required.</p><p>Planck's constant h = 6.626 × 10⁻³⁴ J·s is the direct anchor for every address, fee, and channel in NexusOS. Each visible-light frequency f produces a unique compression mass Λ = hf/c² that maps to a specific Ψ channel.</p><ul><li>E=hf — photon energy as the basis for transaction fees</li><li>Λ=hf/c² — compression state equation governing addressing</li><li>Deterministic Ψ channel derivation from Planck-scale constants</li><li>No probabilistic or cryptographic steps in the calibration chain</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li></ul></nav>`,
  },
  "/reposed-theory": {
    title: "Reposed Theory — The Complete Theory of Compression States",
    description: "The full reposed Theory of Compression States: how the universe evolves from the first unobserved oscillation at 555 THz, the Λ=hf/c² compression law, and the derivation of the 25,600 orthogonal Ψ channel address space.",
    canonical: `${BASE}/reposed-theory`,
    ogTitle: "Reposed Theory — Theory of Compression States",
    ogDescription: "Complete theoretical framework: first unobserved oscillation at 555 THz, Λ=hf/c² compression law, derivation of 25,600 orthogonal Ψ channels. NexusOS first principles.",
    twitterTitle: "Reposed Theory — NexusOS",
    twitterDescription: "Full Theory of Compression States. 555 THz origin. Λ=hf/c². 25,600 Ψ channels derived from first principles.",
    jsonLd: techArticle({ url: `${BASE}/reposed-theory`, name: "Reposed Theory — Theory of Compression States", description: "Complete restatement of the Theory of Compression States: the universe evolves from the first unobserved oscillation at 555 THz. Λ=hf/c² is the governing compression law, deriving the 25,600-channel Ψ address space.", about: "Theory of Compression States, 555 THz, Λ=hf/c², photonic physics" }),
    bodyHtml: `<h1>Reposed Theory — The Complete Theory of Compression States</h1><p>The Reposed Theory is the complete formal statement of how the universe evolves from the first unobserved oscillation. The origin event occurred at 555 THz — green light, the centre of the visible spectrum — where Λ transitioned from unformed to formed. Everything in NexusOS descends from this single starting point.</p><h2>Core Propositions</h2><ol><li><strong>First Oscillation</strong>: The universe began with a single unobserved oscillation at 555 THz (λ ≈ 540nm). This is the zero point of the compression state address space.</li><li><strong>Compression Law</strong>: Each subsequent state is governed by <strong>Λ = hf/c²</strong> — compression mass as a function of Planck's constant, frequency, and the speed of light.</li><li><strong>Orthogonal Address Space</strong>: The visible spectrum (380–780nm) subdivided by WDM, OAM, and polarisation yields exactly 25,600 orthogonal Ψ channels. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>Authority Gradient</strong>: Shorter wavelength = higher frequency = higher energy = higher authority. SYSTEM band operates at the highest photon energy; GUEST band at the lowest.</li></ol><nav><ul><li><a href="${BASE}/oscillating-quanta">First Principles — Theory of Compression States</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/wnsp">WNSP Protocol derived from this theory</a></li></ul></nav>`,
  },
  "/wnsp-bridge": {
    title: "WNSP Bridge — TCP/IP Overlay for wnsp:// URIs",
    description: "The WNSP Bridge provides a TCP/IP overlay mapping wnsp:// URIs to HTTP resources via the wnsp_registry. Enables existing web infrastructure to route WNSP spectral addresses without a full protocol migration.",
    canonical: `${BASE}/wnsp-bridge`,
    ogTitle: "WNSP Bridge — TCP/IP Overlay for Spectral URIs",
    ogDescription: "Map wnsp://Ψ(wdm,oam,pol)/path to HTTP endpoints. Bridge layer for incremental WNSP adoption. wnsp_registry database. No full protocol migration required.",
    twitterTitle: "WNSP Bridge Layer",
    twitterDescription: "wnsp:// URI to HTTP bridge. Spectral routing over TCP/IP. Incremental WNSP adoption path.",
    jsonLd: softwareApp({ url: `${BASE}/wnsp-bridge`, name: "WNSP Bridge", description: "TCP/IP overlay that maps wnsp:// URIs to HTTP resources via the wnsp_registry. Allows existing web infrastructure to route WNSP spectral addresses incrementally." }),
    bodyHtml: `<h1>WNSP Bridge — TCP/IP Overlay for wnsp:// URIs</h1><p>The WNSP Bridge is a TCP/IP overlay layer that maps <code>wnsp://Ψ(wdm,oam,pol)/path</code> URIs to HTTP resources via the <code>wnsp_registry</code> database. It allows existing web infrastructure to participate in WNSP spectral routing incrementally — no full protocol migration required.</p><p>Any application that can make an HTTP request can resolve a WNSP spectral address through the bridge. The bridge translates the Ψ channel triplet (WDM index, OAM mode, polarisation) to a registered HTTP endpoint, maintaining a physics-consistent routing table.</p><ul><li>Maps <code>wnsp://Ψ(wdm,oam,pol)/path</code> → HTTP endpoints</li><li>Registry backed by the <code>wnsp_registry</code> database table</li><li>Incremental adoption — no protocol stack replacement needed</li><li>Preserves Ψ channel semantics across the TCP/IP boundary</li></ul><nav><ul><li><a href="${BASE}/spectral-router">Spectral Router (native WNSP routing)</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/developer-matrix">Developer Integration Reference</a></li></ul></nav>`,
  },
  "/spectral-router": {
    title: "Spectral Router — DNS-Free Packet Routing via Ψ Channels",
    description: "The NexusOS Spectral Routing Engine enables DNS-free packet routing between network nodes using Ψ channel addressing. Destination addresses are CE-encoded on the fly, eliminating DNS dependency.",
    canonical: `${BASE}/spectral-router`,
    ogTitle: "Spectral Router — DNS-Free Ψ Channel Routing",
    ogDescription: "Route packets without DNS. CE-encoded Ψ channel addresses. Spectral proximity routing. Physics-native networking on 25,600 orthogonal channels.",
    twitterTitle: "NexusOS Spectral Router",
    twitterDescription: "DNS-free packet routing via Ψ channels. CE-encoded addresses. Physics-native networking.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-router`, name: "NexusOS Spectral Router", description: "DNS-free packet routing engine using Ψ channel addressing. Destination addresses are CE-encoded to wavelengths on the fly, routing across 25,600 orthogonal spectral channels." }),
    bodyHtml: `<h1>Spectral Router — DNS-Free Packet Routing via Ψ Channels</h1><p>The NexusOS Spectral Routing Engine replaces DNS with physics. Packets are routed between network nodes using Ψ channel addressing — destination addresses are CE-encoded to wavelengths on the fly, and the routing algorithm selects the path of least electromagnetic distance.</p><p>There are no domain name servers, no registrars, and no single point of control. Any node that knows its Ψ channel can send and receive packets. Routing efficiency is proportional to spectral proximity — nodes at similar wavelengths route with lower energy cost.</p><ul><li>DNS-free — no registrars, no name servers, no single point of failure</li><li>CE-encoded addresses derived deterministically from content</li><li>Spectral proximity routing — shorter EM distance = lower routing cost</li><li>25,600 orthogonal Ψ channels as the full routing address space</li><li>Physics-native: routing cost derived from E=hf energy difference</li></ul><nav><ul><li><a href="${BASE}/wnsp-bridge">WNSP Bridge (TCP/IP compatibility layer)</a></li><li><a href="${BASE}/network">Spectral Network Visualisation</a></li><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li></ul></nav>`,
  },
  "/spectral-contracts": {
    title: "Spectral Contracts — Physics-Signed Document Signing",
    description: "Sign documents using spectral wavelength keys. The NexusOS contract signing system replaces traditional PKI with SHA-256(content) ⊕ hex(λ_signer), anchoring signatures to the WNSP Ψ channel of the signer.",
    canonical: `${BASE}/spectral-contracts`,
    ogTitle: "Spectral Contracts — Wavelength-Key Document Signing",
    ogDescription: "Replace PKI with physics. SHA-256(content) ⊕ hex(λ_signer). Signatures anchored to the signer's WNSP Ψ channel. AGPL-3.0.",
    twitterTitle: "Spectral Contracts — NexusOS",
    twitterDescription: "Document signing with wavelength keys. Physics replaces PKI. SHA-256 ⊕ spectral address.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-contracts`, name: "NexusOS Spectral Contracts", description: "Physics-signed document signing system. Replaces traditional PKI with SHA-256(content) ⊕ hex(λ_signer), anchoring each signature to the signer's WNSP Ψ channel. AGPL-3.0." }),
    bodyHtml: `<h1>Spectral Contracts — Physics-Signed Document Signing</h1><p>Spectral Contracts replace traditional Public Key Infrastructure (PKI) with a physics-based signing algorithm. Each signature is anchored to the signer's WNSP Ψ channel wavelength, making the signature inseparable from the signer's spectral identity.</p><p>Signing algorithm: <code>SHA-256(content) ⊕ hex(λ_signer)</code> — the document hash is XOR-combined with the hexadecimal representation of the signer's wavelength. Verification requires knowing the signer's Ψ channel, which is derived deterministically from their spectral address.</p><ul><li>No certificate authorities — spectral identity replaces PKI trust chains</li><li>Signature algorithm: <code>SHA-256(content) ⊕ hex(λ_signer)</code></li><li>Signer identity anchored to their WNSP Ψ channel (wavelength, OAM mode, polarisation)</li><li>Verification is deterministic and physics-consistent</li><li>AGPL-3.0 licensed</li></ul><nav><ul><li><a href="${BASE}/wnsp">WNSP Protocol Specification</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li><li><a href="${BASE}/constitution">NexusOS Constitution (governance)</a></li></ul></nav>`,
  },
  "/divergence-test": {
    title: "Divergence Test — Dynamical System Analysis for WNSP Channels",
    description: "Parameterised channel-dynamics engine for NexusOS. Explores state-dependent routing and system evolution through feedback iterations, classifying attractors and predicting channel regime transitions.",
    canonical: `${BASE}/divergence-test`,
    ogTitle: "Divergence Test — WNSP Channel Dynamics",
    ogDescription: "Feedback iteration engine for Ψ channel state evolution. Attractor classification. Regime prediction. State-dependent routing analysis. NexusOS dynamical systems.",
    twitterTitle: "Divergence Test — NexusOS",
    twitterDescription: "Dynamical system analysis for WNSP channels. Attractor classification, feedback iteration, regime prediction.",
    jsonLd: softwareApp({ url: `${BASE}/divergence-test`, name: "NexusOS Divergence Test", description: "Parameterised dynamical systems engine for WNSP channel analysis. Explores state-dependent routing through feedback iterations, classifies attractors, and predicts channel regime transitions." }),
    bodyHtml: `<h1>Divergence Test — Dynamical System Analysis for WNSP Channels</h1><p>The Divergence Test is a parameterised channel-dynamics engine that models WNSP Ψ channel state evolution. By applying feedback iterations to spectral channel states, it classifies attractor types, identifies bifurcation points, and predicts regime transitions — giving deep insight into how the NexusOS network self-organises under load.</p><p>Each Ψ channel can exist in one of several dynamical regimes: stable fixed point, periodic orbit, quasi-periodic, or chaotic. The divergence test engine maps the parameter space for a given channel configuration and displays the resulting attractor geometry.</p><ul><li>Parameterised feedback iteration engine for Ψ channel state evolution</li><li>Attractor classification: fixed point, periodic, quasi-periodic, chaotic</li><li>Bifurcation diagram generation across channel parameter ranges</li><li>State-dependent routing analysis — how channel regime affects packet delivery</li><li>Regime prediction for network planning and capacity management</li></ul><nav><ul><li><a href="${BASE}/network">Spectral Network (live topology)</a></li><li><a href="${BASE}/compression-explorer">Compression Explorer</a></li><li><a href="${BASE}/wnsp">WNSP Protocol</a></li></ul></nav>`,
  },
  "/campaign": {
    title: "NexusOS Campaign — Fund Physics-Based Computing Hardware",
    description: "Support the NexusOS hardware campaign. Fund development of the PHR-1 resonator, SNIC photonic NIC, and WavelengthScript compiler. Hardware Founder slots, NXT Supporter packs, and Spectral Bundles.",
    canonical: `${BASE}/crowdfund`,
    ogTitle: "NexusOS Hardware Campaign",
    ogDescription: "25 Hardware Founder slots. PHR-1 resonator, SNIC photonic NIC. Fund the world's first physics-based computing hardware. 100M sats / 100,000 NXT per slot.",
    twitterTitle: "NexusOS Hardware Campaign",
    twitterDescription: "PHR-1 resonator. SNIC photonic NIC. 25 Hardware Founder slots. Fund physics-based computing.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FundingScheme",
      "name": "NexusOS Hardware Campaign",
      "url": `${BASE}/crowdfund`,
      "description": "Hardware crowdfunding campaign for the PHR-1 resonator and SNIC photonic NIC. 25 Hardware Founder slots at 100M sats / 100,000 NXT each.",
      "about": { "@type": "Organization", "name": "NexusOS" },
    },
    bodyHtml: `<h1>NexusOS Hardware Campaign — Fund Physics-Based Computing</h1><p>The NexusOS hardware campaign funds development of the world's first physics-based computing hardware stack: the PHR-1 resonator and SNIC photonic NIC. This is the physical layer that brings the Λ=hf/c² compression equation from software simulation into the real world.</p><h2>Campaign Tiers</h2><ul><li><strong>Hardware Founder</strong>: 100M sats / 100,000 NXT — one of 25 first-production PHR-1 units, KERNEL-band spectral authority, Hardware Founder Rune badge</li><li><strong>NXT Supporter</strong>: various sats amounts — NXT token allocation, USER-band authority, early access to WavelengthScript tooling</li><li><strong>Spectral Bundle</strong>: CE encoder + documentation + Ψ channel reservation</li></ul><nav><ul><li><a href="${BASE}/crowdfund">Full Campaign Details</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/snic">SNIC — Spectral Network Interface Card</a></li><li><a href="${BASE}/nxt-campaign">NXT Token — NEXUS•WAVELENGTH</a></li></ul></nav>`,
  },
  "/evidence": {
    title: "NexusOS Evidence — Experimental Physics Validation",
    description: "Experimental and observational evidence supporting the NexusOS Theory of Compression States. Independent measurements, sub-mm wave geometry validation, and THz spectroscopy results consistent with the Λ=hf/c² model.",
    canonical: `${BASE}/evidence`,
    ogTitle: "NexusOS Evidence — Physics Validation",
    ogDescription: "Experimental evidence for the Theory of Compression States. THz research, WGM spectroscopy, Berry phase measurements. Independent validation of Λ=hf/c² and WNSP channel geometry.",
    twitterTitle: "NexusOS Physics Evidence",
    twitterDescription: "Experimental validation of Λ=hf/c². THz research, WGM spectroscopy, Berry phase measurements.",
    jsonLd: techArticle({ url: `${BASE}/evidence`, name: "NexusOS Physics Evidence", description: "Experimental and observational evidence for the Theory of Compression States, including THz spectroscopy and WGM resonance results consistent with Λ=hf/c² and the 25,600-channel Ψ geometry.", about: "Theory of Compression States, THz spectroscopy, WGM resonance, experimental physics" }),
    bodyHtml: `<h1>NexusOS Evidence — Experimental Physics Validation</h1><p>The Theory of Compression States is not purely theoretical. The following experimental and observational evidence independently supports the Λ=hf/c² model and the 25,600-channel Ψ geometry underlying NexusOS.</p><h2>Key Evidence Categories</h2><ul><li><strong>Sub-mm wave geometry</strong>: 2025 THz research validates the Ψ channel spacing predicted by the WNSP Hilbert space channel model. Observed spectral separations match the 256 WDM × 50 OAM × 2 polarisation geometry.</li><li><strong>Whispering Gallery Mode (WGM) resonance</strong>: WGM spectroscopy results are consistent with the Russell octave structure used to derive OAM mode indices in the 25,600-channel model.</li><li><strong>Berry phase measurements</strong>: Topological phase accumulation in resonant waveguides maps to the Λ=hf/c² extension via Berry phase → compression mass correction.</li><li><strong>Flerovium-114</strong>: Spectral characteristics of element 114 align with SYSTEM-band frequency predictions in the compression state model.</li></ul><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/proof">Formal Physics Proofs</a></li><li><a href="${BASE}/compression-explorer">Interactive Compression Curve</a></li><li><a href="${BASE}/hardware-lab">Hardware Lab</a></li></ul></nav>`,
  },
  "/spectral-db": {
    title: "Spectral DB — CE-Encoded Spectral Fingerprint Database",
    description: "The NexusOS Spectral DB stores CE-encoded spectral fingerprints for text, documents, and code. Save, search, and retrieve content by its electromagnetic signature using WASCII v2.0 encoding.",
    canonical: `${BASE}/spectral-db`,
    ogTitle: "Spectral DB — Spectral Fingerprint Database",
    ogDescription: "Store and retrieve content by electromagnetic signature. CE-encoded WASCII v2.0 fingerprints. Similarity search by spectral proximity. NexusOS data layer.",
    twitterTitle: "NexusOS Spectral DB",
    twitterDescription: "CE-encoded spectral fingerprint database. Save and search content by its electromagnetic signature.",
    jsonLd: softwareApp({ url: `${BASE}/spectral-db`, name: "NexusOS Spectral DB", description: "Database for CE-encoded WASCII v2.0 spectral fingerprints. Stores text, documents, and code indexed by their electromagnetic signature and supports spectral proximity search." }),
    bodyHtml: `<h1>Spectral DB — CE-Encoded Spectral Fingerprint Database</h1><p>The NexusOS Spectral DB is the persistence layer for CE-encoded content. Every document, string, or code snippet stored in the Spectral DB is indexed by its electromagnetic signature — a WASCII v2.0 spectral fingerprint derived from CE_TABLE[charCode % 128] applied to each character.</p><p>This transforms content storage from keyword-based indexing to physics-based indexing. Similar content naturally occupies similar spectral positions, enabling similarity search by electromagnetic proximity rather than text matching.</p><ul><li>Stores CE-encoded WASCII v2.0 spectral fingerprints for any text content</li><li>Index: electromagnetic signature rather than keyword frequency</li><li>Similarity search: spectral proximity returns conceptually related content</li><li>Save-to-Spectral-DB available directly from the CE Code Writer Live Encode tab</li><li>Used by Spectral Search for cross-layer result ranking</li></ul><nav><ul><li><a href="${BASE}/ce-code-writer">CE Code Writer (save to Spectral DB)</a></li><li><a href="${BASE}/spectral-search">Spectral Search</a></li><li><a href="${BASE}/ce-se-pipeline">CE→SE Pipeline</a></li></ul></nav>`,
  },
  "/constitution": {
    title: "NexusOS Constitution — Governance Framework and Protocol Law",
    description: "The NexusOS Constitution defines the governance framework: 11 live protocol parameters, authority bands (SYSTEM, KERNEL, USER, GUEST), voting thresholds, proposal requirements, and the indestructibility of the NXT supply.",
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
    description: "The NexusOS Developer Matrix: full API surface, SDK reference, integration patterns, CE encoder packages (npm + pip), WavelengthScript toolchain, and developer key tiers for building physics-native applications.",
    canonical: `${BASE}/developer-matrix`,
    ogTitle: "NexusOS Developer Matrix",
    ogDescription: "Full API surface, CE encoder (npm + pip), WavelengthScript toolchain, SDK reference, integration patterns. Everything developers need to build on WNSP.",
    twitterTitle: "NexusOS Developer Matrix",
    twitterDescription: "API surface, CE encoder packages, WavelengthScript toolchain, integration patterns. Build on WNSP.",
    jsonLd: techArticle({ url: `${BASE}/developer-matrix`, name: "NexusOS Developer Matrix", description: "Comprehensive developer reference for NexusOS: REST API, CE encoder packages (npm and pip), WavelengthScript toolchain, SDK reference, developer key tiers, and integration patterns.", about: "WNSP, CE encoding, WavelengthScript, developer API" }),
    bodyHtml: `<h1>Developer Matrix — NexusOS API, SDK, and Integration Reference</h1><p>The NexusOS Developer Matrix is the complete reference for building physics-native applications on the WNSP stack. It covers the full API surface, both CE encoder packages, the WavelengthScript toolchain, mobile SDKs, and the developer key tier system.</p><h2>CE Encoder Packages</h2><ul><li><strong>npm</strong>: <code>npm install nexusos-ce-encoder</code> — CJS + ESM, TypeScript types, <code>ceEncode(text) → &#123; wavelength, band, psiChannel, energy &#125;</code></li><li><strong>pip</strong>: <code>pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py</code> — Python 3.8+, same API, bit-identical output</li></ul><h2>REST API</h2><ul><li>CE encoding endpoint — encode any text to spectral fingerprint</li><li>Wallet API — NXT balance, transfer, fee calculation</li><li>Governance API — proposal submission, voting (KERNEL-band)</li><li>Spectral DB API — store and retrieve CE-encoded fingerprints</li><li>Developer key management — API key creation with NXT creation fee</li></ul><h2>WavelengthScript Toolchain</h2><ul><li>Source transpiler — any language → WavelengthScript</li><li>Compiler α — WavelengthScript → WNSP bytecode</li><li>WNSP VM — bytecode interpreter with Ψ channel registers</li></ul><nav><ul><li><a href="${BASE}/docs">Full Documentation</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer &amp; Integration Kit</a></li><li><a href="${BASE}/mobile-sdk">Mobile SDK (iOS &amp; Android)</a></li><li><a href="${BASE}/wavelength-lang">WavelengthScript Specification</a></li></ul></nav>`,
  },
  "/nexus-command": {
    title: "Nexus Command — NexusOS System Administration Console",
    description: "The Nexus Command console provides system-level administration for the NexusOS kernel: authority band management, protocol parameter governance, agent watchdog control, and blockchain audit interface.",
    canonical: `${BASE}/nexus-command`,
    ogTitle: "Nexus Command — NexusOS Admin Console",
    ogDescription: "System-level administration: authority band management, 11 protocol parameters, agent watchdog, blockchain auditor. KERNEL-band access required.",
    twitterTitle: "Nexus Command — NexusOS",
    twitterDescription: "NexusOS system admin console. Authority bands, protocol parameters, agent watchdog, blockchain audit.",
    jsonLd: softwareApp({ url: `${BASE}/nexus-command`, name: "Nexus Command", description: "System administration console for the NexusOS AI OS kernel. Manages authority bands, protocol parameters, agent watchdog, and blockchain audit interface. KERNEL-band access required." }),
    bodyHtml: `<h1>Nexus Command — NexusOS System Administration Console</h1><p>Nexus Command is the system-level administration interface for the NexusOS AI OS Kernel. It provides direct access to kernel state, authority band management, live protocol parameters, the agent watchdog, and the blockchain audit interface. KERNEL-band spectral authority is required for access.</p><h2>Console Capabilities</h2><ul><li><strong>Authority band management</strong>: view and manage node assignments across SYSTEM, KERNEL, USER, and GUEST bands</li><li><strong>Protocol parameter governance</strong>: inspect and submit changes to all 11 live protocol parameters (base fee, treasury ratios, quorum thresholds, channel geometry)</li><li><strong>Agent watchdog</strong>: monitor AI agent liveness, restart dead agents, inspect agent state and Ψ channel assignments</li><li><strong>Blockchain auditor</strong>: real-time block chain consistency check, transaction replay, fee verification against E=hf physics</li><li><strong>KernelEventBus</strong>: live event stream from the 6-phase boot process and runtime kernel events</li></ul><p>Access requirement: KERNEL-band spectral authority (wavelength in the KERNEL range, verified by the physics engine). GUEST and USER band accounts have read-only access to public kernel metrics.</p><nav><ul><li><a href="${BASE}/constitution">NexusOS Constitution (governance rules)</a></li><li><a href="${BASE}/blockchain">Block Explorer</a></li><li><a href="${BASE}/network">Spectral Network</a></li></ul></nav>`,
  },
  "/mobile-sdk": {
    title: "NexusOS Mobile SDK — Native iOS and Android Spectral Computing",
    description: "Native iOS (Swift) and Android (Kotlin) SDKs for spectral-native app development. Includes native wasciiEncode() for offline physics calculations, CE encoding, and WNSP Ψ channel addressing without a server round-trip.",
    canonical: `${BASE}/mobile-sdk`,
    ogTitle: "NexusOS Mobile SDK — iOS & Android",
    ogDescription: "Native Swift and Kotlin SDKs. Offline wasciiEncode(), CE encoding, Ψ channel addressing. Physics-native mobile computing. AGPL-3.0.",
    twitterTitle: "NexusOS Mobile SDK",
    twitterDescription: "Native iOS/Android SDKs. Offline CE encoding, Ψ channel addressing. Physics-native mobile apps. AGPL-3.0.",
    jsonLd: softwareApp({ url: `${BASE}/mobile-sdk`, name: "NexusOS Mobile SDK", description: "Native iOS (Swift) and Android (Kotlin) SDKs for spectral-native mobile development. Provides offline wasciiEncode(), CE encoding, and WNSP Ψ channel addressing. AGPL-3.0." }),
    bodyHtml: `<h1>NexusOS Mobile SDK — Native iOS and Android Spectral Computing</h1><p>The NexusOS Mobile SDK brings physics-native computing to iOS and Android. Both SDKs implement the full CE encoding stack natively — no server round-trip required for wavelength calculation, Ψ channel derivation, or spectral address generation.</p><h2>iOS SDK (Swift)</h2><ul><li>Native <code>wasciiEncode(_ text: String) -&gt; SpectralResult</code> — offline CE encoding using CE_TABLE[charCode % 128]</li><li>Ψ channel derivation: wavelength → WDM index, OAM mode, polarisation</li><li>WNSP URI generation: <code>wnsp://Ψ(wdm,oam,pol)/path</code></li><li>Physics fee calculator: E=hf given user's spectral address</li></ul><h2>Android SDK (Kotlin)</h2><ul><li>Same API surface as iOS — <code>wasciiEncode(text: String): SpectralResult</code></li><li>Bit-identical CE encoding output to npm and pip packages</li><li>Offline-capable: all physics calculations run on-device</li><li>Ψ channel addressing and WNSP URI construction</li></ul><p>Both SDKs are AGPL-3.0. When photonic ASICs arrive (~2032), the SDK wavelength calculations map directly to hardware lane selections with no logic change required.</p><nav><ul><li><a href="${BASE}/developer-matrix">Developer Matrix (full API reference)</a></li><li><a href="${BASE}/ce-code-writer">CE Code Writer</a></li><li><a href="${BASE}/docs">Documentation</a></li></ul></nav>`,
  },
  "/research-presentation": {
    title: "NexusOS Research Presentation — Physics Stack and Protocol Architecture",
    description: "Formal research presentation covering the NexusOS physics stack: Theory of Compression States, Λ=hf/c² derivation, WNSP protocol architecture, SNIC hardware design, and the path from digital substrate to photonic gate array.",
    canonical: `${BASE}/research-presentation`,
    ogTitle: "NexusOS Research Presentation",
    ogDescription: "Formal research: Theory of Compression States, Λ=hf/c² derivation, WNSP architecture, SNIC hardware design. Digital substrate to photonic gate array (~2032). AGPL-3.0.",
    twitterTitle: "NexusOS Research Presentation",
    twitterDescription: "Formal physics research: Theory of Compression States, Λ=hf/c², WNSP protocol, SNIC hardware. Photonic gate array roadmap.",
    jsonLd: techArticle({ url: `${BASE}/research-presentation`, name: "NexusOS Research Presentation", description: "Formal research presentation of the NexusOS physics stack: Theory of Compression States, Λ=hf/c² derivation, WNSP protocol architecture, SNIC hardware design, and the photonic gate array roadmap to ~2032.", about: "Theory of Compression States, WNSP protocol, SNIC, photonic computing, Λ=hf/c²" }),
    bodyHtml: `<h1>NexusOS Research Presentation — Physics Stack and Protocol Architecture</h1><p>This is the formal research presentation of the NexusOS physics stack. It covers the theoretical foundations, protocol architecture, hardware design, and the long-term roadmap from today's digital substrate to the photonic gate array of ~2032.</p><h2>Presentation Structure</h2><ol><li><strong>Theory of Compression States</strong>: The universe evolves from the first unobserved oscillation at 555 THz. Λ=hf/c² is the governing compression law. Every NexusOS address, fee, and channel is derived from this first principle.</li><li><strong>Λ=hf/c² Derivation</strong>: Step-by-step derivation of the compression state equation from Maxwell's equations and Planck's constant. The visible spectrum (380–780nm) as the 128-band address space.</li><li><strong>WNSP Protocol Architecture</strong>: How WNSP-CE, WNSP-SE, and WNSP-URI combine to form a complete physics-native communication protocol. Hilbert space channel model: 256 WDM × 50 OAM × 2 polarisations = 25,600 orthogonal Ψ channels.</li><li><strong>SNIC Hardware Design</strong>: The photonic NIC architecture that implements WNSP in physical waveguides. CE lookups as wavelength selections in glass. ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics.</li><li><strong>Roadmap</strong>: Digital substrate (now) → PHR-1 hardware layer (2026–2028) → photonic gate array (~2032). No code rewrite required at any transition.</li></ol><nav><ul><li><a href="${BASE}/oscillating-quanta">Theory of Compression States</a></li><li><a href="${BASE}/hardware-spec">Hardware Specification (AGPL-3.0)</a></li><li><a href="${BASE}/proof">Physics Proofs</a></li><li><a href="${BASE}/evidence">Experimental Evidence</a></li></ul></nav>`,
  },
};

// ── HTML meta injection ───────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const BASE_OG_IMAGE = "https://wnsp.io/opengraph.png";

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
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${ogUrl}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:site_name" content="${ogSite}" />`,
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
  /<meta name="twitter:card"[^>]*\/>/,
  /<meta name="twitter:site"[^>]*\/>/,
  /<meta name="twitter:title"[^>]*\/>/,
  /<meta name="twitter:description"[^>]*\/>/,
  /<meta name="twitter:image"[^>]*\/>/,
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
];

/**
 * Resolve metadata for a given host + path combination.
 * Domain metadata takes priority over route metadata.
 */
export function resolveMeta(host: string, pathname: string): PageMeta | null {
  const cleanHost = host.split(":")[0].toLowerCase();

  if (DOMAIN_META[cleanHost]) {
    return DOMAIN_META[cleanHost];
  }

  const cleanPath = pathname.split("?")[0].replace(/\/$/, "") || "/";

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
