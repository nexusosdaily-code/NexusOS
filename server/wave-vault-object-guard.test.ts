import { describe,expect,it } from "vitest";
import { ObjectStorageService,ObjectNotFoundError } from "./objectStorage";
describe("legacy object API never bypasses private wave file grants",()=>{
  it("refuses Wave Vault paths before reading object metadata or serving bytes",async()=>{
    const objects=new ObjectStorageService();
    await expect(objects.getObjectEntityFile("/objects/wave-vault/owner/file")).rejects.toBeInstanceOf(ObjectNotFoundError);
    await expect(objects.trySetObjectEntityAclPolicy("/objects/wave-vault/owner/file",{
      owner:"owner",visibility:"public",aclRules:[],
    })).rejects.toBeInstanceOf(ObjectNotFoundError);
  });
});
