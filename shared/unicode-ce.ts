/**
 * Versioned software encoding, not a claim about physical optical channels.
 * ASCII retains its CE128 wavelength bin; the OAM field stores a byte's high bit.
 * Never substitute this profile for existing account/ledger/name mappings.
 */
import { CE_TABLE } from "./wnsp-model";

export const UNICODE_CE_PROFILE = "ce-utf8-coordinate-v1";
export const UNICODE_CE_MAX_BYTES = 65_536;
export interface UnicodeCoordinate { wdm: number; oam: number; pol: "H" }
export interface UnicodeCEPayload {
  profile: typeof UNICODE_CE_PROFILE;
  frames: UnicodeCoordinate[];
}

function validateCoordinate(value: unknown): asserts value is UnicodeCoordinate {
  if (!value || typeof value !== "object") throw new Error("Invalid Unicode coordinate");
  const frame = value as UnicodeCoordinate;
  if (!Number.isInteger(frame.wdm) || frame.wdm < 0 || frame.wdm > 127 ||
      !Number.isInteger(frame.oam) || frame.oam < 0 || frame.oam > 1 ||
      frame.pol !== "H" || Object.keys(frame).sort().join(",") !== "oam,pol,wdm") {
    throw new Error("Invalid Unicode coordinate: require wdm 0–127, oam 0–1, pol H");
  }
}

export function unicodeCoordinateWavelength(frame: UnicodeCoordinate): number {
  validateCoordinate(frame);
  return CE_TABLE[frame.wdm];
}

export function encodeUnicodeCE(text: string): UnicodeCEPayload {
  if (typeof text !== "string") throw new Error("Unicode input must be text");
  if (text.length > UNICODE_CE_MAX_BYTES) throw new Error("Unicode input exceeds the byte limit");
  // TextEncoder would silently replace lone UTF-16 surrogates. Refuse data loss.
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) throw new Error("Unpaired Unicode surrogate");
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) throw new Error("Unpaired Unicode surrogate");
  }
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > UNICODE_CE_MAX_BYTES) throw new Error("Unicode input exceeds the byte limit");
  return {
    profile: UNICODE_CE_PROFILE,
    frames: Array.from(bytes, byte => ({ wdm: byte & 127, oam: byte >>> 7, pol: "H" })),
  };
}

export function decodeUnicodeCE(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("Unicode payload must be an object");
  const payload = value as UnicodeCEPayload;
  if (payload.profile !== UNICODE_CE_PROFILE) throw new Error("Unsupported or missing Unicode CE profile");
  if (!Array.isArray(payload.frames) || payload.frames.length > UNICODE_CE_MAX_BYTES) {
    throw new Error("Invalid or oversized Unicode frame sequence");
  }
  const bytes = new Uint8Array(payload.frames.length);
  for (let i = 0; i < bytes.length; i++) {
    const frame = payload.frames[i];
    validateCoordinate(frame);
    bytes[i] = frame.wdm | (frame.oam << 7);
  }
  try {
    // Preserve a leading U+FEFF; it is data, not a BOM to discard.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error("Coordinate sequence is not valid UTF-8");
  }
}
