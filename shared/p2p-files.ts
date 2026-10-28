export const P2P_MAX_FILE_BYTES = 256 * 1024 * 1024;
export const P2P_CHUNK_BYTES = 16 * 1024;
export const P2P_MAX_ACTIVE = 4;
export type P2PFileInfo = { name: string; size: number; type: string };
export type P2PFileOffer = {
  id: string; file: P2PFileInfo; from: string; broadcast: boolean;
};
export type P2PTransfer = P2PFileOffer & {
  direction: "sending" | "receiving";
  status: "offered" | "connecting" | "transferring" | "complete" | "failed" | "declined" | "cancelled";
  progress: number; peer: string; error?: string; downloadUrl?: string;
};
