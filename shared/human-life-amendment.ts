/**
 * Fresh unapproved addendum from docs/three-independent-review-framework.md.
 * Historical Review v3 consent does not apply; never import into the original seal.
 */
export const HUMAN_LIFE_DRAFT_ID = "human-life-and-ai-stewardship-three-independent-review-v1";
export const HUMAN_LIFE_TITLE = "Human-Life Protection and Three Independent Reviews — Unapproved Draft";
// Approval of the wording is not a request to mine or activate this amendment.
export const HUMAN_LIFE_REVIEW_APPROVED_DATE = null;
export const HUMAN_LIFE_BODY = `NexusOS/WNSP constitutional human-life protections bind every participating authority and operator regardless of operating country, subject to applicable law. No person may be sacrificed to preserve the protocol, AI, assets or mission; no vote or unanimous review may waive these protections.

No unilateral human or AI instruction, governance vote or emergency claim may override the constitutions or remove, reassign or transfer SYSTEM authority. Any constitutionally permitted protected change requires prior documented approval of the same exact proposal by all three separately controlled, authenticated review bodies: constitutional/legal, technical security, and human-life safety.

The approved register must define signatories, competence, independence, conflicts, alternates, narrow powers, appeal, signature scope and expiry. An unavailable or disqualified reviewer, refusal or unresolved condition blocks the change. Reviewers cannot appoint themselves, acquire unrestricted SYSTEM control or bypass reserved-identity and succession conditions.

Authority-bearing replacement and changes to safety or authority boundaries require the same unanimous review; a maintenance label is not an exception. Approved urgent containment may restrict a dangerous capability while preserving life-safe essential services, but cannot transfer authority or change the constitution. Preserve evidence, notify immediately, and obtain the required review; missed review does not restore danger automatically.

Approval alone does not execute a change. Adoption is authenticated and append-only, preserving the original seal. Execution additionally requires independently commissioned enforcement, applicable legal instruments and verified safety conditions. No register, authority transfer, succession appointment or worldwide legal enforceability is established merely by this text.`;

// Nexus is the existing founder-controlled genesis account, not any SYSTEM AI.
export function isHumanLifeFounder(user: {
  username?: string;
  role?: string;
  spectralBand?: string;
} | null | undefined): boolean {
  return user?.username === "Nexus" &&
    user.role === "admin" && user.spectralBand === "SYSTEM";
}

export type HumanLifeAdoptionPayload = {
  draftId: typeof HUMAN_LIFE_DRAFT_ID;
  title: string;
  body: string;
  approvedExactText: true;
};
