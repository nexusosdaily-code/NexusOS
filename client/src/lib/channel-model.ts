/**
 * Canonical WNSP channel model constants — single source of truth for the client.
 * Mirrors server/seo-meta.ts so both layers always agree.
 *
 * Model: 256 WDM × 50 OAM × 2 polarisations × 2 propagation directions = 51,200
 * N_Dir=2 (+k̂ forward / −k̂ backward) adds a second orthogonal Hilbert sub-space.
 * First disclosed: 2026-07-02.
 */

export const PSI_CHANNELS = "51,200";
export const PSI_CHANNEL_COUNT = 51_200;
export const PSI_CHANNEL_FORMULA = "256 WDM × 50 OAM × 2 polarisations × 2 propagation directions";
export const PSI_CHANNEL_FORMULA_SHORT = "256 WDM × 50 OAM × 2 POL × 2 DIR";
export const PSI_CHANNEL_MATH = "256 × 50 × 2 × 2 = 51,200";

export const CHANNEL_COUNT = PSI_CHANNELS;
export const CHANNEL_COUNT_NUM = PSI_CHANNEL_COUNT;
export const CHANNEL_FORMULA = PSI_CHANNEL_FORMULA;
export const CHANNEL_FORMULA_SHORT = "256 × 50 × 2 × 2";
export const CHANNEL_DIMENSIONS = "N_λ × N_OAM × N_Pol × N_Dir";

export const CHANNEL_META_DESC =
  `${CHANNEL_COUNT} orthogonal Ψ channels (${CHANNEL_FORMULA}) — orthogonal by quantum mechanics, not software policy.`;
