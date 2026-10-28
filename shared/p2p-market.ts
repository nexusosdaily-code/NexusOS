export type P2PListing = {
  id: string; sellerId: string; sellerWave: string; title: string; description: string;
  category: "file" | "service" | "goods" | "advertising";
  priceSats: string; isPublic: boolean; status: string; createdAt: string;
};
export type P2POrder = {
  id: string; listingId: string; buyerId: string; sellerId: string;
  buyerWave: string; sellerWave: string; title: string; amountSats: string;
  status: "funded" | "delivered" | "disputed" | "released" | "refunded";
  note: string; createdAt: string; updatedAt: string;
};
export type P2PLive = {
  id: string; title: string; broadcasterId: string; isPublic: boolean; status: string;
};
export type P2PAccount = {
  address: string; paymentsEnabled: boolean; availableSats: string; heldSats: string; pendingSats: string;
  listings: P2PListing[]; orders: P2POrder[];
};
