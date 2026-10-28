import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { Readable,Writable } from "node:stream";
const fixture=vi.hoisted(()=>({private:true,options:null as any,parts:[] as Buffer[]}));
const mocks=vi.hoisted(()=>({metadata:vi.fn(),file:vi.fn(),remove:vi.fn(),read:vi.fn()}));
vi.mock("./objectStorage",()=>({objectStorageClient:{bucket:()=>({
  file:(...args:any[])=>{mocks.file(...args);return{
    name:args[0],
    bucket:{getMetadata:mocks.metadata},
    getMetadata:async()=>[{generation:"9"}],
    createWriteStream:(options:any)=>{fixture.options=options;return new Writable({write(c,_e,done){fixture.parts.push(Buffer.from(c));done();}});},
    createReadStream:mocks.read,delete:mocks.remove,
  };},
})}}));
import { PrivateVaultBlobStore } from "./wave-vault-storage";
const id="10000000-0000-4000-8000-000000000001";
beforeEach(()=>{
  vi.stubEnv("PRIVATE_OBJECT_DIR","/fixture-bucket/private");
  fixture.private=true;fixture.options=null;fixture.parts=[];
  vi.clearAllMocks();
  mocks.metadata.mockImplementation(async()=>[{iamConfiguration:{publicAccessPrevention:fixture.private?"enforced":"inherited"}}]);
  mocks.remove.mockResolvedValue(undefined);mocks.read.mockReturnValue(Readable.from([]));
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe("private App Storage adapter",()=>{
  it("fails closed without a configured private directory",async()=>{
    vi.stubEnv("PRIVATE_OBJECT_DIR","");
    const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);expect(store.readiness).toBe("not-configured");
    expect(mocks.metadata).not.toHaveBeenCalled();
  });
  it("refuses a bucket without enforced public-access prevention",async()=>{
    fixture.private=false;const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);expect(store.readiness).toBe("not-private");
    await expect(store.write("owner",id,Readable.from([Buffer.from("x")]))).rejects.toThrow("protection");
    expect(fixture.options).toBeNull();
  });
  it("shares an in-flight verification and writes unchanged bytes with no overwrite/public ACL",async()=>{
    const store=new PrivateVaultBlobStore();
    expect(await Promise.all([store.ready(),store.ready()])).toEqual([true,true]);
    expect(mocks.metadata).toHaveBeenCalledTimes(1);
    expect(await store.write("owner",id,Readable.from([Buffer.from("original")]))).toBe("9");
    expect(Buffer.concat(fixture.parts).toString()).toBe("original");
    expect(fixture.options.preconditionOpts).toEqual({ifGenerationMatch:0});
    expect(fixture.options.metadata).toEqual({contentType:"application/octet-stream",cacheControl:"private, no-store"});
    expect(mocks.file).toHaveBeenLastCalledWith(`private/wave-vault/owner/${id}`,undefined);
  });
  it("reads and removes only the recorded storage generation",async()=>{
    const store=new PrivateVaultBlobStore();
    store.read("owner",id,"9");await store.remove("owner",id,"9");
    expect(mocks.file).toHaveBeenLastCalledWith(`private/wave-vault/owner/${id}`,{generation:"9"});
    expect(mocks.remove).toHaveBeenCalledWith({ignoreNotFound:true,ifGenerationMatch:"9"});
  });
  function managed(anonymousStatus:number) {
    vi.stubEnv("PRIVATE_OBJECT_DIR","/replit-objstore-00000000-0000-4000-8000-000000000000/.private");
    mocks.metadata.mockRejectedValue({code:403});
    mocks.read.mockImplementation(()=>Readable.from([Buffer.concat(fixture.parts)]));
    const anonymous=vi.fn().mockResolvedValue({status:anonymousStatus});
    vi.stubGlobal("fetch",anonymous);
    return anonymous;
  }
  it("verifies managed storage through exact object bytes, anonymous denial and cleanup",async()=>{
    const anonymous=managed(403);
    const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(true);expect(store.readiness).toBe("ready");
    expect(Buffer.concat(fixture.parts)).toHaveLength(32);
    expect(anonymous).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/storage\.googleapis\.com\/replit-objstore-/),
      expect.objectContaining({method:"HEAD",credentials:"omit",redirect:"error"}));
    expect(mocks.remove).toHaveBeenCalledWith({ignoreNotFound:true,ifGenerationMatch:"9"});
  });
  it("never substitutes the managed verification for arbitrary forbidden buckets",async()=>{
    mocks.metadata.mockRejectedValue({code:403});
    const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);
    expect(fixture.parts).toEqual([]);
  });
  it.each([200,404,500])("refuses unverified anonymous response %s and cleans the probe",async status=>{
    managed(status);const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);
    await expect(store.write("owner",id,Readable.from(["private user bytes"]))).rejects.toThrow("protection");
    expect(Buffer.concat(fixture.parts)).toHaveLength(32);
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
  it("refuses storage when the privacy probe cannot be removed",async()=>{
    managed(403);mocks.remove.mockRejectedValue(new Error("cleanup unavailable"));
    const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);expect(store.readiness).toBe("check-failed");
    await expect(store.write("owner",id,Readable.from(["private user bytes"]))).rejects.toThrow("protection");
    expect(Buffer.concat(fixture.parts)).toHaveLength(32);
  });
  it("refuses corrupted authenticated probe bytes even if anonymous access is denied",async()=>{
    const anonymous=managed(403);
    mocks.read.mockImplementation(()=>Readable.from([Buffer.alloc(32)]));
    const store=new PrivateVaultBlobStore();
    expect(await store.ready()).toBe(false);expect(anonymous).not.toHaveBeenCalled();
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
