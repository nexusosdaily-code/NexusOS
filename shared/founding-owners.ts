export interface FoundingOwner {
  rank: number;
  username: string;
  band: string;
  nxt: number;
  joined: string;
  wallet: string;
}

export interface OwnerRegister {
  owners: FoundingOwner[];
  disclosureDate: string;
  replacementComplete: boolean;
  transferId: string | null;
}

// Historical allocation disclosure, not current wallet balances or legal equity.
export const INITIAL_OWNER_REGISTER: FoundingOwner[] = [
  { rank: 1, username: "Dsmart", band: "SYSTEM", nxt: 500_000_977.73, joined: "2026-06-11", wallet: "NXT-0FVT-J1JE-G833-6JAKS" },
  { rank: 2, username: "Over3496", band: "KERNEL", nxt: 500_000_000, joined: "2026-04-26", wallet: "NXT-3AVX-1ZSN-YHWW-WI5C1" },
  { rank: 3, username: "jefffay95", band: "GUEST", nxt: 500_000_000, joined: "2026-04-29", wallet: "NXT-VSE3-KASG-PGZX-11CO0" },
  { rank: 4, username: "test", band: "USER", nxt: 500_000_000, joined: "2026-05-06", wallet: "NXT-P0JG-WQ00-6PYX-W6VDT" },
  { rank: 5, username: "Reti", band: "USER", nxt: 500_000_000, joined: "2026-06-16", wallet: "NXT-DJ4M-UU14-G4KI-SAU8J" },
  { rank: 6, username: "Leps", band: "KERNEL", nxt: 500_000_000, joined: "2026-05-11", wallet: "NXT-PMPD-U9FC-XPQT-X8M8Q" },
  { rank: 7, username: "b546***", band: "GUEST", nxt: 500_000_000, joined: "2026-06-08", wallet: "NXT-75PK-SQBK-52AX-GQIUF" },
  { rank: 8, username: "probandonexus", band: "SYSTEM", nxt: 500_000_000, joined: "2026-06-08", wallet: "NXT-K30M-X18V-DH6N-WXU1R" },
  { rank: 9, username: "Shusha", band: "SYSTEM", nxt: 500_000_000, joined: "2026-04-14", wallet: "NXT-8F85-AS05-VZMH-SMEEJ" },
  { rank: 10, username: "Dr.Malito", band: "USER", nxt: 500_000_000, joined: "2026-06-11", wallet: "NXT-ED3M-3WI8-QXLH-JDXMI" },
  { rank: 11, username: "mudiga", band: "SYSTEM", nxt: 500_000_000, joined: "2026-06-11", wallet: "NXT-162I-L4LL-W9AY-G51MU" },
  { rank: 12, username: "shazmataz", band: "GUEST", nxt: 500_000_000, joined: "2026-06-14", wallet: "NXT-4560-LRGU-Q65R-12U1S" },
  { rank: 13, username: "Oogee", band: "SYSTEM", nxt: 500_000_000, joined: "2026-06-15", wallet: "NXT-45Z0-CDBS-UR2I-0RMC3" },
  { rank: 14, username: "trixie", band: "KERNEL", nxt: 500_000_000, joined: "2026-06-15", wallet: "NXT-WKKU-Q8BX-36ND-1U129" },
  { rank: 15, username: "emzy", band: "USER", nxt: 499_999_995.87, joined: "2026-06-14", wallet: "NXT-LJ7H-W06I-EOIH-6FOAO" },
  { rank: 16, username: "nikita", band: "USER", nxt: 499_999_899, joined: "2026-06-11", wallet: "NXT-YPTM-NVWJ-QOXS-EXP3W" },
  { rank: 17, username: "nathaniel***", band: "USER", nxt: 497_939_500, joined: "2026-06-11", wallet: "NXT-VXER-CQ1M-OAO3-AVKT5" },
  { rank: 18, username: "derekdaman", band: "KERNEL", nxt: 400_000_000, joined: "2026-06-15", wallet: "NXT-GCEB-L49R-3IB1-BMELP" },
  { rank: 19, username: "awa", band: "KERNEL", nxt: 399_884_598, joined: "2026-06-12", wallet: "NXT-DXU3-2FZV-5180-Q3F42" },
  { rank: 20, username: "Nexus", band: "SYSTEM", nxt: 229_933_504, joined: "2026-06-07", wallet: "NXT-NEXS-OS1K-7F3A-OMEGA" },
  { rank: 21, username: "UncJuddy", band: "USER", nxt: 199_989_869.9, joined: "2026-06-03", wallet: "NXT-VNHY-979Z-91CS-6AI76" },
];