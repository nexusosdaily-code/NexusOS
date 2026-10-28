import { sql } from "drizzle-orm";
import { pgTable, varchar, text, bigint, timestamp, uniqueIndex, index, check } from "drizzle-orm/pg-core";
export function defineWaveVaultTables(users: any) {
  const waveVaultFiles = pgTable("wave_vault_files", {
    id: varchar("id", {length:36}).primaryKey(),
    ownerId: varchar("owner_id", {length:36}).notNull().references(()=>users.id),
    ownerWave: text("owner_wave").notNull(),
    uri: text("uri").notNull().unique(),
    name: text("name").notNull(), folder: text("folder").notNull().default(""),
    mediaType: text("media_type").notNull().default("application/octet-stream"),
    size: bigint("size",{mode:"number"}).notNull(),
    sha256: varchar("sha256",{length:64}), generation: text("generation"),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  }, t=>[
    index("wave_vault_owner_idx").on(t.ownerId,t.status),
    check("wave_vault_size_valid",sql`${t.size}>=0 AND ${t.size}<=268435456`),
    check("wave_vault_status_valid",sql`${t.status} IN ('pending','uploading','ready','failed','deleting','deleted')`),
    check("wave_vault_ready_integrity",sql`${t.status}<>'ready' OR (${t.sha256} IS NOT NULL AND ${t.generation} IS NOT NULL)`),
  ]);
  const waveVaultGrants = pgTable("wave_vault_grants", {
    fileId: varchar("file_id",{length:36}).notNull().references(()=>waveVaultFiles.id,{onDelete:"cascade"}),
    userId: varchar("user_id",{length:36}).notNull().references(()=>users.id),
    waveAddress: text("wave_address").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },t=>[uniqueIndex("wave_vault_grant_unique").on(t.fileId,t.userId),index("wave_vault_grantee_idx").on(t.userId)]);
  return {waveVaultFiles,waveVaultGrants};
}
