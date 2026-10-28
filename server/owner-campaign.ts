import type { OwnerRegister } from "../shared/founding-owners";

export const OWNER_CAMPAIGN_SLOT_IDS = [28, 29, 30] as const;
export const OWNER_CAMPAIGN_SLOTS = OWNER_CAMPAIGN_SLOT_IDS.map((id, group) => ({
  id,
  label: `NexusOS owner register — seats ${group * 7 + 1}–${group * 7 + 7}`,
  emoji: "👥",
  telegram: "Owner announcements are pending completion of the founder-authorized seat 1 transfer.",
  nostr: "Owner announcements are pending completion of the founder-authorized seat 1 transfer.",
  tags: ["NexusOS", "NXT", "ProtocolOwners"],
}));

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildOwnerCampaignSlots(register: OwnerRegister) {
  if (!register.replacementComplete)
    throw new Error("Owner announcements await the completed seat 1 transfer");
  return OWNER_CAMPAIGN_SLOTS.map((slot, group) => {
    const entries = register.owners.slice(group * 7, group * 7 + 7);
    const names = entries.map((owner) => `Seat ${owner.rank}: ${owner.username}`).join("\n");
    const disclaimer = "This is the project's 21-seat protocol owner register. Original allocation figures date from 17 June 2026; seat 1 reflects the later recorded gift. Allocation records are not live wallet balances, and NXT holdings alone do not establish company equity.";
    const body = `NexusOS records 21 protocol owner seats. These are the current registered entries for seats ${group * 7 + 1}–${group * 7 + 7}:\n\n${names}\n\n${disclaimer}\n\nRegister updated: ${register.disclosureDate}\nhttps://wnsp.io/shareholders`;
    return {
      ...slot,
      telegram: `👥 <b>${slot.label}</b>\n\n${escapeHtml(body)}\n\n#NexusOS #NXT #ProtocolOwners`,
      nostr: `👥 ${slot.label}\n\n${body}\n\n#NexusOS #NXT #ProtocolOwners`,
    };
  });
}