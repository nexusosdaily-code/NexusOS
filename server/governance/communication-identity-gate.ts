import type { PoolClient } from "pg";
import { ElectionError, type Actor } from "./community-election-service";

/** Integration contract for the independent identity/role platform.
 * Only server bootstrap may install this; there is intentionally no admin HTTP override.
 * The provider must read current independent verification AND separate reviewer-role approval
 * under this transaction, reject revoked/expired evidence, and never return private evidence.
 * Account control, a lattice key, public marketing or legacy manual membership is insufficient.
 */
export type CommunicationIdentityAuthorizer = (input: {
  client: PoolClient; actor: Actor; personId: string; role: string; at: Date;
}) => Promise<void>;
let authorizer: CommunicationIdentityAuthorizer | null = null;
export function installCommunicationIdentityAuthorizer(provider: CommunicationIdentityAuthorizer) {
  if (authorizer) throw new Error("Communication identity authorizer is already installed");
  authorizer = provider;
}
export function communicationIdentityReady() { return authorizer !== null; }
export async function requireCommunicationIdentity(input: Parameters<CommunicationIdentityAuthorizer>[0]) {
  if (!authorizer) throw new ElectionError(424,
    "Commission actions are locked until independent human verification and separate reviewer-role authorisation are connected");
  await authorizer(input);
}
