/**
 * Versioned software mappings, not claims of measured optical capacity.
 * Legacy profiles deliberately retain their numerical outputs. Never migrate
 * stored account addresses by substituting an encoder from another profile.
 */
export const H_PLANCK = 6.62607015e-34;
export const C_LIGHT = 299_792_458;
export const NM_MIN = 380;
export const NM_MAX = 780;
export const WDM_CHANNELS = 256;
export const OAM_MODES = 50;
export const POLARISATIONS = 2;
export const N_DIR = 2;
export const TOTAL_CHANNELS = WDM_CHANNELS * OAM_MODES * POLARISATIONS * N_DIR;
export const CE_ENTRIES = 128;
export const CE_STEP_NM = (NM_MAX - NM_MIN) / CE_ENTRIES;
export const CE_TABLE: readonly number[] = Object.freeze(
  Array.from({ length: CE_ENTRIES }, (_, i) => NM_MIN + i * CE_STEP_NM),
);

export const MAPPING_PROFILES = Object.freeze({
  account: "account-sha256-endpoints-v1",
  name: "vm-printable-ascii-average-v1",
  ledger: "ce128-character-table-v1",
  opticalBins: "proposed-uniform-wdm256-v1",
});

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Wavelength/index must be finite");
  return value;
}

/** Existing account grid includes both endpoints: 400/255 nm, NOT 400/256. */
export function accountWavelength(wdm: number): number {
  if (!Number.isInteger(wdm) || wdm < 0 || wdm >= WDM_CHANNELS) {
    throw new RangeError("WDM index must be an integer from 0 to 255");
  }
  return NM_MIN + wdm * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
}

/** Legacy ledger's character-grid index; only 128 bins cover the visible band. */
export function ledgerWdm(nm: number): number {
  return Math.min(WDM_CHANNELS - 1, Math.max(0, Math.floor((finite(nm) - NM_MIN) / CE_STEP_NM)));
}

/** Proposed optical-bin grid; not interchangeable with the account grid. */
export function opticalBinWdm(nm: number): number {
  const value = finite(nm);
  if (value < NM_MIN || value > NM_MAX) throw new RangeError("Wavelength must be 380–780 nm");
  return Math.min(WDM_CHANNELS - 1, Math.floor((value - NM_MIN) / ((NM_MAX - NM_MIN) / WDM_CHANNELS)));
}

/** Legacy VM labels retain the 495 nm boundary and LOGIC/INTERFACE aliases. */
export function vmBand(nm: number): string {
  finite(nm);
  if (nm < 450) return "SYSTEM";
  if (nm < 495) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "LOGIC";
  if (nm < 590) return "INTERFACE";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}

/** This is a lossy name fingerprint, not reversible Unicode transport. */
export function encodeVMName(name: string) {
  const codes = name.toUpperCase().split("").map(c => c.charCodeAt(0)).filter(c => c >= 32 && c <= 126);
  if (!codes.length) codes.push(77); // Preserve the server's legacy fallback.
  const sum = codes.reduce((a, b) => a + b, 0);
  const nm = Number((NM_MIN + ((sum / codes.length - 32) / 94) * (NM_MAX - NM_MIN)).toFixed(2));
  const wdm = Math.floor((nm - NM_MIN) / 4) + 1;
  const oam = sum % OAM_MODES;
  const pol = codes.length % 2 === 0 ? "H" : "V";
  return { nm, wdm, oam, pol, psi: `Ψ(${wdm},${oam},${pol})`, band: vmBand(nm) };
}

export const HARDWARE_STATUS =
  "Hardware fundraising and promotions paused pending engineering review. Working software models; reported electrical tests on three Coiltek bifilar coils. Integrated SNIC, optical relay, quantum memory and ZERO-G performance have not been demonstrated by those tests.";
