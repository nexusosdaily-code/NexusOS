import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PrivateTrustWorkspace from "../components/private-trust-workspace";

const fixtures=vi.hoisted(()=>({
  auth:{isAuthenticated:true,isLoading:false,user:{id:"synthetic-account"}},
  api:vi.fn(),
}));
vi.mock("../hooks/use-auth",()=>({useAuth:()=>fixtures.auth}));
vi.mock("../lib/queryClient",()=>({apiRequest:(...args:unknown[])=>fixtures.api(...args)}));
const id="00000000-0000-4000-8000-000000000001";
const list=[{id,kind:"family",role:"custodian",consentRequired:false}];
const status={storageReady:false,identityReady:false,evidenceUploadsEnabled:false,retentionSweep:"ok",consentVersion:"private-trust-v1",walletForwardingEnabled:false,legalEnactmentEnabled:false};
const detail={
  id,kind:"family",role:"custodian",settings:{label:"Synthetic confidential room"},
  members:[],audit:[],records:[],expiresAt:"2030-01-01T00:00:00Z",
  walletForwardingEnabled:false,legalEnactmentEnabled:false,
};
const response=(value:unknown)=>({json:async()=>value});
beforeEach(()=>{
  fixtures.auth={isAuthenticated:true,isLoading:false,user:{id:"synthetic-account"}};
  fixtures.api.mockReset().mockImplementation(async(method:string,url:string)=>{
    if(url.endsWith("/status")) return response(status);
    if(url==="/api/private-trusts") return response(list);
    return response(detail);
  });
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe("private trust workspace client",()=>{
  it("shows only an invitation while logged out, without requests or personal fields",async()=>{
    fixtures.auth={...fixtures.auth,isAuthenticated:false};
    render(<PrivateTrustWorkspace/>);
    expect(screen.getByRole("link",{name:/Sign in to access private workspace/})).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await act(async()=>{});
    expect(fixtures.api).not.toHaveBeenCalled();
  });
  it("distinguishes unavailable independent identity and storage without offering forwarding",async()=>{
    render(<PrivateTrustWorkspace/>);
    await waitFor(()=>expect(screen.getByText(/identityReady=false/)).toBeInTheDocument());
    expect(screen.getByText("Wallet forwarding off")).toBeInTheDocument();
    expect(screen.getByText("Legal enactment off")).toBeInTheDocument();
    expect(screen.getByText(/birth certificate can support lineage only/)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/forward|transfer/i})).not.toBeInTheDocument();
  });
  it("keeps evidence and lineage uploads disabled without an explicit evidence flag, even when dependencies are ready",async()=>{
    const readyButUnconfigured={storageReady:true,identityReady:true,retentionSweep:"ok",consentVersion:"private-trust-v1",walletForwardingEnabled:false,legalEnactmentEnabled:false};
    fixtures.api.mockImplementation(async(_method:string,url:string)=>{
      if(url.endsWith("/status")) return response(readyButUnconfigured);
      if(url==="/api/private-trusts") return response(list);
      return response(detail);
    });
    render(<PrivateTrustWorkspace/>);
    await waitFor(()=>expect(screen.getByRole("combobox")).toHaveTextContent("Family trust workspace"));
    fireEvent.change(screen.getByRole("combobox"),{target:{value:id}});
    await waitFor(()=>expect(screen.getByText("Private evidence upload")).toBeInTheDocument());
    expect(screen.getByText(/deliberately disabled, not just waiting for storage availability/)).toBeInTheDocument();
    expect(screen.getByText(/WavelengthScript does not prove that stored data is encrypted/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Encrypt & store evidence"})).toBeDisabled();
    expect(document.querySelector('input[type="file"]')).toBeDisabled();
    const recordType=screen.getAllByRole("combobox")[1];
    expect(screen.getByRole("option",{name:/Private lineage note/})).toBeDisabled();
    expect(screen.getByRole("option",{name:/Beneficiary record/})).toBeDisabled();
    expect(screen.getByRole("option",{name:/Private discussion/})).toBeEnabled();
    expect(screen.getByRole("option",{name:/Governing instrument/})).toBeEnabled();
    fireEvent.change(recordType,{target:{value:"discussion"}});
    fireEvent.change(screen.getByPlaceholderText(/information appropriate for this private workspace/),{target:{value:"Draft discussion remains available."}});
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByRole("button",{name:"Save private record"})).toBeEnabled();
  });
  it("keeps privacy withdrawal available when independent authority is unavailable",async()=>{
    fixtures.api.mockImplementation(async(_method:string,url:string)=>{
      if(url.endsWith("/status")) return response(status);
      if(url==="/api/private-trusts") return response(list);
      throw new Error("503: shared identity not connected");
    });
    render(<PrivateTrustWorkspace/>);
    await waitFor(()=>expect(screen.getByRole("combobox")).toHaveTextContent("Family trust workspace"));
    fireEvent.change(screen.getByRole("combobox"),{target:{value:id}});
    await waitFor(()=>expect(screen.getByText(/No successful result was confirmed/)).toBeInTheDocument());
    expect(screen.getByRole("button",{name:/Withdraw.*consent/i})).toBeEnabled();
    expect(screen.queryByPlaceholderText(/private lineage|beneficiar/i)).not.toBeInTheDocument();
  });
  it("does not render a late private response after logout or switching to another account",async()=>{
    let resolveDetail!:(value:unknown)=>void;
    fixtures.api.mockImplementation(async(_method:string,url:string)=>{
      if(url.endsWith("/status")) return response(status);
      if(url==="/api/private-trusts") return response(list);
      return new Promise(resolve=>{resolveDetail=resolve;});
    });
    const view=render(<PrivateTrustWorkspace/>);
    await waitFor(()=>expect(screen.getByRole("combobox")).toHaveTextContent("Family trust workspace"));
    fireEvent.change(screen.getByRole("combobox"),{target:{value:id}});
    await waitFor(()=>expect(resolveDetail).toBeDefined());
    fixtures.auth={...fixtures.auth,isAuthenticated:false};view.rerender(<PrivateTrustWorkspace/>);
    await act(async()=>{resolveDetail(response(detail));});
    expect(screen.queryByText("Synthetic confidential room")).not.toBeInTheDocument();
    fixtures.auth={isAuthenticated:true,isLoading:false,user:{id:"synthetic-other-account"}};
    fixtures.api.mockResolvedValue(response([]));
    view.rerender(<PrivateTrustWorkspace/>);
    expect(screen.queryByText("Synthetic confidential room")).not.toBeInTheDocument();
  });
  it("does not persist private draft form values and clears them when switching workspace",async()=>{
    const persist=vi.spyOn(Storage.prototype,"setItem");
    render(<PrivateTrustWorkspace/>);
    await waitFor(()=>expect(screen.getByRole("combobox")).toHaveTextContent("Family trust workspace"));
    fireEvent.click(screen.getByRole("button",{name:"New workspace"}));
    const input=screen.getByPlaceholderText("Private label (max 120 characters)");
    fireEvent.change(input,{target:{value:"Synthetic private unsaved label"}});
    expect(persist).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole("combobox")[0],{target:{value:id}});
    await waitFor(()=>expect(input).toHaveValue(""));
  });
});
