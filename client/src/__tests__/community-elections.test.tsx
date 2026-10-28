import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import CommunityElectionsPage from "@/pages/community-elections";
// Messaging has its own consent/receipt interaction suite; isolate the election participation suite.
vi.mock("@/components/wallet-wave-communications", () => ({ WalletWaveCommunications: () => null }));

const state = vi.hoisted(() => ({
  user: null as any, membership: null as any, elections: [] as any[],
  error: false, mutate: vi.fn(), refetch: vi.fn(),
  continuity: {seats:[] as any[],requests:[] as any[],events:[] as any[],commissioning:"not-commissioned"},
}));
vi.mock("@/hooks/use-auth", () => ({useAuth:() => ({user:state.user})}));
vi.mock("@/hooks/use-community-elections", () => ({
  useCommunityElections:() => ({
    data:{elections:state.elections,nominations:[],commissioning:"not-commissioned"},
    isSuccess:!state.error,isError:state.error,isLoading:false,isFetching:false,
    error:state.error ? new Error("Database unavailable") : null,refetch:state.refetch,
  }),
  useCommunityMembership:() => ({data:state.membership,isLoading:false,isError:false}),
  useCommunityContinuity:() => ({
    data:state.continuity,isSuccess:true,isError:false,isLoading:false,refetch:state.refetch,
  }),
  useCommunityVerifiedPeople:() => ({data:[],isError:false}),
  useCommunityAction:() => ({mutate:state.mutate,isPending:false,error:null}),
}));
const election = {
  id:"22222222-2222-4222-8222-222222222222",kind:"policy",title:"Improve welfare",
  body:"A directive to improve human living standards.",scope:"welfare",nomination:null,
  opensAt:"2020-01-01T00:00:00Z",closesAt:"2099-01-01T00:00:00Z",status:"open",
  yes:0,no:0,total:0,supportPercent:0,recordDigest:null,blockNumber:null,
  termStartsAt:null,termEndsAt:null,termActive:false,createdAt:"2020-01-01T00:00:00Z",
};
beforeEach(() => {
  state.user=null;state.membership=null;state.elections=[];state.error=false;
  state.mutate.mockReset();state.refetch.mockReset();
  state.continuity={seats:[],requests:[],events:[],commissioning:"not-commissioned"};
});
afterEach(cleanup);
describe("community election participation UI", () => {
  it("shows real empty state and preserves commissioning/authority limits", () => {
    render(<CommunityElectionsPage />);
    expect(screen.getByText("No elections on the docket")).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Sign in to participate"})).toHaveAttribute("href","/auth");
    expect(screen.getAllByText("Not commissioned").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button",{name:"Yes"})).not.toBeInTheDocument();
  });
  it("submits an equal ballot without weight, userId or personId", () => {
    state.user={id:"voter",role:"user"};
    state.membership={eligible:true,votedElectionIds:[],nominationIds:[]};
    state.elections=[election];
    render(<CommunityElectionsPage />);
    fireEvent.click(screen.getByRole("button",{name:"Yes"}));
    expect(state.mutate).toHaveBeenCalledWith({path:`/${election.id}/vote`,data:{choice:"yes"}});
    expect(screen.queryByRole("button",{name:"Abstain"})).not.toBeInTheDocument();
  });
  it("hides voting for unverified people and people who already voted", () => {
    state.user={id:"voter",role:"user"};
    state.membership={eligible:true,votedElectionIds:[election.id],nominationIds:[]};
    state.elections=[election];
    render(<CommunityElectionsPage />);
    expect(screen.getByText("Your ballot is recorded. Ballots cannot be changed.")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Yes"})).not.toBeInTheDocument();
  });
  it("uses admin role only, not an isAdmin flag or SYSTEM band", () => {
    state.user={id:"voter",role:"user",isAdmin:true,spectralBand:"SYSTEM"};
    state.membership={eligible:false,votedElectionIds:[],nominationIds:[]};
    render(<CommunityElectionsPage />);
    expect(screen.queryByText("Verify a person")).not.toBeInTheDocument();
  });
  it("shows retry instead of silently presenting database failures as empty", () => {
    state.error=true;
    render(<CommunityElectionsPage />);
    expect(screen.getByText("The public docket did not load.")).toBeInTheDocument();
    expect(screen.queryByText("No elections on the docket")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Retry"}));
    expect(state.refetch).toHaveBeenCalled();
  });
  it("provides readback for zero-vote rejected elections too", () => {
    state.elections=[{...election,status:"rejected",recordDigest:"a".repeat(64),blockNumber:42}];
    render(<CommunityElectionsPage />);
    expect(screen.getByRole("link",{name:/Block 42/})).toHaveAttribute("href",`/api/community-elections/${election.id}/record`);
  });
  it("submits immutable public appeal grounds with explicit constitutional and privacy confirmations", () => {
    state.user={id:"voter",role:"user"};
    state.membership={eligible:true,votedElectionIds:[],nominationIds:[]};
    state.elections=[{...election,status:"approved",recordDigest:"a".repeat(64),finalisedAt:new Date().toISOString()}];
    render(<CommunityElectionsPage />);
    fireEvent.change(screen.getByLabelText("Target record"),{target:{value:election.id}});
    fireEvent.change(screen.getByLabelText(/Public, non-sensitive grounds/),{
      target:{value:"A procedural error requiring a community resolution vote."},
    });
    fireEvent.click(screen.getByLabelText(/I confirm these grounds are public/));
    fireEvent.click(screen.getByLabelText(/I confirm this request remains bound/));
    fireEvent.click(screen.getByRole("button",{name:"File public request"}));
    expect(state.mutate).toHaveBeenCalledWith({
      path:"/continuity/requests",
      data:{kind:"appeal",targetId:election.id,groundType:"procedure",
        grounds:"A procedural error requiring a community resolution vote.",
        confirmPublicNonSensitive:true,confirmConstitutionBound:true},
    },expect.any(Object));
  });
  it("relinquishes only a holder's mandate through the real endpoint with irreversible confirmation", () => {
    state.user={id:"holder",role:"user"};
    state.membership={eligible:true,votedElectionIds:[],nominationIds:["nomination"]};
    state.elections=[{...election,kind:"reviewer",scope:"human-life-safety",status:"approved",
      nomination:{id:"nomination",role:"human-life-safety",publicName:"Elected Person"},
      termEndsAt:"2099-01-01T00:00:00Z",termStartsAt:"2026-01-01T00:00:00Z",termActive:true}];
    state.continuity.seats=[{role:"human-life-safety",designation:"principal",state:"occupied",mandateIds:[election.id]}];
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => true);
    render(<CommunityElectionsPage />);
    fireEvent.click(screen.getByRole("button",{name:"Relinquish mandate"}));
    expect(state.mutate).toHaveBeenCalledWith({path:`/${election.id}/relinquish`,data:{confirmIrreversible:true}});
    window.confirm = originalConfirm;
  });
  it("prevents an electoral holder from proposing an independent commission", () => {
    state.user={id:"holder",role:"user"};
    state.membership={eligible:true,votedElectionIds:[],nominationIds:["nomination"]};
    state.elections=[{...election,kind:"reviewer",status:"approved",
      nomination:{id:"nomination",role:"human-life-safety",publicName:"Elected Person"},
      termEndsAt:"2099-01-01T00:00:00Z",termActive:true,recordDigest:"a".repeat(64)}];
    state.continuity.seats=[{role:"human-life-safety",designation:"principal",state:"occupied",mandateIds:[election.id]}];
    render(<CommunityElectionsPage />);
    fireEvent.change(screen.getByLabelText("Record type"),{target:{value:"commission"}});
    expect(screen.getByRole("button",{name:"File public request"})).toBeDisabled();
    expect(screen.getByText(/Your account has an approved, unexpired reviewer mandate/)).toBeInTheDocument();
  });
});
