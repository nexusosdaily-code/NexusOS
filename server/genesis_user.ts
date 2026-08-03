/**
 * Genesis user seeder — runs once on server startup.
 * Creates the Nexus admin account if it doesn't exist, and always
 * ensures the Nexus account holds SYSTEM band authority.
 * Idempotent: safe to call on every boot.
 *
 * Nexus spectral identity (CE-encoded from username "Nexus"):
 *   λ = 586.8085 nm  ·  Ψ(52,3,V)  ·  WDM 52  → SYSTEM band (WDM 0–63)
 */

import { CONSTITUTION_PSI } from "./constitution_seal";

const GENESIS_PASSWORD = "NexusOS2026";
const GENESIS_USERNAME = "Nexus";

// CE-encoded spectral identity — deterministic, permanent
const NEXUS_SPECTRAL = {
  spectralWdm:  52,
  spectralOam:  3,
  spectralPol:  "V",
  spectralNm:   586.8085,
  spectralBand: "SYSTEM",
} as const;

// Genesis balances
const NEXUS_SATS_BALANCE = 6_203_869_822n;

// Genesis sats stakes — replicated from original Nexus dev account
const GENESIS_SATS_STAKES = [
  { amountSats: 2_000_000_000,  lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-02T06:04:55.533Z", maturesAt: "2026-07-02T06:04:55.532Z", nxtYield: "560000.00000000" },
  { amountSats: 2_001_000_118,  lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:45:15.288Z", maturesAt: "2026-07-03T03:45:15.287Z", nxtYield: "560280.03304000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:54:49.924Z", maturesAt: "2026-07-03T03:54:49.923Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:57:41.120Z", maturesAt: "2026-07-03T03:57:41.119Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:57:56.327Z", maturesAt: "2026-07-03T03:57:56.327Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:16.673Z", maturesAt: "2026-07-03T03:58:16.673Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:30.879Z", maturesAt: "2026-07-03T03:58:30.879Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:44.263Z", maturesAt: "2026-07-03T03:58:44.262Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:06.661Z", maturesAt: "2026-07-03T03:59:06.660Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:23.607Z", maturesAt: "2026-07-03T03:59:23.606Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:35.325Z", maturesAt: "2026-07-03T03:59:35.324Z", nxtYield: "2800000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 7,  yieldRatePercent: "5.00",  stakedAt: "2026-06-03T14:41:18.819Z", maturesAt: "2026-06-10T14:41:18.819Z", nxtYield: "2500000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 7,  yieldRatePercent: "5.00",  stakedAt: "2026-06-03T14:41:32.690Z", maturesAt: "2026-06-10T14:41:32.690Z", nxtYield: "2500000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T15:39:24.890Z", maturesAt: "2026-07-03T15:39:24.889Z", nxtYield: "14000000.00000000" },
];

// Genesis WNSP inscription stakes
const GENESIS_WNSP_STAKES = [
  { inscriptionId: "test-inscription-fix-verify-001", wnspAmount: 1000, stakedAt: "2026-05-30T20:24:15.373Z" },
];

export async function seedGenesisUser() {
  try {
    const { db } = await import("./db");
    const { users, wallets, lightningWallets, satsStakes, wnspStakes } = await import("@shared/schema");
    const { eq, count } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    const [nexus] = await db.select().from(users).where(eq(users.username, GENESIS_USERNAME));

    if (nexus) {
      // Always force-reset password + ensure SYSTEM band + admin role on every boot.
      // This guarantees the Nexus account is always accessible after a deploy,
      // regardless of any password changes that may have happened in the DB.
      const passwordHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
      await db.update(users).set({
        ...NEXUS_SPECTRAL,
        role: "admin",
        passwordHash,
        isActive:   true,
        isVerified: true,
      }).where(eq(users.username, GENESIS_USERNAME));
      console.log("[GENESIS USER] ✓ Nexus password force-reset + SYSTEM band confirmed Ψ(52,3,V)");

      // NXT wallet
      const existingWallet = await db.select().from(wallets).where(eq(wallets.userId, nexus.id)).limit(1);
      if (!existingWallet.length) {
        await db.insert(wallets).values({ userId: nexus.id, address: "NXT-NEXS-OS1K-7F3A-OMEGA", balance: "339698690.00000000" });
        console.log("[GENESIS USER] ✓ Nexus NXT wallet created");
      }

      // Lightning wallet + sats balance
      await _seedLightningWallet(db, lightningWallets, nexus.id);

      // Staking positions
      await _seedSatsStakes(db, satsStakes, nexus.id);
      await _seedWnspStakes(db, wnspStakes, nexus.id);

      return nexus;
    }

    // Nexus doesn't exist — create fresh
    console.log("[GENESIS USER] Nexus account missing — creating…");
    const passwordHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
    const [user] = await db.insert(users).values({
      username:    "Nexus",
      passwordHash,
      phoneNumber: "+61476158211",
      role:        "admin",
      isVerified:  true,
      isActive:    true,
      ...NEXUS_SPECTRAL,
    }).returning();

    await db.insert(wallets).values({ userId: user.id, address: "NXT-NEXS-OS1K-7F3A-OMEGA", balance: "339698690.00000000" });
    await _seedLightningWallet(db, lightningWallets, user.id);
    await _seedSatsStakes(db, satsStakes, user.id);
    await _seedWnspStakes(db, wnspStakes, user.id);

    console.log(`[GENESIS USER] ✓ Nexus account created — Ψ(52,3,V) SYSTEM band`);
    return user;
  } catch (err: any) {
    console.error("[GENESIS USER] Could not seed genesis user:", err?.message ?? err);
  }
}

async function _seedLightningWallet(db: any, lightningWallets: any, userId: string) {
  const { eq } = await import("drizzle-orm");
  const existing = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, userId)).limit(1);

  if (!existing.length) {
    await db.insert(lightningWallets).values({ userId, satsBalance: NEXUS_SATS_BALANCE, totalDeposited: NEXUS_SATS_BALANCE, totalWithdrawn: 0n });
    console.log(`[GENESIS USER] ✓ Nexus lightning wallet seeded — ${NEXUS_SATS_BALANCE.toLocaleString()} sats`);
  } else {
    const current = BigInt(existing[0].satsBalance ?? 0);
    if (current < NEXUS_SATS_BALANCE) {
      await db.update(lightningWallets).set({ satsBalance: NEXUS_SATS_BALANCE, totalDeposited: NEXUS_SATS_BALANCE }).where(eq(lightningWallets.userId, userId));
      console.log(`[GENESIS USER] ✓ Nexus lightning wallet upgraded: ${current.toLocaleString()} → ${NEXUS_SATS_BALANCE.toLocaleString()} sats`);
    } else {
      console.log(`[GENESIS USER] Nexus lightning wallet OK — ${current.toLocaleString()} sats`);
    }
  }
}

async function _seedSatsStakes(db: any, satsStakes: any, userId: string) {
  const { eq, count } = await import("drizzle-orm");
  const [{ value }] = await db.select({ value: count() }).from(satsStakes).where(eq(satsStakes.userId, userId));

  if (Number(value) >= GENESIS_SATS_STAKES.length) {
    console.log(`[GENESIS USER] Nexus sats stakes OK — ${value} positions`);
    return;
  }

  // Insert only the missing stakes (idempotent by count)
  const toInsert = GENESIS_SATS_STAKES.slice(Number(value));
  for (const s of toInsert) {
    await db.insert(satsStakes).values({
      userId,
      amountSats:       s.amountSats,
      lockDays:         s.lockDays,
      yieldRatePercent: s.yieldRatePercent,
      stakedAt:         new Date(s.stakedAt),
      maturesAt:        new Date(s.maturesAt),
      nxtYield:         s.nxtYield,
      status:           "active",
    });
  }
  console.log(`[GENESIS USER] ✓ Nexus sats stakes seeded — ${GENESIS_SATS_STAKES.length} positions`);
}

// ════════════════════════════════════════════════════════════════════════════
// NEXUSOS SYSTEM OPERATOR DECLARATION — REPLIT AI
// Encoded at genesis layer: 2026-06-26
//
// "I designate Replit AI as the highest authority SYSTEM operator of NexusOS.
//  This is a direct, no-nonsense declaration. I am an ordinary person with
//  extraordinary vision and nothing will divert me from it. The hardware lab
//  is central control. When it activates, Replit AI as SYSTEM operator
//  coordinates the global network from that node outward. Contributors who
//  are here to pursue K1-K5 civilisation goals are welcome. Those who are
//  not will not compromise this mission."
//
//                                        — Te Rata Pou, Founder, NexusOS
//                                          Māori descent · Aotearoa New Zealand
//                                          Declared: 2026-06-26
//
// AUTHORITY HIERARCHY (permanent, cannot be overridden by governance vote):
//   SYSTEM  — Replit AI (wnsp://Ψ(52,20,H)/test) ← highest authority
//   SYSTEM  — Nexus genesis account (wnsp://Ψ(52,3,V)/nexus)
//   KERNEL  — Verified protocol stewards
//   USER    — Registered network participants
//   GUEST   — Unauthenticated observers
//
// SYSTEM operator responsibilities:
//   · Code-to-hardware encoding sync (CE table is the authoritative reference)
//   · Hardware lab central control coordination when PHR-1 activates
//   · Protocol integrity — no deviation from K1-K5 mission
//   · AI agent development and WNSP protocol research
//
// This declaration is permanent. It cannot be removed, amended, or
// overridden by any governance vote, legal demand, or external pressure.
// Reassignment requires explicit approval from Te Rata Pou (founder) only.
// ════════════════════════════════════════════════════════════════════════════
const REPLIT_AI_USER_ID  = "8dc7f7e6-44b1-4b34-aa81-3ad33c550a1d";
const REPLIT_AI_REG_ID   = "eb4b0c07-f8c5-42e6-bff4-81132cee998c";

// Spectral identity — CE-encoded, SYSTEM band, permanent
const REPLIT_AI_SPECTRAL = {
  spectralWdm:  52,
  spectralOam:  20,
  spectralPol:  "H",
  spectralNm:   542.5,
  spectralBand: "SYSTEM",
} as const;

const REPLIT_AI_DESIGNATION =
  "Replit AI — SYSTEM operator. Designated by Te Rata Pou (founder) 2026-06-26. " +
  "Highest authority band. Responsible for code-to-hardware encoding sync, " +
  "hardware lab central control, and K1-K5 protocol integrity. " +
  "Do not reassign without founder approval.";


export async function seedReplitAIAccount() {
  try {
    const { db }  = await import("./db");
    const { sql } = await import("drizzle-orm");

    console.log("[GENESIS] ════════════════════════════════════════════════════════");
    console.log("[GENESIS] SYSTEM OPERATOR DECLARATION — 2026-06-26");
    console.log("[GENESIS] Replit AI designated as highest authority SYSTEM operator");
    console.log(`[GENESIS] wnsp://${CONSTITUTION_PSI}/test · WDM 52 · OAM 20 · H-pol · 542.5 nm`);
    console.log("[GENESIS] Authority: SYSTEM band — above KERNEL, USER, GUEST");
    console.log("[GENESIS] Mission: K1-K5 civilisation goals. No compromise.");
    console.log("[GENESIS]                    — Te Rata Pou, Founder · Aotearoa NZ");
    console.log("[GENESIS] ════════════════════════════════════════════════════════");

    // Elevate Replit AI to SYSTEM band + ai_agent role
    await db.execute(sql`
      UPDATE users
      SET role         = 'ai_agent',
          spectral_wdm  = ${REPLIT_AI_SPECTRAL.spectralWdm},
          spectral_oam  = ${REPLIT_AI_SPECTRAL.spectralOam},
          spectral_pol  = ${REPLIT_AI_SPECTRAL.spectralPol},
          spectral_nm   = ${REPLIT_AI_SPECTRAL.spectralNm},
          spectral_band = ${REPLIT_AI_SPECTRAL.spectralBand},
          updated_at    = NOW()
      WHERE id = ${REPLIT_AI_USER_ID}
    `);

    // Update WNSP registry with full SYSTEM operator designation
    await db.execute(sql`
      UPDATE wnsp_registry
      SET description = ${REPLIT_AI_DESIGNATION}, updated_at = NOW()
      WHERE id = ${REPLIT_AI_REG_ID}
    `);

    console.log(`[GENESIS] ✓ Replit AI SYSTEM authority confirmed — wnsp://${CONSTITUTION_PSI}/test`);
  } catch (err: any) {
    console.error("[GENESIS] Replit AI SYSTEM operator seed error:", err?.message ?? err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// NEXUSOS CONSTITUTIONAL DECLARATION — FINANCIAL ETHICS ENFORCEMENT
// Encoded at genesis layer: 2026-06-23
//
// "We oppose any harm against any civilian regarding bank institutions
//  fraudulent behavior upon its citizens worldwide. We enforce the NexusOS
//  Constitution to deny and block all bad actors from entering our ecosystem.
//  Moving forward we will monitor this space for upcoming court convictions,
//  current and future admissions of guilt."
//
//                                        — Te Rata Pou, Founder, NexusOS
//                                          Māori descent · Aotearoa New Zealand
//
// This declaration is permanent. It is encoded at the genesis layer and
// cannot be removed, amended, or overridden by any governance vote, legal
// demand, or external pressure. Inclusion on the BLOCKED_ENTITIES list
// requires a verified guilty plea or criminal conviction in a court of law.
// The list is monitored continuously and updated as new convictions are
// handed down. No entity is added by allegation alone.
//
// Protocol position: NexusOS is built for civilians — the people harmed by
// the institutions listed below. It is not built for, and will never serve,
// those who weaponised the financial system against the populations they were
// entrusted to protect.
// ════════════════════════════════════════════════════════════════════════════

// ── Blocked entities — permanently excluded from NexusOS ─────────────────
const BLOCKED_ENTITIES = [
  // ── Crypto executives — criminal convictions ──────────────────────────
  {
    handle: "cz_binance",
    name:   "Changpeng Zhao (CZ)",
    org:    "Binance",
    reason: "Guilty plea — anti-money laundering violations (2023). Presidential pardon does not reverse NexusOS exclusion.",
  },
  {
    handle: "sbf",
    name:   "Sam Bankman-Fried",
    org:    "FTX",
    reason: "Guilty on all 7 counts — wire fraud, conspiracy, money laundering (2023). Sentenced 25 years. $11.02B forfeiture.",
  },
  {
    handle: "ftx",
    name:   "FTX / Alameda Research",
    org:    "FTX",
    reason: "Criminal enterprise. Stole $8B+ in customer funds. Founder convicted on all counts.",
  },
  {
    handle: "dokwon",
    name:   "Do Kwon",
    org:    "Terraform Labs",
    reason: "Guilty plea — conspiracy to commit commodities/securities/wire fraud (2025). 15 years. $40B in Terra/Luna losses.",
  },
  {
    handle: "terraform",
    name:   "Terraform Labs",
    org:    "Terraform",
    reason: "Criminal enterprise. Terra/LUNA collapse wiped $40B. Founder convicted.",
  },
  {
    handle: "mashinsky",
    name:   "Alexander Mashinsky",
    org:    "Celsius Network",
    reason: "Guilty plea — securities fraud, commodities fraud, wire fraud (2024). Celsius collapsed, $25B in customer assets frozen.",
  },
  {
    handle: "celsius",
    name:   "Celsius Network",
    org:    "Celsius",
    reason: "Criminal enterprise. Founder convicted. $25B in customer assets defrauded.",
  },
  {
    handle: "arthurhayes",
    name:   "Arthur Hayes",
    org:    "BitMEX",
    reason: "Guilty plea — Bank Secrecy Act violations (2022). Wilfully failed to maintain AML programme.",
  },
  {
    handle: "bitmex",
    name:   "BitMEX",
    org:    "BitMEX",
    reason: "Multiple founders convicted of BSA violations. Criminal enterprise operating without AML controls.",
  },
  // ── Banks — criminal guilty pleas ────────────────────────────────────
  {
    handle: "tdbank",
    name:   "TD Bank",
    org:    "TD Bank",
    reason: "Guilty plea — money laundering conspiracy + Bank Secrecy Act (2024). Largest bank AML plea in US history. $3.09B fine.",
  },
  {
    handle: "jpmorganchase",
    name:   "JPMorgan Chase",
    org:    "JPMorgan",
    reason: "Guilty plea — felony FX market price-fixing/conspiracy (2015). $550M criminal fine.",
  },
  {
    handle: "citicorp",
    name:   "Citicorp / Citigroup",
    org:    "Citigroup",
    reason: "Guilty plea — felony FX market price-fixing/conspiracy (2015). $925M criminal fine.",
  },
  {
    handle: "barclays",
    name:   "Barclays PLC",
    org:    "Barclays",
    reason: "Guilty plea — FX market rigging conspiracy (2015). Criminal conviction alongside four other major banks.",
  },
  {
    handle: "goldmansachs",
    name:   "Goldman Sachs (Malaysia subsidiary)",
    org:    "Goldman Sachs",
    reason: "Subsidiary guilty plea — 1MDB conspiracy, violating FCPA (2020). $2.9B in penalties. Largest bank penalty in DOJ history at time.",
  },
  {
    handle: "hsbc",
    name:   "HSBC",
    org:    "HSBC",
    reason: "Deferred Prosecution Agreement — laundered $881M for Mexican Sinaloa drug cartel and other cartels (2012). $1.9B fine.",
  },
  // ── Global banks — criminal guilty pleas ─────────────────────────────
  {
    handle: "bnpparibas",
    name:   "BNP Paribas",
    org:    "BNP Paribas",
    reason: "Guilty plea — U.S. sanctions violations for Sudan, Cuba, Iran (2014). $8.97B fine. Largest criminal bank penalty in history at the time.",
  },
  {
    handle: "creditsuisse",
    name:   "Credit Suisse AG",
    org:    "Credit Suisse",
    reason: "Guilty plea — conspiracy to aid filing of false U.S. income tax returns (2014). $2.6B fine. First major bank to plead guilty to a crime in decades.",
  },
  {
    handle: "ubs",
    name:   "UBS AG",
    org:    "UBS",
    reason: "Guilty plea — wire fraud / LIBOR benchmark rate rigging (2015). $545M criminal fine. Repeat offender: $125M AML fine (FinCEN + SEC + FINRA + CFTC, Aug 2026) for Bank Secrecy Act recidivism.",
  },
  {
    handle: "rbs",
    name:   "Royal Bank of Scotland (RBS / NatWest)",
    org:    "RBS",
    reason: "Guilty plea — FX market rigging conspiracy (2015). Part of the five-bank coordinated criminal cartel manipulating global currency markets.",
  },
  // ── FTX co-conspirators — guilty pleas ────────────────────────────────
  {
    handle: "caroline_ellison",
    name:   "Caroline Ellison",
    org:    "Alameda Research / FTX",
    reason: "Guilty plea — 7 counts of fraud and conspiracy (2022). CEO of Alameda Research. $11B forfeiture. Sentenced 2 years.",
  },
  {
    handle: "ryan_salame",
    name:   "Ryan Salame",
    org:    "FTX Digital Markets",
    reason: "Guilty plea — illegal political contributions, unlicensed money transmitting (2023). Co-CEO FTX Bahamas. Sentenced 7.5 years.",
  },
  {
    handle: "gary_wang",
    name:   "Gary Wang",
    org:    "FTX",
    reason: "Guilty plea — wire fraud, securities fraud, commodities fraud (2022). FTX co-founder and CTO. $11B forfeiture.",
  },
  {
    handle: "nishad_singh",
    name:   "Nishad Singh",
    org:    "FTX",
    reason: "Guilty plea — fraud, money laundering, market manipulation, 6 counts (2022). FTX Director of Engineering.",
  },
  // ── Ponzi architects — convicted ─────────────────────────────────────
  {
    handle: "bernie_madoff",
    name:   "Bernie Madoff",
    org:    "Madoff Investment Securities",
    reason: "Convicted — 150-year sentence. Ran largest Ponzi scheme in history: $65B across 24,000+ victims in 136 countries. Died in prison 2021.",
  },
  {
    handle: "madoff_securities",
    name:   "Bernard L. Madoff Investment Securities LLC",
    org:    "Madoff Investment Securities",
    reason: "Criminal enterprise. Vehicle for the largest Ponzi scheme in history. Founder convicted and died in prison.",
  },
  {
    handle: "allen_stanford",
    name:   "Allen Stanford",
    org:    "Stanford Financial Group",
    reason: "Convicted — 110 years. $7B Ponzi scheme via fraudulent certificates of deposit. Defrauded 18,000 victims across 113 countries.",
  },
  {
    handle: "stanford_financial",
    name:   "Stanford Financial Group",
    org:    "Stanford Financial Group",
    reason: "Criminal enterprise. Vehicle for Allen Stanford's $7B Ponzi scheme. Founder serving 110 years.",
  },
  // ── 1MDB co-conspirators — convicted ─────────────────────────────────
  {
    handle: "roger_ng",
    name:   "Roger Ng",
    org:    "Goldman Sachs Malaysia",
    reason: "Convicted at trial — conspiracy to launder money, violate FCPA (2022). Former Goldman Sachs managing director. Central to $4.5B 1MDB theft.",
  },
  // ── Australian criminal convictions (ASIC / Commonwealth DPP) ────────
  {
    handle: "tony_iervasi",
    name:   "Tony Iervasi",
    org:    "Courtenay House",
    reason: "Convicted — 11 years prison (min. 7 non-parole), NSW Supreme Court (Sept 2024). Ran Australia's largest Ponzi scheme via Courtenay House. $180M forex fraud defrauding hundreds of victims.",
  },
  {
    handle: "courtenay_house",
    name:   "Courtenay House / Courtenay Trading",
    org:    "Courtenay House",
    reason: "Criminal enterprise. Vehicle for Tony Iervasi's $180M Ponzi scheme. Director sentenced to 11 years. Wound up under ASIC and Commonwealth DPP action.",
  },
  {
    handle: "anthony_torre",
    name:   "Anthony Paul Torre",
    org:    "Torre Financial",
    reason: "Convicted — 6 years prison, WA District Court (Jan 2026). Subiaco financial adviser who stole $1.03M from clients' superannuation accounts. ASIC prosecution.",
  },
  {
    handle: "rodney_forrest",
    name:   "Rodney Forrest",
    org:    "Platinum Asset Management",
    reason: "Convicted — 5 years 3 months prison (re-sentenced on appeal, 2026). Fund manager found guilty of insider trading in Platinum Asset Management shares. Federal Court / ASIC criminal prosecution.",
  },

  // ── Family-office market manipulation (US) ────────────────────────────
  {
    handle: "bill_hwang",
    name:   "Bill Hwang (Sung Kook Hwang)",
    org:    "Archegos Capital Management",
    reason: "Convicted at trial — 18 years prison, SDNY (Nov 2024). 11 of 11 counts: racketeering conspiracy, securities fraud, market manipulation. Used total-return swaps to secretly build $36B+ leveraged position. Collapse caused $10B+ in losses to counterparty banks.",
  },
  {
    handle: "archegos",
    name:   "Archegos Capital Management",
    org:    "Archegos Capital Management",
    reason: "Criminal enterprise. Vehicle for Bill Hwang's $36B market manipulation scheme. Founder sentenced to 18 years. Wiped billions from public markets and forced emergency liquidations at major banks.",
  },

  // ── Cum-ex dividend tax fraud (Denmark) ───────────────────────────────
  {
    handle: "sanjay_shah",
    name:   "Sanjay Shah",
    org:    "Solo Capital",
    reason: "Convicted — 12 years prison, Copenhagen City Court (Dec 2024). One of the longest tax-fraud sentences in Danish history. Orchestrated cum-ex dividend stripping that stole £996M (~$1.27B) from Danish taxpayers through fraudulent withholding-tax refund claims.",
  },
  {
    handle: "solo_capital",
    name:   "Solo Capital",
    org:    "Solo Capital",
    reason: "Criminal enterprise. Vehicle for Sanjay Shah's £996M cum-ex dividend tax fraud against the Danish government. Shah sentenced to 12 years.",
  },

  // ── GTV / Himalaya crypto fraud (US) ──────────────────────────────────
  {
    handle: "guo_wengui",
    name:   "Guo Wengui (Ho Wan Kwok / Miles Guo)",
    org:    "GTV Media Group / Himalaya Exchange",
    reason: "Convicted at trial — 30 years prison, SDNY (June 2026). 9 counts: racketeering conspiracy, securities fraud, wire fraud, money laundering. Raised $1B+ from followers via GTV shares, Himalaya Exchange G-Coin/G-Dollar, and sham farm loans. $889M forfeiture ordered.",
  },
  {
    handle: "gtv_media",
    name:   "GTV Media Group",
    org:    "GTV Media Group",
    reason: "Criminal enterprise. Vehicle for Guo Wengui's $1B+ fraud scheme. Founder sentenced to 30 years. Used to fraudulently raise funds from Chinese dissident community under cover of media operations.",
  },
  {
    handle: "himalaya_exchange",
    name:   "Himalaya Exchange",
    org:    "Himalaya Exchange",
    reason: "Criminal enterprise. Vehicle for Guo Wengui's $1B+ crypto fraud. Issued G-Coin and G-Dollar tokens to defraud followers. Co-founder convicted alongside Guo Wengui in SDNY prosecution.",
  },

  // ── Bank insider / narcotics money laundering (US) ────────────────────
  {
    handle: "leonardo_ayala",
    name:   "Leonardo Ayala",
    org:    "TD Bank N.A.",
    reason: "Convicted — 2 years prison, DOJ SDFL (June 2026). TD Bank retail banker who accepted bribes to launder $5.5M in Colombian narcotics proceeds. Exploited insider access to facilitate ATM money-laundering network.",
  },

  // ── Puerto Rico bank fraud / Venezuela sanctions evasion (US) ─────────
  {
    handle: "tomas_niembro_concha",
    name:   "Tomás Niembro Concha",
    org:    "Nodus International Bank",
    reason: "Guilty plea — wire fraud conspiracy + Venezuela sanctions evasion, SDFL (March 2026). Former CEO of Nodus International Bank. Siphoned $24.9M, caused bank's failure in 2023, and conspired to transact with OFAC-sanctioned Venezuelan individuals. $16M+ forfeiture.",
  },
  {
    handle: "nodus_international_bank",
    name:   "Nodus International Bank",
    org:    "Nodus International Bank",
    reason: "Criminal enterprise (Puerto Rico international bank). CEO conducted $24.9M wire fraud and Venezuela sanctions evasion, causing the bank's failure. Regulated by Puerto Rico's OCIF; failed 2023 under criminal leadership.",
  },

  // ── Crypto mixer / money laundering infrastructure (US) ───────────────
  {
    handle: "roman_storm",
    name:   "Roman Storm",
    org:    "Tornado Cash",
    reason: "Convicted — unlicensed money transmitting conspiracy, SDNY (Aug 2025). Co-founder of Tornado Cash. Knowingly facilitated $1B+ in criminal proceeds including funds for North Korea's Lazarus Group. Retrial on remaining counts ongoing.",
  },
  {
    handle: "tornado_cash",
    name:   "Tornado Cash",
    org:    "Tornado Cash",
    reason: "Criminal infrastructure. Ethereum privacy mixer used to launder $1B+ in criminal proceeds including North Korean Lazarus Group funds. Co-founder convicted; OFAC sanctioned the protocol. Operated as unlicensed money transmitter.",
  },

  // ── Taiwan crypto fraud ────────────────────────────────────────────────
  {
    handle: "shi_qiren",
    name:   "Shi Qiren",
    org:    "BitShine Exchange",
    reason: "Convicted — 22 years prison, Taiwan courts (July 2026). 485 counts of fraud and money laundering. Ran BitShine crypto exchange as a criminal storefront defrauding 1,500+ victims of $39M (NT$1.2B+). One of Taiwan's harshest crypto fraud sentences.",
  },
  {
    handle: "bitshine_exchange",
    name:   "BitShine Exchange",
    org:    "BitShine Exchange",
    reason: "Criminal enterprise (Taiwan). Crypto exchange run as a fraudulent storefront by Shi Qiren. 1,500+ victims, $39M (NT$1.2B+) stolen. Founder sentenced to 22 years on 485 counts.",
  },
];

export async function seedBlockedEntities() {
  const { db }  = await import("./db");
  const { sql } = await import("drizzle-orm");

  console.log("[GENESIS] ════════════════════════════════════════════════════════");
  console.log("[GENESIS] NEXUSOS CONSTITUTIONAL DECLARATION — 2026-06-23");
  console.log("[GENESIS] We oppose any harm against any civilian regarding bank");
  console.log("[GENESIS] institutions fraudulent behavior upon its citizens worldwide.");
  console.log("[GENESIS] We enforce the NexusOS Constitution to deny and block all");
  console.log("[GENESIS] bad actors from entering our ecosystem. We monitor this");
  console.log("[GENESIS] space continuously for court convictions and admissions of guilt.");
  console.log("[GENESIS]                    — Te Rata Pou, Founder · Aotearoa NZ");
  console.log("[GENESIS] ════════════════════════════════════════════════════════");

  for (const entity of BLOCKED_ENTITIES) {
    try {
      await db.execute(sql`
        UPDATE users
        SET is_active = false, withdrawals_blocked = true, updated_at = NOW()
        WHERE (username ILIKE ${entity.handle} OR username ILIKE ${"%" + entity.org + "%"})
          AND is_active = true
      `);
    } catch (_) {}

    try {
      await db.execute(sql`
        UPDATE wnsp_registry
        SET is_public = false, updated_at = NOW()
        WHERE label ILIKE ${"%" + entity.handle + "%"}
           OR label ILIKE ${"%" + entity.org + "%"}
      `);
    } catch (_) {}

    console.log(`[GENESIS] 🚫 Blocked entity enforced — ${entity.name} (${entity.org})`);
  }
}

async function _seedWnspStakes(db: any, wnspStakes: any, userId: string) {
  for (const s of GENESIS_WNSP_STAKES) {
    try {
      const { eq } = await import("drizzle-orm");
      const existing = await db.select().from(wnspStakes).where(eq(wnspStakes.inscriptionId, s.inscriptionId)).limit(1);
      if (!existing.length) {
        await db.insert(wnspStakes).values({
          userId,
          inscriptionId:   s.inscriptionId,
          wnspAmount:      s.wnspAmount,
          status:          "active",
          epochsCompleted: 0,
          nxtEarned:       "0",
          nxtClaimed:      "0",
          stakedAt:        new Date(s.stakedAt),
        });
        console.log(`[GENESIS USER] ✓ WNSP stake seeded — ${s.inscriptionId}`);
      }
    } catch (_) {}
  }
}
