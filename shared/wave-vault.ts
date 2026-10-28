export const WAVE_VAULT_LIMITS = {
  maxFileBytes: 256 * 1024 * 1024,
  maxAccountBytes: 1024 * 1024 * 1024,
  maxFiles: 200,
  maxSharedFiles: 200,
} as const;
export type VaultFile = {
  id: string; ownerId: string; ownerWave: string; uri: string;
  name: string; folder: string; mediaType: string; size: number;
  sha256: string | null;
  status: "pending" | "uploading" | "ready" | "failed" | "deleting";
  createdAt: string; isOwner: boolean;
};
export type VaultGrant = { userId: string; waveAddress: string; createdAt: string };
export type VaultAccount = {
  address: string; storageReady: boolean; limits: typeof WAVE_VAULT_LIMITS;
  usedBytes: string; files: VaultFile[];
};
