// CE Encoder — WNSP Character Encoding v1.0
// AGPL-3.0 — NexusOS Free Infrastructure
// ES Module export

const H = 6.626e-34;
const C = 2.998e8;

export const CE_TABLE = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

export const BANDS = [
  { name: "SYSTEM",  min: 380, max: 450 },
  { name: "AUTH",    min: 450, max: 490 },
  { name: "STREAM",  min: 490, max: 520 },
  { name: "CORE",    min: 520, max: 565 },
  { name: "UI",      min: 565, max: 590 },
  { name: "EVENT",   min: 590, max: 625 },
  { name: "STORAGE", min: 625, max: 780 },
];

export const charToNm = c => CE_TABLE[c.charCodeAt(0) % 128];
export const getBand  = nm => (BANDS.find(b => nm >= b.min && nm < b.max) || BANDS.at(-1)).name;
export const getPsi   = (nm, text) => {
  const wdm = Math.floor((nm - 380) / 4) + 1;
  const oam = [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
  const pol = text.length % 2 === 0 ? "H" : "V";
  return `Ψ(${wdm},${oam},${pol})`;
};

export function ceEncode(text) {
  if (!text || !text.length) return null;
  const nms      = [...text].map(charToNm);
  const wavelength = +(nms.reduce((s, n) => s + n, 0) / nms.length).toFixed(2);
  const f        = C / (wavelength * 1e-9);
  const energy   = H * f;
  return { wavelength, band: getBand(wavelength), psiChannel: getPsi(wavelength, text), energy };
}

export function nmToRgb(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}
