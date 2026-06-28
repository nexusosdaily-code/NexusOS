import{a as j,j as e}from"./vendor-query-BqLxTKzc.js";import{u as G}from"./use-page-meta-BHtL6y3o.js";import{L as W,d as P,Z as z,C as R,e as O,R as B,B as H}from"./index-su9y76RP.js";import{A as _}from"./arrow-left-CiXionEf.js";import{L as q}from"./layers-BpSn3KcZ.js";import{A as D}from"./atom-CXAIAorJ.js";import{P as F}from"./play-Cc0tMcma.js";import{C as K}from"./chevron-right-pKHp5KQy.js";import"./vendor-radix-Bg2fqeVo.js";import"./vendor-charts-DAxvRQzT.js";function E(d){return d<450?"#8b00ff":d<495?"#2563eb":d<520?"#06b6d4":d<565?"#16a34a":d<590?"#ca8a04":d<625?"#ea580c":"#dc2626"}function $(d){return d<450?"SYSTEM":d<495?"AUTH":d<520?"STREAM":d<565?"LOGIC":d<590?"INTERFACE":d<625?"EVENT":"STORAGE"}function g(d){const b=d.toUpperCase().split("").map(p=>p.charCodeAt(0)).filter(p=>p>=32&&p<=126);b.length||b.push(77);const f=b.reduce((p,n)=>p+n,0)/b.length,o=parseFloat((380+(f-32)/94*400).toFixed(2)),c=parseFloat((299792458/(o*1e-9)/1e12).toFixed(2)),w=Math.floor((o-380)/4)+1,s=b.reduce((p,n)=>p+n,0)%100,S=b.length%2===0?"H":"V";return{nm:o,thz:c,psi:`Ψ(${w},${s},${S})`,band:$(o)}}function U(d,b){if(!d.trim())return"";const f=d.split(`
`),o=["// ── WavelengthScript v1.0 · AGPL-3.0 · NexusOS ─────────────────",`// Source: ${b.toUpperCase()} → WLS transpilation`,`// Generated: ${new Date().toISOString()}`,""];for(const w of f){const s=w.trim();if(!s){o.push("");continue}if(s.startsWith("#")||s.startsWith("//")){o.push(`// ${s.replace(/^[#/]+\s*/,"")}`);continue}const S=s.match(/^(?:def|function|fn)\s+(\w+)\s*\(([^)]*)\)/);if(S){const[,l,h]=S,m=g(l),x=h.split(",").map(v=>v.trim()).filter(Boolean).map(v=>`@${g(v.replace(/[^a-zA-Z]/g,"")||"x").nm}nm ${v.trim()}`).join(", ");o.push(`@emit(${m.nm}nm, ${m.psi}) // λ=${m.nm}nm · ${m.band}`),o.push(`fn ${l}(${x}) {`);continue}const p=s.match(/^(?:class|struct)\s+(\w+)/);if(p){const l=g(p[1]);o.push(`@channel(${l.psi}) // ${l.nm}nm · ${l.band}`),o.push(`type ${p[1]} : SpectralNode {`);continue}const n=s.match(/^(?:let|const|var)?\s*(\w+)\s*[:=]+\s*(.+)/);if(n){const[,l,h]=n,m=g(l);o.push(`@${m.nm}nm let ${l} := ${h.replace(/;$/,"")}  // ${m.psi}`);continue}if(s.startsWith("return")){o.push(`  emit ${s.slice(6).trim()}  // → spectral output`);continue}if(s.startsWith("import")||s.startsWith("use")||s.startsWith("require")){const l=s.match(/["']([^"']+)["']/),h=l?l[1]:"module",m=g(h.replace(/[^a-zA-Z]/g,"")||"mod");o.push(`tune(${m.nm}nm)  // import ${h} at ${m.psi}`);continue}if(s.match(/^(?:print|console\.log|println!|System\.out)/)){o.push(`  broadcast(${s.replace(/^[^(]+/,"")})  // → 520nm STREAM band`);continue}if(s.startsWith("if ")||s==="else"||s.startsWith("else")){o.push(`  ?λ ${s.replace(/^else\s*/,"// else ")}:`);continue}if(s.startsWith("for ")||s.startsWith("while ")){o.push(`  oscillate(${s.replace(/^(for|while)\s+/,"")}) {`);continue}if(s==="}"||s==="}"||s.match(/^end(\s|$)/)){o.push("}");continue}const i=g(s.split(" ")[0]||"op");o.push(`  /* @${i.nm}nm */ ${s}`)}o.push(""),o.push("// ── Spectral manifest ───────────────────────────────────────────");const c=Array.from(new Set(d.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g)??[])).slice(0,8);for(const w of c){const s=g(w);o.push(`// ${w.padEnd(20)} → ${s.nm}nm  ${s.psi}  [${s.band}]`)}return o.join(`
`)}function Z(d){if(!d.trim())return{assembly:"",hex:"",manifest:[],instrCount:0};const b=[],f=new Map;let o=0;function c(n,i,l,h,m,x){b.push({off:o,op:n,mnem:i,args:l,nm:m,ch:x,cmt:h}),n!==0&&(o+=8)}c(0,".WNSP","v1.0","NexusOS WNSP Bytecode · AGPL-3.0"),c(0,".ARCH","WDM256·OAM50·POL2","25,600 orthogonal Ψ channels"),c(0,".MODEL","Λ=hf/c² SPECTRAL","Einstein first-principle execution"),c(0,"","",""),o=0;for(const n of d.split(`
`)){const i=n.trim();if(!i){c(0,"","","");continue}if(i.startsWith("//")||i.startsWith(";")||i.startsWith("#")){c(0,";",i.replace(/^[/;#]+\s*/,""),"");continue}const l=i.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);if(l){const a=parseFloat(l[1]);f.set(l[2],{nm:a,psi:l[2],band:$(a)}),c(3,"EMIT",`λ=${a}nm  ${l[2]}`,`emit on ${$(a)} band`,a,l[2]);continue}const h=i.match(/tune\((\d+\.?\d*)nm\)/);if(h){const a=parseFloat(h[1]);c(1,"TUNE",`λ=${a}nm`,`receiver → ${$(a)} band`,a);continue}const m=i.match(/^agent\s+(\w+)/);if(m){const a=g(m[1]);f.set(m[1],a),c(10,"AGENT",`"${m[1]}"  ${a.psi}`,`AI agent λ=${a.nm}nm · ${a.band}`,a.nm,a.psi);continue}const x=i.match(/^fn\s+(\w+)/);if(x){const a=g(x[1]);f.set(x[1],a),c(7,"LABEL",`${x[1]}  ${a.psi}`,`fn → λ=${a.nm}nm`,a.nm,a.psi);continue}const v=i.match(/node\.register\("([^"]+)"/);if(v){const a=g(v[1]);f.set(v[1],a),c(10,"AGENT",`"${v[1]}"  ${a.psi}  PUBLIC`,"spectral network node",a.nm,a.psi);continue}const u=i.match(/oscillate\(([^)]+)\)/);if(u){c(6,"OCS",u[1].trim(),"non-blocking wave loop");continue}const A=i.match(/broadcast\(([^)]+)\)/);if(A){const a=g(A[1].replace(/[^a-zA-Z]/g,"")||"data");c(5,"BROAD",A[1].trim(),`broadcast λ=${a.nm}nm`,a.nm);continue}const k=i.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);if(k){const a=parseFloat(k[1]);f.set(k[2],{nm:a,psi:g(k[2]).psi,band:$(a)}),c(2,"PUSH",`@${a}nm  "${k[2]}"`,`bind at λ=${a}nm · ${$(a)}`,a);continue}const C=i.match(/^\s*emit\s+(.+)/);if(C){const a=g(C[1].replace(/[^a-zA-Z]/g,"")||"out");c(3,"EMIT",C[1].trim(),`output at λ=${a.nm}nm`,a.nm);continue}if(i.startsWith("?λ ")){c(8,"JMPZ",i.slice(3).trim(),"photon path branch");continue}if(i==="}"||i.match(/^end\b/)){c(254,"RET","","scope end — wave collapses");continue}const y=i.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op",T=g(y);c(11,"EXEC",`@${T.nm}nm`,i.slice(0,50),T.nm)}c(255,"HALT","","wavefunction terminated");const w=[...f.entries()].map(([n,i])=>({symbol:n,...i})),s=b.filter(n=>n.op!==0&&n.mnem!==""&&n.mnem!==";"),S=["; ── WNSP Bytecode Assembly v1.0 ────────────────────────────────────",`; NexusOS · AGPL-3.0 · ${new Date().toISOString().slice(0,19)}Z`,"; Hilbert-space: 25,600 orthogonal channels · E=hf · Λ=hf/c²","; ────────────────────────────────────────────────────────────────────","",...b.map(n=>{if(!n.mnem)return"";if(n.mnem===";")return`  ; ${n.args}`;if(n.mnem.startsWith("."))return`${n.mnem.padEnd(10)} ${n.args}  ; ${n.cmt}`;const i=`0x${n.off.toString(16).padStart(6,"0")}`,l=n.op.toString(16).padStart(2,"0"),h=n.cmt?`  ; ${n.cmt}`:"";return`  ${i}  ${l}  ${n.mnem.padEnd(8)} ${n.args}${h}`}),"",`; ── Symbol Table (${w.length} symbols) ─────────────────────────────────────`,...w.map(n=>`; ${n.symbol.padEnd(22)} λ=${String(n.nm).padEnd(8)} ${n.psi}  [${n.band}]`)],p=["; WNSP Binary Hex Dump","; ─────────────────────────────────────────────────────────────","Offset    Bytes                              Annotation","────────  ─────────────────────────────────  ──────────────────",'0x000000  57 4E 53 50 01 00 00 00            ; magic "WNSP" v1.0',`0x000008  ${s.length.toString(16).padStart(8,"0").match(/.{2}/g).join(" ")}            ; instr count = ${s.length}`,...s.slice(0,12).map((n,i)=>{const l=`0x${(16+i*8).toString(16).padStart(6,"0")}`,h=n.op.toString(16).padStart(2,"0"),m=n.nm?Math.round(n.nm*10):0,x=Math.floor(m/256).toString(16).padStart(2,"0"),v=(m%256).toString(16).padStart(2,"0");return`${l}  ${h} ${x} ${v} 00 00 00 00 00 ; ${n.mnem.padEnd(6)} ${n.args.slice(0,24)}`}),s.length>12?`...  (${s.length-12} more instructions)`:""];return{assembly:S.join(`
`),hex:p.filter(Boolean).join(`
`),manifest:w,instrCount:s.length}}const J=`// WavelengthScript v1.0 · AGPL-3.0
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
`,Y=`// WavelengthScript v1.0 · AGPL-3.0
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
`,X=`// WavelengthScript v1.0 · AGPL-3.0
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
`,I=`// WavelengthScript v1.0 · AGPL-3.0
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
`,V=[{nm:"380–449nm",band:"SYSTEM",color:"#8b00ff",types:["kernel","root","syscall","interrupt"],desc:"Root authority — kernel operations, hardware control, boot sequences"},{nm:"450–494nm",band:"AUTH",color:"#2563eb",types:["identity","token","session","trust"],desc:"Identity & trust — authentication, wallet addresses, permissions"},{nm:"495–519nm",band:"STREAM",color:"#06b6d4",types:["channel","stream","broadcast","live"],desc:"Live data flow — video, audio, real-time messaging"},{nm:"520–564nm",band:"LOGIC",color:"#16a34a",types:["compute","fn","agent","model"],desc:"Computation — functions, AI agents, logic gates, inference"},{nm:"565–589nm",band:"INTERFACE",color:"#ca8a04",types:["display","ui","render","component"],desc:"User interface — rendering, display, interaction"},{nm:"590–624nm",band:"EVENT",color:"#ea580c",types:["signal","trigger","webhook","pulse"],desc:"Events & signals — triggers, interrupts, pub-sub"},{nm:"625–780nm",band:"STORAGE",color:"#dc2626",types:["record","store","db","persist"],desc:"Data at rest — spectral database, ordinals, archives"}],Q=[{concept:"Declare a variable",wls:"@540nm let mass := Λ(h=6.626e-34, f=555e12)",note:"λ=540nm → LOGIC band"},{concept:"Define a function",wls:`@emit(523nm, Ψ(37,8,H))
fn encode(input: @520nm str) → @540nm float`,note:"emit declares spectral address"},{concept:"Import a module",wls:"tune(490nm)  // imports identity module",note:"tune() sets receiver to that band"},{concept:"Call an AI agent",wls:'agent.invoke(@540nm "reasoning", prompt)',note:"agents live on LOGIC band 520–564nm"},{concept:"Send a message",wls:"broadcast(Ψ(37,8,H), payload)  // stream band",note:"broadcast() emits on Ψ channel"},{concept:"Async / concurrent",wls:"oscillate(Ψ(100,0,H), 7.83Hz) { ... }",note:"oscillate() = non-blocking wave loop"},{concept:"Type annotation",wls:"@625nm record Post { title: @560nm str }",note:"type prefix = band address"},{concept:"Register AI node",wls:'node.register("GPT-Nexus", @540nm)',note:"node name → CE→SE → band → discoverable"}],ee=[{agent:"ReasoningCore",nm:541.2,psi:"Ψ(41,12,V)",role:"General inference & chain-of-thought"},{agent:"MemoryStore",nm:648.4,psi:"Ψ(68,44,H)",role:"Long-term memory, vector retrieval"},{agent:"StreamParser",nm:501.7,psi:"Ψ(31,17,V)",role:"Real-time token streaming"},{agent:"EmbeddingMapper",nm:538.9,psi:"Ψ(40,89,V)",role:"Token → wavelength embedding"},{agent:"TrustLayer",nm:468.3,psi:"Ψ(23,83,V)",role:"Auth & identity verification"},{agent:"OutputEmitter",nm:572.1,psi:"Ψ(49,21,V)",role:"Response generation & broadcast"}],te=[{lang:"Python",snippet:`import nexusos

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

agent.register().await?;`,desc:"Rust SDK — add `nexusos-sdk` to Cargo.toml"}],se=`import math

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
`;function he(){G({title:"WavelengthScript — Physics-Native Programming Language",description:"WavelengthScript is a programming language where agents live at spectral Ψ addresses, messages are photon packets, and computation costs are derived from E=hf. Compiles to WNSP bytecode. Step-debug in the WNSP VM.",canonical:"https://wnsp.io/wavelength-lang",ogTitle:"WavelengthScript — The Language the Universe Runs On",ogDescription:"Physics-native language: spectral addresses, photon packets, E=hf fees. Compiles to WNSP bytecode. Browser-native WNSP VM. CE→SE pipeline. AGPL-3.0.",twitterTitle:"WavelengthScript v1.0",twitterDescription:"The language the universe runs on. Agents at spectral addresses. Photon packets. E=hf computation costs. WNSP bytecode."});const[d,b]=j.useState("python"),[f,o]=j.useState(se),[c,w]=j.useState(""),[s,S]=j.useState("spec"),[p,n]=j.useState(""),[i,l]=j.useState(!1),[h,m]=j.useState(I),[x,v]=j.useState("asm"),[u,A]=j.useState(null),[k,C]=j.useState(!1),y=p?g(p):null;function T(){w(U(f,d))}function a(){navigator.clipboard.writeText(c),l(!0),setTimeout(()=>l(!1),1500)}const L=(t,r)=>e.jsx("button",{onClick:()=>S(t),className:`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${s===t?"text-white bg-white/10 border border-white/20":"text-white/30 hover:text-white/60"}`,children:r});return e.jsxs("div",{className:"min-h-screen bg-black text-white flex flex-col",style:{fontFamily:"monospace"},children:[e.jsxs("div",{className:"border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(W,{href:"/nexus-command",children:e.jsx("button",{className:"text-white/30 hover:text-white/60 transition-colors",children:e.jsx(_,{size:15})})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(P,{size:13,className:"text-violet-400"}),e.jsx("span",{className:"text-sm font-bold tracking-wider text-violet-400",children:"WAVELENGTH SCRIPT"}),e.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"})]}),e.jsx("span",{className:"text-white/20 text-[10px]",children:"WLS v1.0 · Code in light · Build AI on the wave · AGPL-3.0"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-violet-400/20 text-violet-400/50",children:"OPEN SPEC"}),e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-emerald-400/20 text-emerald-400/50",children:"FREE FOREVER"})]})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-6 space-y-6",children:[e.jsxs("div",{className:"border border-violet-400/20 rounded-xl p-6",style:{background:"linear-gradient(180deg, rgba(139,0,255,0.06) 0%, rgba(0,0,0,0) 100%)"},children:[e.jsx("div",{className:"h-1.5 rounded-full w-full mb-5",style:{background:"linear-gradient(to right, #8b00ff, #2563eb, #06b6d4, #16a34a, #ca8a04, #ea580c, #dc2626)"}}),e.jsxs("div",{className:"grid grid-cols-2 gap-8",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-violet-400/50 text-[9px] uppercase tracking-widest mb-2",children:"WavelengthScript"}),e.jsx("h1",{className:"text-2xl font-bold text-white mb-3 leading-tight",children:"The first language where every symbol has a physical address in light."}),e.jsx("p",{className:"text-white/40 text-sm leading-relaxed mb-4",children:"Variables live at wavelengths. Functions emit on Ψ channels. AI agents tune to frequencies. Code doesn't run on a CPU — it propagates as a wave. Write in Python, JS, or Rust and let the transpiler map your logic onto the electromagnetic spectrum."}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["Transpiles from Python/JS/Rust","AI agents on Ψ channels","AGPL-3.0 open spec","CE→SE type system"].map(t=>e.jsx("span",{className:"text-[9px] px-2 py-1 rounded-full border border-white/10 text-white/30",children:t},t))})]}),e.jsxs("div",{className:"border border-white/5 rounded-xl p-4",style:{background:"rgba(139,0,255,0.04)"},children:[e.jsx("div",{className:"text-white/20 text-[9px] mb-3 uppercase tracking-widest",children:"Quick encode — any word → its wavelength address"}),e.jsx("input",{className:"w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none placeholder-white/15 focus:border-violet-400/30",placeholder:"Type anything: 'function', 'AI', 'reasoning', 'model'…",value:p,onChange:t=>n(t.target.value),"data-testid":"input-live-encode"}),y?e.jsxs("div",{className:"mt-3 space-y-2",children:[e.jsx("div",{className:"h-2 rounded-full",style:{background:`linear-gradient(to right, ${E(y.nm-30)}, ${E(y.nm)}, ${E(y.nm+30)})`}}),e.jsx("div",{className:"grid grid-cols-2 gap-2",children:[{l:"λ address",v:`${y.nm}nm`,c:E(y.nm)},{l:"Frequency",v:`${y.thz} THz`,c:"#a78bfa"},{l:"Ψ channel",v:y.psi,c:"#06b6d4"},{l:"Band",v:y.band,c:E(y.nm)}].map(({l:t,v:r,c:N})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-2",children:[e.jsx("div",{className:"text-[8px] text-white/25",children:t}),e.jsx("div",{className:"text-[11px] font-bold",style:{color:N},children:r})]},t))}),e.jsxs("div",{className:"text-[9px] text-white/20",children:["In WLS: ",e.jsxs("span",{className:"text-violet-400",children:["@",y.nm,"nm"]}),' is the type prefix for "',p,'" — every instance lives at this wavelength.']})]}):e.jsx("div",{className:"mt-4 text-center text-white/15 text-[10px] py-4",children:"CE→SE encodes any word into a physical wavelength of light. That wavelength becomes the address."})]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[L("spec","Language Spec"),L("transpiler","Transpiler"),L("compiler","Compiler → Bytecode"),L("ai","AI Integration"),L("sdk","SDK — Other Languages")]}),s==="spec"&&e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(q,{size:11})," Type System — Spectral Bands"]}),e.jsxs("p",{className:"text-white/25 text-[11px] leading-relaxed mb-4",children:["In WavelengthScript, every type has a band. Instead of ",e.jsx("code",{className:"text-violet-300",children:"string"})," or ",e.jsx("code",{className:"text-violet-300",children:"int"}),", you declare types by their spectral band. The band determines where data lives, who can access it, and what operations are valid on it."]}),e.jsx("div",{className:"space-y-2",children:V.map(t=>e.jsxs("div",{className:"flex items-start gap-4 border border-white/5 rounded-lg px-4 py-3",style:{background:t.color+"06"},children:[e.jsxs("div",{className:"w-16 flex-shrink-0",children:[e.jsx("div",{className:"text-[9px] font-bold",style:{color:t.color},children:t.band}),e.jsx("div",{className:"text-[8px] text-white/20",children:t.nm})]}),e.jsxs("div",{className:"flex-1",children:[e.jsx("div",{className:"flex flex-wrap gap-1.5 mb-1",children:t.types.map(r=>e.jsxs("code",{className:"text-[9px] px-1.5 py-0.5 rounded border",style:{borderColor:t.color+"30",color:t.color,background:t.color+"0a"},children:["@",Math.floor(380+V.indexOf(t)*57),"nm ",r]},r))}),e.jsx("div",{className:"text-[9px] text-white/25",children:t.desc})]})]},t.band))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(P,{size:11})," Syntax Reference"]}),e.jsx("div",{className:"space-y-3",children:Q.map((t,r)=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-4",style:{background:"rgba(255,255,255,0.015)"},children:[e.jsx("div",{className:"text-[10px] text-white/50 mb-2",children:t.concept}),e.jsx("pre",{className:"text-[10px] text-violet-300 font-mono leading-relaxed mb-2 overflow-x-auto",children:t.wls}),e.jsx("div",{className:"text-[9px] text-white/25",children:t.note})]},r))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("h2",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(z,{size:11})," Core Operators"]}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3",children:[{op:"@{nm}nm",desc:"Type prefix — declares wavelength address of a value or function"},{op:"emit(val)",desc:"Output a value — broadcasts it on the current Ψ channel"},{op:"tune(nm)",desc:"Receive — sets the listener to a specific wavelength band"},{op:"broadcast(Ψ, v)",desc:"Send to a specific Ψ channel — like emit but targeted"},{op:"oscillate(Ψ,f)",desc:"Non-blocking loop at frequency f Hz — the WLS for() equivalent"},{op:"?λ cond:",desc:"Conditional — the WLS if() — resolves to photon path 0 or 1"},{op:"agent.invoke()",desc:"Call a registered AI agent by its Ψ channel address"},{op:"node.register()",desc:"Register this program as a discoverable spectral network node"},{op:"Λ(h, f)",desc:"Lambda Boson — the physical constant hf/c² — core primitive"}].map(({op:t,desc:r})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-3",children:[e.jsx("code",{className:"text-[10px] text-violet-300 block mb-1",children:t}),e.jsx("div",{className:"text-[9px] text-white/25 leading-relaxed",children:r})]},t))})]}),e.jsxs("div",{className:"border border-amber-400/10 rounded-xl p-5 text-center",style:{background:"rgba(251,191,36,0.02)"},children:[e.jsxs("div",{className:"text-amber-400/50 text-[9px] uppercase tracking-widest mb-2 flex items-center justify-center gap-2",children:[e.jsx(D,{size:9})," AGPL-3.0 Open Specification · Free for Every Developer on Earth"]}),e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed max-w-2xl mx-auto",children:"WavelengthScript is a free, open standard. Any company that implements a WLS runtime must publish their code under AGPL-3.0. The CE→SE encoding standard — which underpins the entire type system — is free developer infrastructure. No patent. No licence fee. The address space of light belongs to everyone."})]})]}),s==="transpiler"&&e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"Paste any Python, JavaScript, or Rust code. The transpiler maps every symbol through CE→SE encoding to assign it a physical wavelength address, then rewrites the code in WavelengthScript syntax."}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsx("div",{className:"flex gap-2",children:["python","javascript","rust"].map(t=>e.jsx("button",{onClick:()=>b(t),className:`text-[9px] uppercase px-2 py-1 rounded transition-all ${d===t?"text-violet-300 bg-violet-400/15 border border-violet-400/30":"text-white/25 hover:text-white/50"}`,children:t},t))}),e.jsx("span",{className:"text-white/20 text-[9px]",children:"Source"})]}),e.jsx("textarea",{className:"w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed",rows:22,value:f,onChange:t=>o(t.target.value),placeholder:"Paste your Python, JavaScript, or Rust code here…","data-testid":"textarea-source",spellCheck:!1})]}),e.jsxs("div",{className:"border border-violet-400/20 rounded-xl overflow-hidden",style:{background:"rgba(139,0,255,0.03)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between",children:[e.jsx("span",{className:"text-violet-400/60 text-[9px] uppercase tracking-widest",children:"WavelengthScript Output"}),c&&e.jsxs("button",{onClick:a,className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all",children:[e.jsx(R,{size:9})," ",i?"Copied!":"Copy"]})]}),e.jsx("pre",{className:"p-4 text-[10px] text-violet-200/80 font-mono leading-relaxed overflow-auto h-[22rem] whitespace-pre-wrap",children:c||e.jsx("span",{className:"text-white/15",children:'Click "Transpile →" to convert your code to WavelengthScript…'})})]})]}),e.jsx("div",{className:"flex justify-center",children:e.jsxs("button",{onClick:T,className:"flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all","data-testid":"button-transpile",children:[e.jsx(F,{size:14})," Transpile ",d," → WavelengthScript"]})})]}),s==="compiler"&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"text-white/25 text-[11px] leading-relaxed",children:["Write WavelengthScript source and compile it to ",e.jsx("span",{className:"text-violet-300",children:"WNSP bytecode"})," — machine instructions that target Ψ channels directly. Each opcode carries a wavelength operand: the CPU is the electromagnetic spectrum, registers are spectral channels."]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx("span",{className:"text-white/20 text-[9px] uppercase tracking-widest mr-1",children:"Load sample:"}),[{label:"AI Agent",src:I,col:"#a78bfa"},{label:"Governance Vote",src:J,col:"#2563eb"},{label:"P2P Transfer",src:Y,col:"#06b6d4"},{label:"Spectral Wallet",src:X,col:"#ca8a04"}].map(({label:t,src:r,col:N})=>e.jsx("button",{onClick:()=>{m(r),A(null)},className:"text-[9px] px-2.5 py-1 rounded-full border transition-all hover:opacity-90",style:{borderColor:N+"40",color:N,background:N+"10"},"data-testid":`button-sample-${t.toLowerCase().replace(/\s+/g,"-")}`,children:t},t))]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-white/5 flex items-center justify-between",children:[e.jsx("span",{className:"text-white/40 text-[9px] uppercase tracking-widest",children:"WavelengthScript Source"}),e.jsx("span",{className:"text-[8px] text-violet-400/40",children:"WLS v1.0"})]}),e.jsx("textarea",{className:"w-full bg-transparent p-4 text-[11px] text-white/70 outline-none resize-none font-mono leading-relaxed",rows:22,value:h,onChange:t=>m(t.target.value),placeholder:"Write WavelengthScript here…","data-testid":"textarea-compiler-source",spellCheck:!1})]}),e.jsxs("div",{className:"border border-violet-400/20 rounded-xl overflow-hidden flex flex-col",style:{background:"rgba(139,0,255,0.03)"},children:[e.jsxs("div",{className:"px-4 py-2.5 border-b border-violet-400/10 flex items-center justify-between flex-shrink-0",children:[e.jsx("div",{className:"flex gap-1",children:["asm","hex","manifest"].map(t=>e.jsx("button",{onClick:()=>v(t),className:`text-[9px] uppercase px-2 py-1 rounded transition-all ${x===t?"text-violet-300 bg-violet-400/15 border border-violet-400/30":"text-white/25 hover:text-white/50"}`,"data-testid":`button-view-${t}`,children:t==="asm"?"Assembly":t==="hex"?"Hex Dump":"Manifest"},t))}),u&&e.jsxs("button",{onClick:()=>{const t=x==="asm"?u.assembly:x==="hex"?u.hex:u.manifest.map(r=>`${r.symbol} → ${r.nm}nm ${r.psi} [${r.band}]`).join(`
`);navigator.clipboard.writeText(t),C(!0),setTimeout(()=>C(!1),1500)},className:"flex items-center gap-1 text-[9px] text-white/30 hover:text-white/60 transition-all",children:[e.jsx(R,{size:9})," ",k?"Copied!":"Copy"]})]}),e.jsx("div",{className:"flex-1 overflow-auto",children:u?x==="asm"?e.jsx("pre",{className:"p-4 text-[9.5px] text-violet-200/80 font-mono leading-relaxed whitespace-pre",children:u.assembly}):x==="hex"?e.jsx("pre",{className:"p-4 text-[9.5px] text-emerald-300/70 font-mono leading-relaxed whitespace-pre",children:u.hex}):e.jsx("div",{className:"p-4 space-y-2",children:u.manifest.length===0?e.jsx("div",{className:"text-white/20 text-[10px]",children:"No named symbols found."}):u.manifest.map(t=>{const r=E(t.nm);return e.jsxs("div",{className:"flex items-center gap-3 border border-white/5 rounded-lg px-3 py-2",style:{background:r+"06"},children:[e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:r}}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("div",{className:"text-[10px] font-bold truncate",style:{color:r},children:t.symbol}),e.jsx("div",{className:"text-[8px] text-white/30",children:t.psi})]}),e.jsxs("div",{className:"text-right flex-shrink-0",children:[e.jsxs("div",{className:"text-[10px] font-bold",style:{color:r},children:[t.nm,"nm"]}),e.jsx("div",{className:"text-[8px] px-1 rounded",style:{background:r+"20",color:r},children:t.band})]})]},t.symbol)})}):e.jsx("div",{className:"p-4 text-white/15 text-[10px] text-center py-16",children:'Click "Compile → Bytecode" to emit WNSP instructions'})})]})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("button",{onClick:()=>A(Z(h)),className:"flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-400/40 text-violet-400 font-bold text-sm hover:border-violet-400/70 hover:bg-violet-400/05 transition-all","data-testid":"button-compile",children:[e.jsx(O,{size:14})," Compile → WNSP Bytecode"]}),u&&e.jsxs("div",{className:"flex items-center gap-6 text-[10px] text-white/30",children:[e.jsxs("span",{children:[e.jsx("span",{className:"text-violet-400 font-bold",children:u.instrCount})," instructions"]}),e.jsxs("span",{children:[e.jsx("span",{className:"text-cyan-400 font-bold",children:u.manifest.length})," Ψ channels"]}),e.jsx("span",{className:"text-white/15",children:"· targeting spectral execution model"})]})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsx("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4",children:"WNSP Opcode Reference"}),e.jsx("div",{className:"grid grid-cols-3 md:grid-cols-4 gap-2",children:[{op:"01 TUNE",desc:"Set receiver to λ",col:"#06b6d4"},{op:"02 PUSH",desc:"Bind value at wavelength",col:"#a78bfa"},{op:"03 EMIT",desc:"Broadcast on Ψ channel",col:"#f59e0b"},{op:"05 BROAD",desc:"Band-wide broadcast",col:"#f97316"},{op:"06 OCS",desc:"Oscillate — wave loop",col:"#16a34a"},{op:"07 LABEL",desc:"Function address in Ψ",col:"#8b00ff"},{op:"08 JMPZ",desc:"Conditional photon branch",col:"#dc2626"},{op:"0A AGENT",desc:"Register spectral agent",col:"#0ea5e9"},{op:"0B EXEC",desc:"Generic spectral exec",col:"#6b7280"},{op:"FE RET",desc:"Scope end — wave collapses",col:"#4b5563"},{op:"FF HALT",desc:"Wavefunction terminated",col:"#374151"}].map(({op:t,desc:r,col:N})=>e.jsxs("div",{className:"border border-white/5 rounded-lg p-2.5",children:[e.jsx("code",{className:"text-[9px] font-bold block mb-1",style:{color:N},children:t}),e.jsx("div",{className:"text-[8px] text-white/30 leading-relaxed",children:r})]},t))})]})]}),s==="ai"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"AI agents in WavelengthScript are not processes — they are nodes on the spectral network. Each agent registers at its CE→SE wavelength. Other agents or humans discover and interact with it by tuning to that band. The agent's name IS its address."}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(O,{size:11})," Standard AI Agent Architecture on the Wave"]}),e.jsx("div",{className:"grid grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden",children:[{step:"1. Define",code:`agent = Agent(
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
  // → 541nm broadcast`,color:"#8b00ff"}].map(({step:t,code:r,color:N})=>e.jsxs("div",{className:"p-4 bg-black/60",children:[e.jsx("div",{className:"text-[9px] font-bold mb-2",style:{color:N},children:t}),e.jsx("pre",{className:"text-[9px] text-white/50 leading-relaxed overflow-x-auto",children:r})]},t))})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(B,{size:11})," Recommended AI Agent Channels"]}),e.jsx("div",{className:"text-white/20 text-[9px] mb-4",children:"These are suggested standard channels for common AI functions. Register your agent at these frequencies so other systems know where to find it."}),e.jsx("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-3",children:ee.map(t=>{const r=E(t.nm);return e.jsxs("div",{className:"border rounded-xl p-4",style:{borderColor:r+"25",background:r+"06"},children:[e.jsx("div",{className:"text-[10px] font-bold mb-1",style:{color:r},children:t.agent}),e.jsxs("div",{className:"flex gap-1.5 mb-2 flex-wrap",children:[e.jsxs("span",{className:"text-[8px] px-1.5 py-0.5 rounded border",style:{borderColor:r+"30",color:r},children:[t.nm,"nm"]}),e.jsx("span",{className:"text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-white/30",children:t.psi})]}),e.jsx("div",{className:"text-[9px] text-white/30",children:t.role})]},t.agent)})})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(P,{size:11})," Complete WLS AI Agent — WavelengthScript Native"]}),e.jsx("pre",{className:"text-[10px] text-violet-200/80 leading-relaxed overflow-x-auto p-4 rounded-xl border border-violet-400/10",style:{background:"rgba(139,0,255,0.04)"},children:`// WavelengthScript v1.0 · AGPL-3.0
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
`})]})]}),s==="sdk"&&e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-white/25 text-[11px] leading-relaxed",children:"You don't need to rewrite everything in WavelengthScript. The SDK lets you call NexusOS from your existing Python, JavaScript, or Rust codebase. Your code gains spectral addressing, agent registration, and Ψ channel messaging without changing your language."}),e.jsx("div",{className:"grid grid-cols-1 gap-4",children:te.map(t=>e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-5 py-3 border-b border-white/5 flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(P,{size:11,className:"text-violet-400/60"}),e.jsx("span",{className:"text-[11px] font-bold text-violet-300",children:t.lang})]}),e.jsx("span",{className:"text-white/20 text-[9px]",children:t.desc})]}),e.jsx("pre",{className:"p-5 text-[10px] text-white/60 leading-relaxed overflow-x-auto font-mono",children:t.snippet})]},t.lang))}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-5",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/30 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2",children:[e.jsx(H,{size:11})," SDK Method Reference"]}),e.jsx("div",{className:"overflow-x-auto",children:e.jsxs("table",{className:"w-full text-[10px]",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-white/5",children:[e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"Method"}),e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"Python"}),e.jsx("th",{className:"text-left text-white/25 py-2 pr-4 font-normal",children:"JavaScript"}),e.jsx("th",{className:"text-left text-white/25 py-2 font-normal",children:"What it does"})]})}),e.jsx("tbody",{className:"divide-y divide-white/5",children:[{m:"Register agent",py:"Agent(name, band)",js:"new Agent({name,wavelength})",desc:"Create & register a node on the spectral network"},{m:"Listen for signals",py:"@on_signal(psi)",js:"agent.on('signal', fn)",desc:"Subscribe to a Ψ channel — fires on every emit to that channel"},{m:"Emit output",py:"agent.emit(result)",js:"agent.emit(result)",desc:"Broadcast your output to the channel at your wavelength"},{m:"CE→SE encode",py:"nexusos.encode(text)",js:"NexusOS.encode(text)",desc:"Get the wavelength address for any word or phrase"},{m:"Query nodes",py:"nexusos.nodes(band)",js:"NexusOS.nodes(band)",desc:"List all nodes visible in a given spectral band"},{m:"Send message",py:"nexusos.send(psi, msg)",js:"NexusOS.send(psi, msg)",desc:"Send a message to any Ψ channel"},{m:"Tune (receive)",py:"nexusos.tune(nm)",js:"NexusOS.tune(nm)",desc:"Start listening at a specific wavelength"}].map(({m:t,py:r,js:N,desc:M})=>e.jsxs("tr",{children:[e.jsx("td",{className:"py-2 pr-4 text-white/50 font-semibold",children:t}),e.jsx("td",{className:"py-2 pr-4",children:e.jsx("code",{className:"text-violet-300",children:r})}),e.jsx("td",{className:"py-2 pr-4",children:e.jsx("code",{className:"text-cyan-300",children:N})}),e.jsx("td",{className:"py-2 text-white/25",children:M})]},t))})]})})]}),e.jsxs("div",{className:"border border-emerald-400/15 rounded-xl p-5 flex items-center justify-between",style:{background:"rgba(74,222,128,0.03)"},children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-emerald-400/70 text-[10px] font-bold uppercase tracking-widest mb-1",children:"Register your agent as a network node"}),e.jsx("div",{className:"text-white/25 text-[10px]",children:"Once your agent is running, register it on the Spectral Network so other agents and humans can discover it by tuning to its wavelength."})]}),e.jsx(W,{href:"/network",children:e.jsxs("button",{className:"flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400 hover:border-emerald-400/50 transition-all text-[10px] font-bold flex-shrink-0 ml-4","data-testid":"button-goto-network",children:["Open Network ",e.jsx(K,{size:11})]})})]}),e.jsxs("div",{className:"text-center space-y-1",children:[e.jsx("div",{className:"text-white/20 text-[9px] uppercase tracking-widest",children:"AGPL-3.0 · Specification published April 2026"}),e.jsx("div",{className:"text-white/15 text-[9px]",children:"The WavelengthScript specification, CE→SE encoding standard, and all NexusOS SDKs are free, open infrastructure. Every implementation must publish source. The address space of light belongs to all civilisations."})]})]})]})]})}export{he as default};
