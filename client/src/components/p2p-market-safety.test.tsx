import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const fixture=vi.hoisted(()=>({enabled:false,buy:vi.fn(),tip:vi.fn(),action:vi.fn()}));
vi.mock("@/hooks/use-auth",()=>({useAuth:()=>({isAuthenticated:true,user:{id:"a",username:"Fixture"}})}));
vi.mock("@/components/p2p-file-exchange",()=>({default:()=> <div data-testid="retained-files">File exchange</div>}));
vi.mock("@/hooks/use-p2p-market",()=>({
  p2pRequest:vi.fn(),
  useP2PMarket:()=>({
    paymentsPolicy:{isSuccess:true,isFetching:false,data:{enabled:fixture.enabled,reason:"New P2P funding is paused pending the legacy wallet concurrency audit."}},
    listings:{data:{listings:[{id:"listing",sellerId:"seller",sellerWave:"wnsp://seller",title:"Fixture music",
      description:"Manual delivery",category:"file",priceSats:"100",isPublic:true,status:"active",createdAt:new Date().toISOString()}]}},
    account:{isSuccess:true,isFetching:false,data:{address:"wnsp://a",paymentsEnabled:fixture.enabled,availableSats:"1000",heldSats:"0",pendingSats:"100",listings:[],
      orders:[{id:"order",listingId:"listing",buyerId:"b",sellerId:"a",buyerWave:"wnsp://b",sellerWave:"wnsp://a",
        title:"Pending sale",amountSats:"100",status:"funded",note:"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]}},
    live:{data:{streams:[]}}, refresh:vi.fn(),
    buy:{mutateAsync:fixture.buy,isPending:false},sendTip:{mutateAsync:fixture.tip,isPending:false},
    orderAction:{mutateAsync:fixture.action,isPending:false},
    createListing:{mutateAsync:vi.fn(),isPending:false},deleteListing:{mutateAsync:vi.fn(),isPending:false},
    createStream:{mutateAsync:vi.fn(),isPending:false},
  }),
}));
import P2PPage from "@/pages/p2p";
afterEach(cleanup);
beforeEach(()=>{fixture.enabled=false;vi.clearAllMocks();});
describe("P2P payment safety interface",()=>{
  it("shows the audit hold and prevents new money actions while keeping files mounted",()=>{
    render(<P2PPage/>);
    expect(screen.getByTestId("p2p-payments-audit-hold").textContent).toContain("audit");
    expect((screen.getByTestId("listing-buy") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("tip-open") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("listing-buy"));
    expect(fixture.buy).not.toHaveBeenCalled();
    expect(screen.getByTestId("retained-files")).toBeTruthy();
  });
  it("does not freeze an existing seller's refund when new funding is paused",()=>{
    render(<P2PPage/>);
    fireEvent.click(screen.getByRole("button",{name:/orders/i}));
    fireEvent.click(screen.getByTestId("order-refund"));
    expect((screen.getByTestId("confirm-order-refund") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId("retained-files")).toBeTruthy();
  });
  it("routes broadcast creation through the canonical private audience flow",()=>{
    render(<P2PPage/>);
    expect(screen.getByTestId("p2p-private-broadcast").getAttribute("href")).toBe("/streaming?create=private");
    expect(screen.getByTestId("p2p-start-broadcast").getAttribute("href")).toBe("/streaming?create=private");
  });
  it("allows a synthetic enabled policy to open a deliberate purchase confirmation",()=>{
    fixture.enabled=true; render(<P2PPage/>);
    expect((screen.getByTestId("listing-buy") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId("listing-buy"));
    expect(screen.getByTestId("purchase-confirm")).toBeTruthy();
    expect(fixture.buy).not.toHaveBeenCalled();
  });
});
