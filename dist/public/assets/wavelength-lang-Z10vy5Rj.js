import{a as w,j as e}from"./vendor-react-Dbq4-fkY.js";import{u as ae}from"./use-page-meta-BCnBVlPQ.js";import{L as D}from"./vendor-router-BNSZfxZx.js";import{f as re,C as R,I as oe,Z as K,D as O,ap as U,b as V,d as X,R as le,B as ie,y as ce}from"./vendor-icons-nVqalrtW.js";function A(p){return p<450?"#8b00ff":p<495?"#2563eb":p<520?"#06b6d4":p<565?"#16a34a":p<590?"#ca8a04":p<625?"#ea580c":"#dc2626"}function P(p){return p<450?"SYSTEM":p<495?"AUTH":p<520?"STREAM":p<565?"LOGIC":p<590?"INTERFACE":p<625?"EVENT":"STORAGE"}function b(p){const v=p.toUpperCase().split("").map(m=>m.charCodeAt(0)).filter(m=>m>=32&&m<=126);v.length||v.push(77);const y=v.reduce((m,a)=>m+a,0)/v.length,i=parseFloat((380+(y-32)/94*400).toFixed(2)),c=parseFloat((299792458/(i*1e-9)/1e12).toFixed(2)),N=Math.floor((i-380)/4)+1,n=v.reduce((m,a)=>m+a,0)%100,k=v.length%2===0?"H":"V";return{nm:i,thz:c,psi:`Ψ(${N},${n},${k})`,band:P(i)}}function de(p,v){if(!p.trim())return"";const y=p.split(`
`),i=["∿ ── WavelengthScript v2.0 · AGPL-3.0 · NexusOS ────────────────",`∿ Source: ${v.toUpperCase()} → WLS transpilation`,`∿ Generated: ${new Date().toISOString()}`,"∿ Every symbol has a physical wavelength address in light.",""];for(const N of y){const n=N.trim();if(!n){i.push("");continue}if(n.startsWith("#")||n.startsWith("//")){i.push(`∿ ${n.replace(/^[#/]+\s*/,"")}`);continue}const k=n.match(/^(?:def|function|fn)\s+(\w+)\s*\(([^)]*)\)/);if(k){const[,l,x]=k,h=b(l),f=x.split(",").map(g=>g.trim()).filter(Boolean).map(g=>{const C=b(g.replace(/[^a-zA-Z]/g,"")||"x");return`channel ${g.trim()} : @${C.nm}nm`}).join(", ");i.push(`∿ λ=${h.nm}nm ${h.psi} [${h.band}]`),i.push(`field ${l}(${f}) → @${h.nm}nm {`);continue}const m=n.match(/^(?:class|struct)\s+(\w+)/);if(m){const l=b(m[1]);i.push(`∿ spectral type → λ=${l.nm}nm ${l.psi} [${l.band}]`),i.push(`channel ${m[1]} : SpectralType {`);continue}const a=n.match(/^(?:let|const|var)?\s*(\w+)\s*[:=]+\s*(.+)/);if(a){const[,l,x]=a,h=b(l);i.push(`  channel ${l} := ${x.replace(/;$/,"")}  ∿ λ=${h.nm}nm ${h.psi}`);continue}if(n.startsWith("return")){i.push(`  collapse ${n.slice(6).trim()}  ∿ spectral output`);continue}if(n.startsWith("import")||n.startsWith("use")||n.startsWith("require")){const l=n.match(/["']([^"']+)["']/),x=l?l[1]:"module",h=b(x.replace(/[^a-zA-Z]/g,"")||"mod");i.push(`absorb(${h.nm}nm)  ∿ import ${x} at ${h.psi}`);continue}if(n.match(/^(?:print|console\.log|println!|System\.out)/)){i.push(`  observe(${n.replace(/^[^(]+/,"")})  ∿ stream band 520nm`);continue}if(n.startsWith("if ")){const l=n.replace(/^if\s+/,"").replace(/:$/,"").replace(/^\(/,"").replace(/\)\s*\{?$/,"");i.push(`  resonate when ${l} {`);continue}if(n==="else"||n.startsWith("else {")||n.startsWith("else:")){i.push("  } resonate when else {");continue}if(n.startsWith("for ")||n.startsWith("while ")){const l=n.replace(/^(for|while)\s+/,"").replace(/:$/,"").replace(/\{$/,"");i.push(`  propagate over ${l} {`);continue}if(n==="}"||n.match(/^end(\s|$)/)){i.push("}");continue}const o=b(n.split(" ")[0]||"op");i.push(`  ${n}  ∿ @${o.nm}nm [${o.band}]`)}i.push(""),i.push("∿ ── Spectral manifest ──────────────────────────────────────────");const c=Array.from(new Set(p.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g)??[])).slice(0,8);for(const N of c){const n=b(N);i.push(`∿ ${N.padEnd(20)} → λ=${n.nm}nm  ${n.psi}  [${n.band}]`)}return i.join(`
`)}function pe(p){if(!p.trim())return{assembly:"",hex:"",manifest:[],instrCount:0};const v=[],y=new Map;let i=0;function c(a,o,l,x,h,f){v.push({off:i,op:a,mnem:o,args:l,nm:h,ch:f,cmt:x}),a!==0&&(i+=8)}c(0,".WNSP","v1.0","NexusOS WNSP Bytecode · AGPL-3.0"),c(0,".ARCH","WDM256·OAM50·POL2·DIR2","51,200 orthogonal Ψ channels"),c(0,".MODEL","Λ=hf/c² SPECTRAL","Einstein first-principle execution"),c(0,"","",""),i=0;for(const a of p.split(`
`)){const o=a.trim();if(!o){c(0,"","","");continue}if(o.startsWith("//")||o.startsWith(";")||o.startsWith("#")){c(0,";",o.replace(/^[/;#]+\s*/,""),"");continue}const l=o.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);if(l){const r=parseFloat(l[1]);y.set(l[2],{nm:r,psi:l[2],band:P(r)}),c(3,"EMIT",`λ=${r}nm  ${l[2]}`,`emit on ${P(r)} band`,r,l[2]);continue}const x=o.match(/tune\((\d+\.?\d*)nm\)/);if(x){const r=parseFloat(x[1]);c(1,"TUNE",`λ=${r}nm`,`receiver → ${P(r)} band`,r);continue}const h=o.match(/^agent\s+(\w+)/);if(h){const r=b(h[1]);y.set(h[1],r),c(10,"AGENT",`"${h[1]}"  ${r.psi}`,`AI agent λ=${r.nm}nm · ${r.band}`,r.nm,r.psi);continue}const f=o.match(/^fn\s+(\w+)/);if(f){const r=b(f[1]);y.set(f[1],r),c(7,"LABEL",`${f[1]}  ${r.psi}`,`fn → λ=${r.nm}nm`,r.nm,r.psi);continue}const g=o.match(/node\.register\("([^"]+)"/);if(g){const r=b(g[1]);y.set(g[1],r),c(10,"AGENT",`"${g[1]}"  ${r.psi}  PUBLIC`,"spectral network node",r.nm,r.psi);continue}const C=o.match(/oscillate\(([^)]+)\)/);if(C){c(6,"OCS",C[1].trim(),"non-blocking wave loop");continue}const W=o.match(/broadcast\(([^)]+)\)/);if(W){const r=b(W[1].replace(/[^a-zA-Z]/g,"")||"data");c(5,"BROAD",W[1].trim(),`broadcast λ=${r.nm}nm`,r.nm);continue}const E=o.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);if(E){const r=parseFloat(E[1]);y.set(E[2],{nm:r,psi:b(E[2]).psi,band:P(r)}),c(2,"PUSH",`@${r}nm  "${E[2]}"`,`bind at λ=${r}nm · ${P(r)}`,r);continue}const L=o.match(/^\s*emit\s+(.+)/);if(L){const r=b(L[1].replace(/[^a-zA-Z]/g,"")||"out");c(3,"EMIT",L[1].trim(),`output at λ=${r.nm}nm`,r.nm);continue}if(o.startsWith("?λ ")){c(8,"JMPZ",o.slice(3).trim(),"photon path branch");continue}if(o==="}"||o.match(/^end\b/)){c(254,"RET","","scope end — wave collapses");continue}const _=o.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op",T=b(_);c(11,"EXEC",`@${T.nm}nm`,o.slice(0,50),T.nm)}c(255,"HALT","","wavefunction terminated");const N=[...y.entries()].map(([a,o])=>({symbol:a,...o})),n=v.filter(a=>a.op!==0&&a.mnem!==""&&a.mnem!==";"),k=["; ── WNSP Bytecode Assembly v1.0 ────────────────────────────────────",`; NexusOS · AGPL-3.0 · ${new Date().toISOString().slice(0,19)}Z`,"; Hilbert-space: 51,200 orthogonal channels · E=hf · Λ=hf/c²","; ────────────────────────────────────────────────────────────────────","",...v.map(a=>{if(!a.mnem)return"";if(a.mnem===";")return`  ; ${a.args}`;if(a.mnem.startsWith("."))return`${a.mnem.padEnd(10)} ${a.args}  ; ${a.cmt}`;const o=`0x${a.off.toString(16).padStart(6,"0")}`,l=a.op.toString(16).padStart(2,"0"),x=a.cmt?`  ; ${a.cmt}`:"";return`  ${o}  ${l}  ${a.mnem.padEnd(8)} ${a.args}${x}`}),"",`; ── Symbol Table (${N.length} symbols) ─────────────────────────────────────`,...N.map(a=>`; ${a.symbol.padEnd(22)} λ=${String(a.nm).padEnd(8)} ${a.psi}  [${a.band}]`)],m=["; WNSP Binary Hex Dump","; ─────────────────────────────────────────────────────────────","Offset    Bytes                              Annotation","────────  ─────────────────────────────────  ──────────────────",'0x000000  57 4E 53 50 01 00 00 00            ; magic "WNSP" v1.0',`0x000008  ${n.length.toString(16).padStart(8,"0").match(/.{2}/g).join(" ")}            ; instr count = ${n.length}`,...n.slice(0,12).map((a,o)=>{const l=`0x${(16+o*8).toString(16).padStart(6,"0")}`,x=a.op.toString(16).padStart(2,"0"),h=a.nm?Math.round(a.nm*10):0,f=Math.floor(h/256).toString(16).padStart(2,"0"),g=(h%256).toString(16).padStart(2,"0");return`${l}  ${x} ${f} ${g} 00 00 00 00 00 ; ${a.mnem.padEnd(6)} ${a.args.slice(0,24)}`}),n.length>12?`...  (${n.length-12} more instructions)`:""];return{assembly:k.join(`
`),hex:m.filter(Boolean).join(`
`),manifest:N,instrCount:n.length}}const me=`// WavelengthScript v1.0 · AGPL-3.0
// Governance Vote — on-chain protocol parameter change

tune(468nm)  // KERNEL band — governance requires KERNEL or higher

@emit(469.4nm, Ψ(23,44,V))
fn submitProposal(param, newValue, proposerKey) {
  @468nm let proposal := GovernanceRegistry.create({
    @550nm param    := param,
    @550nm value    := newValue,
    @540nm creator  := proposerKey,
  })
  emit proposal.id
}

@emit(471.0nm, Ψ(24,0,V))
fn castVote(proposalId, voteYes, voterKey) {
  @468nm let voter    := TrustLayer.verify(voterKey)
  @540nm let weight   := SpectralAuth.bandWeight(voter.band)
  @648nm let record   := VoteStore.append(proposalId, voteYes, weight)
  ?λ record.thresholdMet():
    broadcast(record.executeNow())
  }
  emit record
}

@emit(472.1nm, Ψ(24,5,H))
fn executeProposal(proposalId) {
  @648nm let proposal := VoteStore.get(proposalId)
  ?λ proposal.passed():
    @540nm let applied := LIVE_FEES.update(proposal.param, proposal.value)
    broadcast(applied)  // → notify all KERNEL+ nodes
  }
  emit proposal.status
}

node.register("GovernanceKernel", @469.4nm)
`,he=`// WavelengthScript v1.0 · AGPL-3.0
// P2P Spectral File Transfer — no relay, no DNS

tune(501nm)  // STREAM band — live data flow

@emit(501.7nm, Ψ(31,17,V))
agent StreamParser {
  @501nm pipeline := ChunkEngine.new(size=512)
  @648nm store    := VectorStore.new()
  @468nm auth     := TrustLayer.connect()

  oscillate(Ψ(31,17,V), 0Hz) {
    ?λ auth.verify():
      @501nm let chunk   := tune(Ψ(31,17,V))
      @648nm let written := store.append(chunk.data, chunk.seq)
      ?λ chunk.isFinal():
        emit store.assemble()
      }
      broadcast(written.ack)
    }
  }
}

@emit(503.2nm, Ψ(32,2,H))
fn sendFile(filePath, recipientPsi, senderKey) {
  @648nm let chunks   := ChunkEngine.split(filePath)
  @540nm let identity := TrustLayer.sign(senderKey)
  oscillate(chunks, 0Hz) {
    @501nm let frame := StreamParser.encode(identity, chunk)
    broadcast(frame)  // → emits to recipient Ψ channel
  }
  emit { status: "COMPLETE", chunks: chunks.length }
}

node.register("StreamParser", @501.7nm)
`,xe=`// WavelengthScript v1.0 · AGPL-3.0
// Spectral Wallet — physics-priced NXT transfers

tune(468nm)  // AUTH band — wallet requires identity verification

@emit(468.3nm, Ψ(23,83,V))
agent TrustLayer {
  @648nm ledger  := SpectralDB.connect("transactions")
  @468nm session := SessionStore.new()

  oscillate(Ψ(23,83,V), 0Hz) {
    ?λ session.active():
      @550nm let req := tune(Ψ(23,83,V))
      ?λ req.type == "transfer":
        @468nm let fee := PhysicsEngine.calcFee(req.sender.nm, req.amount)
        ?λ req.sender.balance >= (req.amount + fee):
          @648nm let tx := ledger.write({
            @540nm from   := req.sender.psi,
            @540nm to     := req.recipient.psi,
            @550nm amount := req.amount,
            @540nm fee    := fee,
            @540nm lambda := PhysicsEngine.lambda(req.sender.nm),
          })
          broadcast(tx)
        }
      }
    }
  }
}

@emit(469.9nm, Ψ(23,99,V))
fn transferNXT(fromKey, toKey, amount) {
  @468nm let sender    := TrustLayer.verify(fromKey)
  @468nm let recipient := TrustLayer.verify(toKey)
  @540nm let result    := TrustLayer.send({ sender, recipient, amount })
  emit result.txId
}

node.register("TrustLayer", @468.3nm)
`,J=`// WavelengthScript v1.0 · AGPL-3.0
// Spectral agent — runs on Ψ channels, not a CPU

tune(540nm)  // lock receiver to LOGIC band

@emit(541.2nm, Ψ(41,12,V))
agent ReasoningCore {
  @468nm identity := TrustLayer.connect()
  @648nm memory   := VectorStore.new()
  @501nm stream   := StreamParser.new()

  oscillate(Ψ(41,12,V), 0Hz) {
    ?λ identity.verify():
      @540nm let prompt := tune(Ψ(41,12,V))
      @540nm let result := model.infer(prompt)
      emit result
    }
  }
}

node.register("ReasoningCore", @541.2nm)
`,Z=[{nm:"380–449nm",band:"SYSTEM",color:"#8b00ff",types:["kernel","root","syscall","interrupt"],desc:"Root authority — kernel operations, hardware control, boot sequences"},{nm:"450–494nm",band:"AUTH",color:"#2563eb",types:["identity","token","session","trust"],desc:"Identity & trust — authentication, wallet addresses, permissions"},{nm:"495–519nm",band:"STREAM",color:"#06b6d4",types:["channel","stream","broadcast","live"],desc:"Live data flow — video, audio, real-time messaging"},{nm:"520–564nm",band:"LOGIC",color:"#16a34a",types:["compute","fn","agent","model"],desc:"Computation — functions, AI agents, logic gates, inference"},{nm:"565–589nm",band:"INTERFACE",color:"#ca8a04",types:["display","ui","render","component"],desc:"User interface — rendering, display, interaction"},{nm:"590–624nm",band:"EVENT",color:"#ea580c",types:["signal","trigger","webhook","pulse"],desc:"Events & signals — triggers, interrupts, pub-sub"},{nm:"625–780nm",band:"STORAGE",color:"#dc2626",types:["record","store","db","persist"],desc:"Data at rest — spectral database, ordinals, archives"}],ue=[{concept:"Declare a variable",wls:"@540nm let mass := Λ(h=6.626e-34, f=555e12)",note:"λ=540nm → LOGIC band"},{concept:"Define a function",wls:`@emit(523nm, Ψ(37,8,H))
fn encode(input: @520nm str) → @540nm float`,note:"emit declares spectral address"},{concept:"Import a module",wls:"tune(490nm)  // imports identity module",note:"tune() sets receiver to that band"},{concept:"Call an AI agent",wls:'agent.invoke(@540nm "reasoning", prompt)',note:"agents live on LOGIC band 520–564nm"},{concept:"Send a message",wls:"broadcast(Ψ(37,8,H), payload)  // stream band",note:"broadcast() emits on Ψ channel"},{concept:"Async / concurrent",wls:"oscillate(Ψ(100,0,H), 7.83Hz) { ... }",note:"oscillate() = non-blocking wave loop"},{concept:"Type annotation",wls:"@625nm record Post { title: @560nm str }",note:"type prefix = band address"},{concept:"Register AI node",wls:'node.register("GPT-Nexus", @540nm)',note:"node name → CE→SE → band → discoverable"}],ge=[{agent:"ReasoningCore",nm:541.2,psi:"Ψ(41,12,V)",role:"General inference & chain-of-thought"},{agent:"MemoryStore",nm:648.4,psi:"Ψ(68,44,H)",role:"Long-term memory, vector retrieval"},{agent:"StreamParser",nm:501.7,psi:"Ψ(31,17,V)",role:"Real-time token streaming"},{agent:"EmbeddingMapper",nm:538.9,psi:"Ψ(40,89,V)",role:"Token → wavelength embedding"},{agent:"TrustLayer",nm:468.3,psi:"Ψ(23,83,V)",role:"Auth & identity verification"},{agent:"OutputEmitter",nm:572.1,psi:"Ψ(49,21,V)",role:"Response generation & broadcast"}],be=[{lang:"Python",snippet:`import nexusos

# Register your AI agent on the wave
agent = nexusos.Agent(name="MyAI", band="LOGIC")
agent.tune(540)  # lock to 540nm

@agent.on_signal("Ψ(41,12,V)")
def handle(prompt):
    result = my_model.infer(prompt)
    agent.emit(result)

agent.start()`,desc:"Python SDK — install with `pip install nexusos-sdk`"},{lang:"JavaScript",snippet:`import { NexusOS } from 'nexusos-sdk';

const agent = new NexusOS.Agent({
  name: 'MyAI',
  wavelength: 540,  // LOGIC band
  channel: 'Ψ(41,12,V)',
});

agent.on('signal', async (payload) => {
  const result = await myModel.run(payload);
  agent.emit(result);
});

await agent.register();`,desc:"JS/TS SDK — install with `npm install nexusos-sdk`"},{lang:"Rust",snippet:`use nexusos::Agent;

let mut agent = Agent::builder()
    .name("MyAI")
    .wavelength_nm(540.0)
    .channel("Ψ(41,12,V)")
    .build()?;

agent.on_signal(|payload| {
    let result = my_model.infer(&payload);
    agent.emit(result)
});

agent.register().await?;`,desc:"Rust SDK — add `nexusos-sdk` to Cargo.toml"}],M=`∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Token Transfer: NXT physics-priced transfer
∿ Fee = hf_sender / hf_reference  (E=hf energy difference)

absorb(468nm)  ∿ AUTH band — identity required

field transfer(
  channel sender    : @468nm,
  channel recipient : @468nm,
  channel amount    : @550nm
) → @648nm {
  channel λ_sender := physics.wavelength(sender.psi)  ∿ sender spectral address
  channel fee      := physics.fee(λ_sender, amount)   ∿ Λ=hf/c² derived fee
  channel balance  := observe(sender.psi)              ∿ read current Fock state

  resonate when balance >= (amount + fee) {
    emit sender.psi → absorb (amount + fee)             ∿ debit sender
    observe recipient.psi ← amount                      ∿ credit recipient
    observe spectral_ledger.record({
      channel from   := sender.psi,
      channel to     := recipient.psi,
      channel amount := amount,
      channel fee    := fee,
      channel lambda := λ_sender
    })
    collapse { txId: spectral_ledger.lastId, fee, lambda: λ_sender }
  }

  collapse { error: "insufficient_energy", required: (amount + fee) }
}
`,G=`∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Smart Contract: Physics-Signed Escrow
∿ Self-executing agreement governed by wave mechanics

absorb(468nm)  ∿ AUTH band — contract requires KERNEL authority

field escrow(
  channel depositor  : @468nm,
  channel beneficiary: @468nm,
  channel condition  : @540nm,
  channel amount     : @550nm
) → @648nm {
  channel escrow_ch := Ψ(depositor.wdm, depositor.oam, V)  ∿ derive escrow channel
  observe escrow_ch ← amount                                 ∿ lock funds in channel

  propagate over oracle.watch(condition) {
    resonate when condition.met {
      collapse beneficiary ← amount   ∿ release to beneficiary
    }
    resonate when condition.expired {
      collapse depositor ← amount     ∿ refund depositor
    }
  }
}

entangle Ψ(depositor) → Ψ(beneficiary)  ∿ atomic spectral binding
`,F=`∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Governance Vote: on-chain protocol parameter change
∿ Voting weight = spectral authority band (shorter λ = higher weight)

absorb(468nm)  ∿ AUTH band — governance requires KERNEL or higher

field submitProposal(
  channel param     : @540nm,
  channel newValue  : @540nm,
  channel proposer  : @468nm
) → @540nm {
  channel proposal := GovernanceRegistry.create({
    channel param   := param,
    channel value   := newValue,
    channel creator := proposer.psi
  })
  collapse proposal.id
}

field castVote(
  channel proposalId: @540nm,
  channel voteYes   : @540nm,
  channel voter     : @468nm
) → @648nm {
  channel weight := SpectralAuth.bandWeight(voter.band)  ∿ λ → authority weight
  channel record := VoteStore.append(proposalId, voteYes, weight)
  resonate when record.thresholdMet {
    observe record.executeNow()  ∿ live protocol update
  }
  collapse record
}

entangle Ψ(voter) → Ψ(proposal)  ∿ vote binding
`,q=`∿ WavelengthScript v2.0 · AGPL-3.0 · NexusOS
∿ Phase 1 — Spectral Wallet: observe any Ψ channel balance
∿ Balance = current Fock occupation number of that channel

absorb(468nm)  ∿ AUTH band — wallet requires identity

field walletBalance(channel owner: @468nm) → @550nm {
  channel psi     := owner.psi          ∿ e.g. Ψ(52,3,V)
  channel state   := observe(psi)       ∿ measure Fock state |n⟩
  channel lambda  := physics.wavelength(psi)
  channel energy  := physics.energy(lambda)  ∿ E = hf = hc/λ
  collapse {
    channel balance := state.nxt,
    channel psi     := psi,
    channel lambda  := lambda,
    channel energy  := energy,
    channel band    := physics.band(lambda)
  }
}

field walletHistory(channel owner: @468nm) → @648nm {
  channel txs := spectral_ledger.query(owner.psi)
  propagate over txs {
    observe tx.render()  ∿ stream each record to output
  }
  collapse txs.count
}
`,ve=`import math

def lambda_energy(freq_hz, mass):
    h = 6.626e-34
    c = 2.998e8
    # Lambda Boson equation
    energy = h * freq_hz
    lambda_mass = energy / (c ** 2)
    return lambda_mass

class SpectralNode:
    def __init__(self, name, freq):
        self.name = name
        self.freq = freq

    def broadcast(self, payload):
        print(f"Emitting {payload} at {self.freq}Hz")
`;function je(){ae({title:"WavelengthScript — Physics-Native Programming Language",description:"WavelengthScript is a programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Step-debug in the WNSP VM.",canonical:"https://wnsp.io/wavelength-lang",ogTitle:"WavelengthScript — The Language the Universe Runs On",ogDescription:"Physics-native language: spectral addresses, photon packets, E=hf fees. Compiles to WNSP bytecode. Browser-native WNSP VM. CE→SE pipeline. AGPL-3.0.",twitterTitle:"WavelengthScript v1.0",twitterDescription:"The language the universe runs on. Agents at spectral addresses. Photon packets. E=hf computation costs. WNSP bytecode."});const[p,v]=w.useState("python"),[y,i]=w.useState(ve),[c,N]=w.useState(""),[n,k]=w.useState("spec"),[m,a]=w.useState("transfer"),[o,l]=w.useState([{id:"sender",label:"sender",psi:"Ψ(23,83,V)",nm:468,n:0},{id:"receiver",label:"receiver",psi:"Ψ(24,10,H)",nm:471,n:0},{id:"fee",label:"fee",psi:"Ψ(41,12,V)",nm:541,n:0},{id:"ledger",label:"ledger",psi:"Ψ(68,44,H)",nm:648,n:0}]),[x,h]=w.useState([]);function f(t,s){l(d=>d.map(u=>{if(u.id!==t)return u;const I=u.n,B=s==="create"?u.n+1:s==="annihilate"?Math.max(0,u.n-1):u.n,te=s==="create"?"â†":s==="annihilate"?"â":"n̂",se=s==="create"?"emit":s==="annihilate"?"absorb":"observe";return h(ne=>[...ne.slice(-11),{op:se,sym:te,ch:u.label,from:I,to:B}]),{...u,n:B}}))}const[g,C]=w.useState(""),[W,E]=w.useState(!1),[L,_]=w.useState(J),[T,r]=w.useState("asm"),[j,z]=w.useState(null),[Y,H]=w.useState(!1),S=g?b(g):null;function Q(){N(de(y,p))}function ee(){navigator.clipboard.writeText(c),E(!0),setTimeout(()=>E(!1),1500)}const $=(t,s)=>e.jsx("button",{onClick:()=>k(t),className:`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${n===t?"text-white bg-white/10 border border-white/20":"text-white/30 hover:text-white/60"}`,children:s});return e.jsxs("div",{className:"min-h-screen bg-black text-white flex flex-col",style:{fontFamily:"monospace"},children:[e.jsxs("div",{className:"border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(D,{href:"/nexus-command",children:e.jsx("button",{className:"text-white/30 hover:text-white/60 transition-colors","aria-label":"Back to Nexus Command",children:e.jsx(re,{size:15})})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(R,{size:13,className:"text-violet-400"}),e.jsx("span",{className:"text-sm font-bold tracking-wider text-violet-400",children:"WAVELENGTH SCRIPT"}),e.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"})]}),e.jsx("span",{className:"text-white/20 text-[10px]",children:"WLS v1.0 · Code in light · Build AI on the wave · AGPL-3.0"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-violet-400/20 text-violet-400/50",children:"OPEN SPEC"}),e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50",children:"FREE FOREVER"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-6 space-y-6",children:[e.jsxs("div",{className:"border border-violet-400/20 rounded-xl p-6",style:{background:"linear-gradient(180deg, rgba(139,0,255,0.06) 0%, rgba(0,0,0,0) 100%)"},children:[e.jsx("div",{className:"h-1.5 rounded-full w-full mb-5",style:{background:"linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)"}}),e.jsxs("div",{className:"grid grid-cols-2 gap-8",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-violet-400/50 text-[9px] uppercase tracking-widest mb-2",children:"WavelengthScript"}),e.jsx("h1",{className:"text-2xl font-bold text-white mb-3 leading-tight",children:"The first language where every symbol has a physical address in light."}),e.jsx("p",{className:"text-white/40 text-sm leading-relaxed mb-4",children:"Variables live at wavelengths. Functions emit on Ψ channels. AI agents tune to frequencies. Code doesn't run on a CPU — it propagates as a wave. Write in Python, JS, or Rust and let the transpiler map your logic onto the electromagnetic spectrum."}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["Transpiles from Python/JS/Rust","AI agents on Ψ channels","AGPL-3.0 open spec","CE→SE type system"].map(t=>e.jsx("span",{className:"text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/30",children:t},t))})]}),e.jsxs("div",{className:"border border-white/5 rounded-xl p-4",style:{background:"rgba(139,0,255,0.04)"},children:[e.jsx("div",{className:"text-white/20 text-[9px] mb-3 uppercase tracking-widest",children:"Quick encode — any word → its wavelength address"}),e.jsx("input",{className:"w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/15 focus:border-violet-400/30",placeholder:"Type anything: 'function', 'AI', 'reasoning', 'model'…",value:g,onChange:t=>C(t.target.value),"data-testid":"input-live-encode"}),S?e.jsxs("div",{className:"mt-3 space-y-2",children:[e.jsx("div",{className:"h-2 rounded-full",style:{background:`linear-gradient(to right, ${A(S.nm-30)}, ${A(S.nm)}, ${A(S.nm+30)})`}}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:[{l:"λ address",v:`${S.nm}nm`,c:A(S.nm)},{l:"Frequency",v:`${S.thz} THz`,c:"#a78bfa"},{l:"Ψ channel",v:S.psi,c:"#06b6d4"},{l:"Band",v:S.band,c:A(S.nm)}].map(({l:t,v:s,c:d})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-2",children:[e.jsx("div",{className:"text-[8px] text-white/25",children:t}),e.jsx("div",{className:"text-[11px] font-bold",style:{color:d},children:s})]},t))}),e.jsxs("div",{className:"text-[9px] text-white/20",children:["In WLS: ",e.jsxs("span",{className:"text-violet-400",children:["@",S.nm,"nm"]}),' is the type prefix for "',g,'" — every instance lives at this wavelength.']})]}):e.jsx("div",{className:"mt-4 text-center text-white/15 text-[10px] py-4",children:"CE→SE encodes any word into a physical wavelength of light. That wavelength becomes the address."})]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[$("spec","Language Spec"),$("grammar","WLS v2.0 Grammar"),$("transpiler","Transpiler"),$("compiler","Compiler → Bytecode"),$("ai","AI Integration"),$("sdk","SDK — Other Languages")]}),n==="spec"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(oe,{size:11})," Type System — Spectral Bands"]}),e.jsxs("p",{className:"text-white/25 text-[11px] leading-relaxed mb-4",children:["In WavelengthScript, every type has a band. Instead of ",e.jsx("code",{className:"text-violet-300",children:"string"})," or ",e.jsx("code",{className:"text-violet-300",children:"int"}),", you declare types by their spectral band. The band determines where data lives, who can access it, and what operations are valid on it."]}),e.jsx("div",{className:"space-y-2",children:Z.map(t=>e.jsxs("div",{className:"flex items-start gap-4 border border-white/5 rounded-lg px-4 py-3",style:{background:t.color+"06"},children:[e.jsxs("div",{className:"w-16 flex-shrink-0",children:[e.jsx("div",{className:"text-[9px] font-bold",style:{color:t.color},children:t.band}),e.jsx("div",{className:"text-[8px] text-white/20",children:t.nm})]}),e.jsxs("div",{className:"flex-1",children:[e.jsx("div",{className:"flex flex-wrap gap-1.5 mb-1",children:t.types.map(s=>e.jsxs("code",{className:"text-[9px] px-1.5 py-0.5 rounded border",style:{borderColor:t.color+"30",color:t.color,background:t.color+"0a"},children:["@",Math.floor(380+Z.indexOf(t)*57),"nm ",s]},s))}),e.jsx("div",{className:"text-[9px] text-white/25",children:t.desc})]})]},t.band))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(R,{size:11})," Syntax Reference"]}),e.jsx("div",{className:"space-y-3",children:ue.map((t,s)=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-4",style:{background:"rgba(255,255,255,0.015)"},children:[e.jsx("div",{className:"text-[10px] text-white/50 mb-2",children:t.concept}),e.jsx("pre",{className:"text-[10px] text-violet-300 font-mono leading-relaxed mb-2 overflow-x-auto",children:t.wls}),e.jsx("div",{className:"text-[9px] text-white/25",children:t.note})]},s))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(K,{size:11})," Core Operators"]}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3",children:[{op:"@{nm}nm",desc:"Type prefix — declares wavelength address of a value or function"},{op:"emit(val)",desc:"Output a value — broadcasts it on the current Ψ channel"},{op:"tune(nm)",desc:"Receive — sets the listener to a specific wavelength band"},{op:"broadcast(Ψ, v)",desc:"Send to a specific Ψ channel — like emit but targeted"},{op:"oscillate(Ψ,f)",desc:"Non-blocking loop at frequency f Hz — the WLS for() equivalent"},{op:"?λ cond:",desc:"Conditional — the WLS if() — resolves to photon path 0 or 1"},{op:"agent.invoke()",desc:"Call a registered AI agent by its Ψ channel address"},{op:"node.register()",desc:"Register this program as a discoverable spectral network node"},{op:"Λ(h, f)",desc:"Lambda Boson — the physical constant hf/c² — core primitive"}].map(({op:t,desc:s})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-3",children:[e.jsx("code",{className:"text-[10px] text-violet-300 block mb-1",children:t}),e.jsx("div",{className:"text-[9px] text-white/25 leading-relaxed",children:s})]},t))})]}),e.jsxs("div",{className:"border border-amber-400/10 rounded-xl p-5 text-center",style:{background:"rgba(251,191,36,0.02)"},children:[e.jsxs("div",{className:"text-amber-400/50 text-[9px] uppercase tracking-widest mb-2 flex items-center justify-center gap-2",children:[e.jsx(O,{size:9})," AGPL-3.0 Open Specification · Free for Every Developer on Earth"]}),e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed max-w-2xl mx-auto",children:"WavelengthScript is a free, open standard. Any company that implements a WLS runtime must publish their code under AGPL-3.0. The CE→SE encoding standard — which underpins the entire type system — is free developer infrastructure. No patent. No licence fee. The address space of light belongs to everyone."})]})]}),n==="grammar"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"text-white/25 text-[11px] leading-relaxed max-w-3xl",children:["WavelengthScript v2.0 is a formally specified, physics-native language. Every keyword is a physical operation — not a metaphor. The type system is Fock space: values are occupation numbers ",e.jsx("code",{className:"text-violet-300",children:"|n⟩"}),", channels are Ψ registers, and computation is state evolution. This grammar closes the gap between pseudocode and a language you can learn, compile, and run today on the WNSP VM."]}),e.jsxs("div",{className:"border border-amber-400/20 rounded-xl p-5 space-y-5",style:{background:"rgba(251,191,36,0.025)"},children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-amber-400 text-[10px] uppercase tracking-widest font-bold",children:"[â,â†]=1"}),e.jsx("span",{className:"text-white/20 text-[9px]",children:"—"}),e.jsx("span",{className:"text-white/50 text-[11px]",children:"Execution Model — WLS programs are sequences of creation & annihilation operators on the vacuum"})]}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-5 gap-2",children:[{sym:"|0⟩",wls:"—",col:"#6b7280",desc:"vacuum · null · uninitialised"},{sym:"|n⟩",wls:"—",col:"#a78bfa",desc:"n quanta · integer n"},{sym:"â†",wls:"emit",col:"#f59e0b",desc:"creation · write · +1 quantum"},{sym:"â",wls:"absorb",col:"#06b6d4",desc:"annihilation · read · −1 quantum"},{sym:"n̂=â†â",wls:"observe",col:"#10b981",desc:"measure occupation · no collapse"}].map(t=>e.jsxs("div",{className:"rounded-lg px-3 py-2.5 border",style:{borderColor:t.col+"30",background:t.col+"08"},children:[e.jsx("div",{className:"font-mono text-base font-bold leading-none mb-1",style:{color:t.col},children:t.sym}),t.wls!=="—"&&e.jsxs("div",{className:"text-[8px] text-white/40 font-mono mb-1",children:["wls: ",e.jsx("span",{style:{color:t.col+"cc"},children:t.wls})]}),e.jsx("div",{className:"text-[8px] text-white/30 leading-tight",children:t.desc})]},t.sym))}),e.jsxs("div",{children:[e.jsx("div",{className:"text-white/25 text-[9px] uppercase tracking-widest mb-3",children:"Live Playground — apply operators to Ψ channels"}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3",children:o.map(t=>{const s=t.nm<450?"#8b00ff":t.nm<495?"#2563eb":t.nm<520?"#06b6d4":t.nm<565?"#16a34a":t.nm<590?"#ca8a04":"#dc2626",d=Math.min(t.n,8);return e.jsxs("div",{className:"border rounded-xl p-3 space-y-2",style:{borderColor:s+"35",background:s+"06"},children:[e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("span",{className:"text-[9px] font-bold",style:{color:s},children:t.label}),e.jsx("span",{className:"text-[8px] text-white/25",children:t.psi})]}),e.jsxs("div",{className:"text-center",children:[e.jsxs("span",{className:"text-2xl font-mono font-black leading-none",style:{color:t.n===0?"#374151":s},children:["|",t.n,"⟩"]}),t.n===0&&e.jsx("div",{className:"text-[7px] text-white/20 mt-0.5",children:"vacuum"})]}),e.jsx("div",{className:"flex gap-0.5 justify-center",children:Array.from({length:8}).map((u,I)=>e.jsx("div",{className:"w-2 h-2 rounded-sm transition-all",style:{background:I<d?s:s+"18"}},I))}),e.jsxs("div",{className:"flex gap-1",children:[e.jsx("button",{onClick:()=>f(t.id,"create"),className:"flex-1 text-[9px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95",style:{borderColor:"#f59e0b60",color:"#f59e0b",background:"#f59e0b10"},"data-testid":`button-fock-create-${t.id}`,title:"Create operator â† — adds 1 quantum",children:"â†"}),e.jsx("button",{onClick:()=>f(t.id,"observe"),className:"flex-1 text-[8px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95",style:{borderColor:"#10b98160",color:"#10b981",background:"#10b98110"},"data-testid":`button-fock-observe-${t.id}`,title:"Number operator n̂ = â†â — measure without destroying",children:"n̂"}),e.jsx("button",{onClick:()=>f(t.id,"annihilate"),disabled:t.n===0,className:"flex-1 text-[9px] py-1 rounded border font-mono font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-20",style:{borderColor:"#06b6d460",color:"#06b6d4",background:"#06b6d410"},"data-testid":`button-fock-annihilate-${t.id}`,title:"Annihilation operator â — removes 1 quantum",children:"â"})]}),e.jsxs("div",{className:"text-[7px] text-white/15 text-center",children:[t.nm,"nm"]})]},t.id)})}),e.jsx("button",{onClick:()=>{l(t=>t.map(s=>({...s,n:0}))),h([])},className:"mt-2 text-[8px] text-white/20 hover:text-white/40 transition-colors border border-white/10 rounded px-2 py-0.5","data-testid":"button-fock-reset",children:"reset to |0,0,0,0⟩"})]}),x.length>0&&e.jsxs("div",{children:[e.jsx("div",{className:"text-white/20 text-[8px] uppercase tracking-widest mb-2",children:"Operator sequence — this is your WLS program"}),e.jsx("div",{className:"bg-black/40 rounded-lg p-3 font-mono text-[9px] space-y-0.5 max-h-32 overflow-y-auto border border-white/5",children:x.map((t,s)=>{const d=t.op==="emit"?"#f59e0b":t.op==="observe"?"#10b981":"#06b6d4";return e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("span",{className:"text-white/20 w-4 text-right",children:[s+1,"."]}),e.jsx("span",{className:"font-bold",style:{color:d},children:t.sym}),e.jsx("span",{className:"text-white/50",children:t.op}),e.jsx("span",{className:"text-white/30",children:t.ch}),e.jsxs("span",{className:"text-white/20",children:["|",t.from,"⟩→|",t.to,"⟩"]}),e.jsx("span",{className:"text-white/15 text-[8px] ml-auto",children:t.op==="emit"?`â†|${t.from}⟩ = √${t.from+1}·|${t.to}⟩`:t.op==="absorb"?`â|${t.from}⟩ = √${t.from}·|${t.to}⟩`:`n̂|${t.from}⟩ = ${t.from}·|${t.from}⟩`})]},s)})})]}),e.jsxs("div",{className:"border-t border-white/5 pt-3 text-[9px] text-white/25 leading-relaxed",children:[e.jsx("span",{className:"text-amber-400/50",children:"From Act 17 — The Field:"})," ","â†|n⟩ = √(n+1)·|n+1⟩ · â|n⟩ = √n·|n−1⟩ · n̂|n⟩ = n·|n⟩ · â|0⟩ = 0 (vacuum is destroyed by â, never negative) · ℋ = ℏω(n̂ + ½)"]})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(R,{size:11})," Formal Grammar — BNF Production Rules"]}),e.jsx("pre",{className:"text-[10px] leading-[1.9] overflow-x-auto",style:{color:"#c4b5fd"},children:`program      ::= statement*

statement    ::= field_def
               | channel_decl
               | entangle_stmt
               | resonate_stmt
               | propagate_stmt
               | absorb_stmt
               | emit_stmt
               | observe_stmt
               | collapse_stmt
               | comment

field_def    ::= "field" IDENT "(" param_list? ")" ("→" type)? "{" statement* "}"
param_list   ::= param ("," param)*
param        ::= "channel" IDENT ":" type

channel_decl ::= "channel" IDENT (":=" expr)? ("∿" TEXT)?

resonate_stmt ::= "resonate" "when" expr "{" statement* "}"
propagate_stmt::= "propagate" "over" expr "{" statement* "}"
entangle_stmt ::= "entangle" psi "→" psi  ("∿" TEXT)?
absorb_stmt  ::= "absorb" "(" nm_or_psi ")"  ("∿" TEXT)?
emit_stmt    ::= "emit" expr ("→" psi)?
observe_stmt ::= "observe" expr ("←" expr)?
collapse_stmt::= "collapse" expr

comment      ::= "∿" TEXT

type         ::= "@" FLOAT "nm"              ∿ spectral band type
               | "Fock"                       ∿ occupation number |n⟩
               | "Joules"                     ∿ scalar energy
               | psi                          ∿ channel reference
               | IDENT                        ∿ named type

psi          ::= "Ψ(" INT "," INT "," POL ")"
POL          ::= "H" | "V"
nm_or_psi    ::= FLOAT "nm" | psi
expr         ::= literal | IDENT | psi | call | binary_op
call         ::= IDENT "." IDENT "(" args? ")"
args         ::= expr ("," expr)*
literal      ::= INT | FLOAT | STRING | "|" INT "⟩"   ∿ Fock state literal`})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(K,{size:11})," Keyword Reference — v2.0"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-[10px]",children:[e.jsx("thead",{children:e.jsx("tr",{className:"border-b border-white/5",children:["Keyword","Physics operator","Classical equiv.","Description"].map(t=>e.jsx("th",{className:"text-left text-white/20 py-2 pr-6 font-normal",children:t},t))})}),e.jsx("tbody",{className:"divide-y divide-white/5",children:[{kw:"channel",phys:"—",cls:"var / let",desc:"Declare a Ψ register. Holds a Fock state |n⟩ or typed value."},{kw:"field",phys:"—",cls:"function / def",desc:"Define a named spectral operation. Returns collapse value."},{kw:"emit",phys:"â†  (â†)",cls:"write / push",desc:"Raise occupation number — add a quantum to the channel."},{kw:"absorb",phys:"â  (â)",cls:"read / receive",desc:"Lower occupation number — consume a quantum from the channel."},{kw:"observe",phys:"n̂ = â†â",cls:"read / measure",desc:"Measure current Fock state without destroying it. |n⟩ → n."},{kw:"resonate when",phys:"δ(cond)",cls:"if",desc:"Conditional resonance. Block executes only when condition is met."},{kw:"propagate over",phys:"∑ₙ",cls:"for / while",desc:"Iterate over a set of states. Each step is a wave cycle."},{kw:"collapse",phys:"|Ψ⟩ → x",cls:"return",desc:"Terminate and output. Wavefunction collapses to a classical value."},{kw:"entangle",phys:"|Φ⁺⟩",cls:"bind / ref",desc:"Create a Bell-state binding between two Ψ channels."},{kw:"∿",phys:"—",cls:"// or #",desc:"Comment — the wave symbol. Everything after is ignored."}].map(({kw:t,phys:s,cls:d,desc:u})=>e.jsxs("tr",{children:[e.jsx("td",{className:"py-2.5 pr-6",children:e.jsx("code",{className:"text-violet-300 font-bold text-[11px]",children:t})}),e.jsx("td",{className:"py-2.5 pr-6 text-cyan-400/70 font-mono",children:s}),e.jsx("td",{className:"py-2.5 pr-6 text-white/30",children:d}),e.jsx("td",{className:"py-2.5 text-white/40 leading-relaxed",children:u})]},t))})]})})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(O,{size:11})," Type System — Fock Space"]}),e.jsxs("p",{className:"text-white/25 text-[11px] leading-relaxed mb-4",children:["WLS v2.0 is grounded in quantum field theory, not traditional type theory. Every value is an occupation number in a Hilbert space channel. The type annotation",e.jsx("code",{className:"text-violet-300 mx-1",children:"@540nm"})," doesn't just name a type — it specifies the physical wavelength where that data lives."]}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-4 gap-3",children:[{type:"|0⟩",label:"Fock vacuum",desc:"null / zero / empty channel",col:"#6b7280"},{type:"|1⟩",label:"Single quant",desc:"boolean / unit value",col:"#8b00ff"},{type:"|n⟩",label:"Occupation n",desc:"integer / count",col:"#2563eb"},{type:"|α⟩",label:"Coherent state",desc:"float / continuous",col:"#06b6d4"},{type:"@Xnm",label:"Spectral type",desc:"data at wavelength X",col:"#16a34a"},{type:"Ψ(w,o,p)",label:"Channel ref",desc:"pointer to Ψ register",col:"#ca8a04"},{type:"Fock",label:"Any Fock state",desc:"untyped quantum value",col:"#ea580c"},{type:"Joules",label:"Energy scalar",desc:"hf — classical bridge",col:"#dc2626"}].map(({type:t,label:s,desc:d,col:u})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-3",style:{background:u+"08"},children:[e.jsx("code",{className:"text-[13px] font-bold block mb-1",style:{color:u},children:t}),e.jsx("div",{className:"text-[9px] font-semibold mb-0.5",style:{color:u+"cc"},children:s}),e.jsx("div",{className:"text-[8px] text-white/25",children:d})]},t))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-2",children:[e.jsx(U,{size:11})," Phase 1 — Bridge Programs"]}),e.jsx("p",{className:"text-white/20 text-[10px] mb-4",children:"These are the simple, understood things the transpiler must handle: contracts, transfers, governance, wallet ops. Real WLS v2.0 syntax — paste into the Compiler tab to emit bytecode."}),e.jsx("div",{className:"flex gap-2 mb-4 flex-wrap",children:[{id:"transfer",label:"Token Transfer",col:"#ca8a04"},{id:"contract",label:"Smart Contract",col:"#2563eb"},{id:"governance",label:"Governance Vote",col:"#8b00ff"},{id:"wallet",label:"Wallet Balance",col:"#16a34a"}].map(({id:t,label:s,col:d})=>e.jsx("button",{onClick:()=>a(t),className:"text-[9px] px-3 py-1 rounded-full border transition-all",style:{borderColor:m===t?d+"80":d+"25",color:m===t?d:d+"70",background:m===t?d+"15":"transparent"},"data-testid":`button-grammar-${t}`,children:s},t))}),e.jsx("pre",{className:"text-[10px] leading-relaxed overflow-x-auto p-4 rounded-xl border border-violet-400/10 font-mono",style:{background:"rgba(139,0,255,0.04)",color:"#ddd6fe"},children:m==="transfer"?M:m==="contract"?G:m==="governance"?F:q}),e.jsx("div",{className:"mt-3 flex justify-end",children:e.jsxs("button",{onClick:()=>{_(m==="transfer"?M:m==="contract"?G:m==="governance"?F:q),k("compiler")},className:"flex items-center gap-1.5 text-[9px] px-3 py-1.5 rounded-lg border border-violet-400/30 text-violet-400/70 hover:text-violet-400 hover:border-violet-400/50 transition-all","data-testid":"button-load-in-compiler",children:[e.jsx(V,{size:9})," Load in Compiler →"]})})]}),e.jsxs("div",{className:"border border-amber-400/10 rounded-xl p-5",style:{background:"rgba(251,191,36,0.02)"},children:[e.jsxs("div",{className:"text-amber-400/50 text-[9px] uppercase tracking-widest mb-3 flex items-center gap-2",children:[e.jsx(O,{size:9})," Why WLS Looks Like Nothing Else"]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-white/50 font-semibold mb-1",children:"No assignment operator"}),e.jsxs("div",{className:"text-white/25 leading-relaxed",children:[e.jsx("code",{className:"text-violet-300",children:"channel x := val"})," is a channel declaration, not assignment. The ",e.jsx("code",{className:"text-violet-300",children:":="}),` symbol means "initialise the Fock state of this register." You don't store a value — you prepare a quantum state.`]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-white/50 font-semibold mb-1",children:"Types are wavelengths"}),e.jsxs("div",{className:"text-white/25 leading-relaxed",children:[e.jsx("code",{className:"text-violet-300",children:"@468nm"})," isn't a tag — it's the physical address where that data lives in the EM spectrum. AUTH band (450–495nm). Change the wavelength, change the authority tier."]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-white/50 font-semibold mb-1",children:"Functions don't call — they resonate"}),e.jsxs("div",{className:"text-white/25 leading-relaxed",children:[e.jsx("code",{className:"text-violet-300",children:"field"})," definitions declare a standing wave pattern. Execution is resonance — the wavefunction propagates until ",e.jsx("code",{className:"text-violet-300",children:"collapse"}),"makes the result classical."]})]})]})]})]}),n==="transpiler"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Paste any Python, JavaScript, or Rust code. The transpiler maps every symbol through CE→SE encoding to assign it a physical wavelength address, then rewrites the code in WavelengthScript syntax."}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsx("div",{className:"flex gap-2",children:["python","javascript","rust"].map(t=>e.jsx("button",{onClick:()=>v(t),className:`text-[9px] uppercase px-2 py-1 rounded transition-all ${p===t?"text-violet-300 bg-violet-400/15 border border-violet-400/30":"text-white/25 hover:text-white/50"}`,children:t},t))}),e.jsx("span",{className:"text-white/20 text-[9px]",children:"Source"})]}),e.jsx("textarea",{className:"w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed",rows:22,value:y,onChange:t=>i(t.target.value),placeholder:"Paste your Python, JavaScript, or Rust code here…","data-testid":"textarea-source",spellCheck:!1})]}),e.jsxs("div",{className:"border border-violet-400/20 rounded-xl overflow-hidden",style:{background:"rgba(139,0,255,0.03)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between",children:[e.jsx("span",{className:"text-violet-400/60 text-[9px] uppercase tracking-widest",children:"WavelengthScript Output"}),c&&e.jsxs("button",{onClick:ee,className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all",children:[e.jsx(X,{size:9})," ",W?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-4 text-[10px] text-violet-200/80 font-mono leading-relaxed overflow-auto h-[22rem] whitespace-pre-wrap",children:c||e.jsx("span",{className:"text-white/15",children:'Click "Transpile →" to convert your code to WavelengthScript…'})})]})]}),e.jsx("div",{className:"flex justify-center",children:e.jsxs("button",{onClick:Q,className:"flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all","data-testid":"button-transpile",children:[e.jsx(U,{size:14})," Transpile ",p," → WavelengthScript"]})})]}),n==="compiler"&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"text-white/25 text-[11px] leading-relaxed",children:["Write WavelengthScript source and compile it to ",e.jsx("span",{className:"text-violet-300",children:"WNSP bytecode"})," — machine instructions that target Ψ channels directly. Each opcode carries a wavelength operand: the CPU is the electromagnetic spectrum, registers are spectral channels."]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx("span",{className:"text-white/20 text-[9px] uppercase tracking-widest mr-1",children:"Load sample:"}),[{label:"AI Agent",src:J,col:"#a78bfa"},{label:"Governance v1",src:me,col:"#2563eb"},{label:"P2P Transfer",src:he,col:"#06b6d4"},{label:"Spectral Wallet",src:xe,col:"#ca8a04"},{label:"Transfer v2.0",src:M,col:"#f59e0b"},{label:"Contract v2.0",src:G,col:"#3b82f6"},{label:"Governance v2.0",src:F,col:"#8b00ff"},{label:"Wallet v2.0",src:q,col:"#22c55e"}].map(({label:t,src:s,col:d})=>e.jsx("button",{onClick:()=>{_(s),z(null)},className:"text-[9px] px-2.5 py-1 rounded-full border transition-all hover:opacity-90",style:{borderColor:d+"40",color:d,background:d+"10"},"data-testid":`button-sample-${t.toLowerCase().replace(/\s+/g,"-")}`,children:t},t))]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsx("span",{className:"text-white/40 text-[9px] uppercase tracking-widest",children:"WavelengthScript Source"}),e.jsx("span",{className:"text-[8px] text-violet-400/40",children:"WLS v2.0"})]}),e.jsx("textarea",{className:"w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed",rows:22,value:L,onChange:t=>_(t.target.value),placeholder:"Write WavelengthScript here…","data-testid":"textarea-compiler-source",spellCheck:!1})]}),e.jsxs("div",{className:"border border-violet-400/20 rounded-xl overflow-hidden flex flex-col",style:{background:"rgba(139,0,255,0.03)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between flex-shrink-0",children:[e.jsx("div",{className:"flex gap-1",children:["asm","hex","manifest"].map(t=>e.jsx("button",{onClick:()=>r(t),className:`text-[9px] uppercase px-2 py-1 rounded transition-all ${T===t?"text-violet-300 bg-violet-400/15 border border-violet-400/30":"text-white/25 hover:text-white/50"}`,"data-testid":`button-view-${t}`,children:t==="asm"?"Assembly":t==="hex"?"Hex Dump":"Manifest"},t))}),j&&e.jsxs("button",{onClick:()=>{const t=T==="asm"?j.assembly:T==="hex"?j.hex:j.manifest.map(s=>`${s.symbol} → ${s.nm}nm ${s.psi} [${s.band}]`).join(`
`);navigator.clipboard.writeText(t),H(!0),setTimeout(()=>H(!1),1500)},className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all",children:[e.jsx(X,{size:9})," ",Y?"Copied!":"Copy"]})]}),e.jsx("div",{className:"flex-1 overflow-auto",children:j?T==="asm"?e.jsx("pre",{className:"p-4 text-[9.5px] text-violet-200/80 font-mono leading-relaxed whitespace-pre",children:j.assembly}):T==="hex"?e.jsx("pre",{className:"p-4 text-[9.5px] text-emerald-300/70 font-mono leading-relaxed whitespace-pre",children:j.hex}):e.jsx("div",{className:"p-4 space-y-2",children:j.manifest.length===0?e.jsx("div",{className:"text-white/20 text-[10px]",children:"No named symbols found."}):j.manifest.map(t=>{const s=A(t.nm);return e.jsxs("div",{className:"flex items-center gap-3 border border-white/5 rounded-lg px-3 py-2",style:{background:s+"06"},children:[e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:s}}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-[10px] font-bold truncate",style:{color:s},children:t.symbol}),e.jsx("div",{className:"text-[8px] text-white/30",children:t.psi})]}),e.jsxs("div",{className:"text-right flex-shrink-0",children:[e.jsxs("div",{className:"text-[10px] font-bold",style:{color:s},children:[t.nm,"nm"]}),e.jsx("div",{className:"text-[8px] px-1 rounded",style:{background:s+"20",color:s},children:t.band})]})]},t.symbol)})}):e.jsx("div",{className:"p-4 text-white/15 text-[10px] text-center py-16",children:'Click "Compile → Bytecode" to emit WNSP instructions'})})]})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("button",{onClick:()=>z(pe(L)),className:"flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all","data-testid":"button-compile",children:[e.jsx(V,{size:14})," Compile → WNSP Bytecode"]}),j&&e.jsxs("div",{className:"flex items-center gap-6 text-[10px] text-white/30",children:[e.jsxs("span",{children:[e.jsx("span",{className:"text-violet-400 font-bold",children:j.instrCount})," instructions"]}),e.jsxs("span",{children:[e.jsx("span",{className:"text-cyan-400 font-bold",children:j.manifest.length})," Ψ channels"]}),e.jsx("span",{className:"text-white/15",children:"· targeting spectral execution model"})]})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsx("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4",children:"WNSP Opcode Reference"}),e.jsx("div",{className:"grid grid-cols-3 md:grid-cols-4 gap-2",children:[{op:"01 TUNE",desc:"Set receiver to λ",col:"#06b6d4"},{op:"02 PUSH",desc:"Bind value at wavelength",col:"#a78bfa"},{op:"03 EMIT",desc:"Broadcast on Ψ channel",col:"#f59e0b"},{op:"05 BROAD",desc:"Band-wide broadcast",col:"#f97316"},{op:"06 OCS",desc:"Oscillate — wave loop",col:"#16a34a"},{op:"07 LABEL",desc:"Function address in Ψ",col:"#8b00ff"},{op:"08 JMPZ",desc:"Conditional photon branch",col:"#dc2626"},{op:"0A AGENT",desc:"Register spectral agent",col:"#0ea5e9"},{op:"0B EXEC",desc:"Generic spectral exec",col:"#6b7280"},{op:"FE RET",desc:"Scope end — wave collapses",col:"#4b5563"},{op:"FF HALT",desc:"Wavefunction terminated",col:"#374151"}].map(({op:t,desc:s,col:d})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-2.5",children:[e.jsx("code",{className:"text-[9px] font-bold block mb-1",style:{color:d},children:t}),e.jsx("div",{className:"text-[8px] text-white/30 leading-relaxed",children:s})]},t))})]})]}),n==="ai"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"AI agents in WavelengthScript are not processes — they are nodes on the spectral network. Each agent registers at its CE→SE wavelength. Other agents or humans discover and interact with it by tuning to that band. The agent's name IS its address."}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(V,{size:11})," Standard AI Agent Architecture on the Wave"]}),e.jsx("div",{className:"grid grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden",children:[{step:"1. Define",code:`agent = Agent(
  name="ReasoningCore",
  band="LOGIC",   // 520–564nm
  model=my_llm
)`,color:"#16a34a"},{step:"2. Register",code:`agent.register()
// CE→SE: "ReasoningCore"
// → 541nm
// → Ψ(41,12,V)
// → discoverable on network`,color:"#06b6d4"},{step:"3. Listen & emit",code:`@agent.on_signal("Ψ(41,12,V)")
def handle(prompt):
  result = model.infer(prompt)
  agent.emit(result)
  // → 541nm broadcast`,color:"#8b00ff"}].map(({step:t,code:s,color:d})=>e.jsxs("div",{className:"p-4 bg-black/60",children:[e.jsx("div",{className:"text-[9px] font-bold mb-2",style:{color:d},children:t}),e.jsx("pre",{className:"text-[9px] text-white/50 leading-relaxed overflow-x-auto",children:s})]},t))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(le,{size:11})," Recommended AI Agent Channels"]}),e.jsx("div",{className:"text-white/20 text-[9px] mb-4",children:"These are suggested standard channels for common AI functions. Register your agent at these frequencies so other systems know where to find it."}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3",children:ge.map(t=>{const s=A(t.nm);return e.jsxs("div",{className:"border rounded-xl p-4",style:{borderColor:s+"25",background:s+"06"},children:[e.jsx("div",{className:"text-[10px] font-bold mb-1",style:{color:s},children:t.agent}),e.jsxs("div",{className:"flex gap-1.5 mb-2 flex-wrap",children:[e.jsxs("span",{className:"text-[8px] px-1.5 py-0.5 rounded border",style:{borderColor:s+"30",color:s},children:[t.nm,"nm"]}),e.jsx("span",{className:"text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/30",children:t.psi})]}),e.jsx("div",{className:"text-[9px] text-white/30",children:t.role})]},t.agent)})})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(R,{size:11})," Complete WLS AI Agent — WavelengthScript Native"]}),e.jsx("pre",{className:"text-[10px] text-violet-200/80 leading-relaxed overflow-x-auto p-4 rounded-xl border border-violet-400/10",style:{background:"rgba(139,0,255,0.04)"},children:`// WavelengthScript v1.0 · AGPL-3.0
// AI Agent: ReasoningCore

tune(540nm)  // lock receiver to LOGIC band

@emit(541.2nm, Ψ(41,12,V))
agent ReasoningCore {
  @468nm model   := load("my-llm")        // AUTH band — trusted model
  @648nm memory  := VectorStore.connect()  // STORAGE band — long-term memory
  @501nm stream  := StreamParser.new()     // STREAM band — token streaming

  // Main inference loop
  oscillate(Ψ(41,12,V), 0Hz) {
    let prompt := tune(Ψ(41,12,V))         // receive from this channel
    let context := memory.retrieve(prompt)  // pull relevant memories
    let tokens := model.infer(prompt, context)

    // Stream tokens to output channel
    stream.pipe(tokens, Ψ(49,21,V))        // → OutputEmitter channel

    // Store interaction in memory
    memory.store(@648nm {
      prompt: prompt,
      response: tokens.collect(),
    })
  }
}

// Register on spectral network — discoverable by other agents
node.register("ReasoningCore", @541.2nm)
`})]})]}),n==="sdk"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"You don't need to rewrite everything in WavelengthScript. The SDK lets you call NexusOS from your existing Python, JavaScript, or Rust codebase. Your code gains spectral addressing, agent registration, and Ψ channel messaging without changing your language."}),e.jsx("div",{className:"grid grid-cols-1 gap-4",children:be.map(t=>e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-5 py-3 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(R,{size:11,className:"text-violet-400/60"}),e.jsx("span",{className:"text-[11px] font-bold text-violet-300",children:t.lang})]}),e.jsx("span",{className:"text-white/20 text-[9px]",children:t.desc})]}),e.jsx("pre",{className:"p-5 text-[10px] text-white/60 leading-relaxed overflow-x-auto font-mono",children:t.snippet})]},t.lang))}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(ie,{size:11})," SDK Method Reference"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-[10px]",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-white/5",children:[e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"Method"}),e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"Python"}),e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"JavaScript"}),e.jsx("th",{className:"text-left text-white/25 py-2 font-normal",children:"What it does"})]})}),e.jsx("tbody",{className:"divide-y divide-white/5",children:[{m:"Register agent",py:"Agent(name, band)",js:"new Agent({name,wavelength})",desc:"Create & register a node on the spectral network"},{m:"Listen for signals",py:"@on_signal(psi)",js:"agent.on('signal', fn)",desc:"Subscribe to a Ψ channel — fires on every emit to that channel"},{m:"Emit output",py:"agent.emit(result)",js:"agent.emit(result)",desc:"Broadcast your output to the channel at your wavelength"},{m:"CE→SE encode",py:"nexusos.encode(text)",js:"NexusOS.encode(text)",desc:"Get the wavelength address for any word or phrase"},{m:"Query nodes",py:"nexusos.nodes(band)",js:"NexusOS.nodes(band)",desc:"List all nodes visible in a given spectral band"},{m:"Send message",py:"nexusos.send(psi, msg)",js:"NexusOS.send(psi, msg)",desc:"Send a message to any Ψ channel"},{m:"Tune (receive)",py:"nexusos.tune(nm)",js:"NexusOS.tune(nm)",desc:"Start listening at a specific wavelength"}].map(({m:t,py:s,js:d,desc:u})=>e.jsxs("tr",{children:[e.jsx("td",{className:"py-2 pr-4 text-white/50 font-semibold",children:t}),e.jsx("td",{className:"py-2 pr-4",children:e.jsx("code",{className:"text-violet-300",children:s})}),e.jsx("td",{className:"py-2 pr-4",children:e.jsx("code",{className:"text-cyan-300",children:d})}),e.jsx("td",{className:"py-2 text-white/25",children:u})]},t))})]})})]}),e.jsxs("div",{className:"border border-emerald-400/15 rounded-xl p-5 flex items-center justify-between",style:{background:"rgba(74,222,128,0.03)"},children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-emerald-400/70 text-[10px] font-bold uppercase tracking-widest mb-1",children:"Register your agent as a network node"}),e.jsx("div",{className:"text-white/25 text-[10px]",children:"Once your agent is running, register it on the Spectral Network so other agents and humans can discover it by tuning to its wavelength."})]}),e.jsx(D,{href:"/network",children:e.jsxs("button",{className:"flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/50 transition-all text-[10px] font-bold flex-shrink-0 ml-4","data-testid":"button-goto-network",children:["Open Network ",e.jsx(ce,{size:11})]})})]}),e.jsxs("div",{className:"text-center space-y-1",children:[e.jsx("div",{className:"text-white/20 text-[9px] uppercase tracking-widest",children:"AGPL-3.0 · Specification published April 2026"}),e.jsx("div",{className:"text-white/15 text-[9px]",children:"The WavelengthScript specification, CE→SE encoding standard, and all NexusOS SDKs are free, open infrastructure. Every implementation must publish source. The address space of light belongs to all civilisations."})]})]})]})]})}export{je as default};
