export interface CeResult {
  wavelength: number;
  band: string;
  psiChannel: string;
  energy: number;
}

export declare function ceEncode(text: string): CeResult | null;
export declare function charToNm(char: string): number;
export declare function getBand(nm: number): string;
export declare function nmToRgb(nm: number): string;
export declare const CE_TABLE: number[];
export declare const BANDS: Array<{ name: string; min: number; max: number }>;
