import { randomUUID } from "node:crypto";
import { sessionLifecycle } from "./session-lifecycle";
import { VaultError } from "./wave-vault-streams";
import type { WaveVault } from "./wave-vault-service";
type Session={id:string;userId:string;expiresAt:Date};
type Transfer={user:string;session:string;file:string;upload:boolean;controller:AbortController;expires:number};
/** One pair of session listeners, not one listener per large file request. */
export class VaultTransfers {
  private active=new Map<string,Transfer>();
  private checking=false;
  private timer:ReturnType<typeof setInterval>;
  private onSession=(id:string)=>{for(const t of this.active.values())if(t.session===id)t.controller.abort();};
  private onUser=(id:string)=>{for(const t of this.active.values())if(t.user===id)t.controller.abort();};
  private onRevoke=(file:string,user?:string)=>{for(const t of this.active.values())if(t.file===file&&(!user||t.user===user))t.controller.abort();};
  constructor(private vault:WaveVault,private load:(ids:string[])=>Promise<Session[]>) {
    sessionLifecycle.on("session",this.onSession);sessionLifecycle.on("user",this.onUser);
    vault.events.on("revoke",this.onRevoke);
    this.timer=setInterval(()=>void this.check(),5000);this.timer.unref?.();
  }
  start(user:string,session:string,file:string,upload:boolean) {
    if(this.active.size>=16||[...this.active.values()].filter(t=>t.user===user).length>=2)
      throw new VaultError(429,"At most two private file transfers per account can run at once");
    const id=randomUUID(),controller=new AbortController();
    this.active.set(id,{user,session,file,upload,controller,expires:Date.now()+10*60_000});
    const timeout=setTimeout(()=>controller.abort(),10*60_000);timeout.unref?.();
    return {signal:controller.signal,abort:()=>controller.abort(),finish:()=>{clearTimeout(timeout);this.active.delete(id);}};
  }
  async check() {
    if(this.checking||!this.active.size)return;
    this.checking=true;
    try{
      const entries=[...this.active.values()];
      let timeout:ReturnType<typeof setTimeout>|undefined;
      try {
        const sessions=await Promise.race([this.load([...new Set(entries.map(t=>t.session))]),
          new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("Session verification timeout")),3000);})]);
        await Promise.all(entries.map(async t=>{
          const alive=sessions.some(s=>s.id===t.session&&s.userId===t.user&&new Date(s.expiresAt).getTime()>Date.now());
          let deadline:ReturnType<typeof setTimeout>|undefined;
          try{
            const allowed=alive&&await Promise.race([this.vault.allowed(t.user,t.file,t.upload),
              new Promise<boolean>(resolve=>{deadline=setTimeout(()=>resolve(false),3000);})]);
            if(!allowed||t.expires<=Date.now())t.controller.abort();
          }finally{if(deadline)clearTimeout(deadline);}
        }));
      }finally{if(timeout)clearTimeout(timeout);}
    }catch{for(const t of this.active.values())t.controller.abort();}
    finally{this.checking=false;}
  }
  dispose() {
    clearInterval(this.timer);
    sessionLifecycle.off("session",this.onSession);sessionLifecycle.off("user",this.onUser);
    this.vault.events.off("revoke",this.onRevoke);
    for(const t of this.active.values())t.controller.abort();
    this.active.clear();
  }
}
