import{a as N,j as e}from"./vendor-react-Dbq4-fkY.js";import{u as M}from"./use-page-meta-BCnBVlPQ.js";import{L as U}from"./vendor-router-BNSZfxZx.js";import{R as q}from"./spectral-visuals-DNKRW39c.js";import{f as B,b as G,Q as O,bW as F,ap as _,ae as D,K as Z,R as J,Z as K,J as X}from"./vendor-icons-tQz67XEL.js";function f(o){return o<450?"#8b00ff":o<495?"#2563eb":o<520?"#06b6d4":o<565?"#16a34a":o<590?"#ca8a04":o<625?"#ea580c":"#dc2626"}function j(o){return o<450?"SYSTEM":o<495?"AUTH":o<520?"STREAM":o<565?"LOGIC":o<590?"INTERFACE":o<625?"EVENT":"STORAGE"}function b(o){const h=o.toUpperCase().split("").map(r=>r.charCodeAt(0)).filter(r=>r>=32&&r<=126);h.length||h.push(77);const m=h.reduce((r,l)=>r+l,0)/h.length,n=parseFloat((380+(m-32)/94*400).toFixed(2)),s=Math.floor((n-380)/4)+1,a=h.reduce((r,l)=>r+l,0)%50,i=h.length%2===0?"H":"V";return{nm:n,psi:`Ψ(${s},${a},${i})`,band:j(n)}}function Y(o){if(!o.trim())return[];const h=[];let m=0;function n(s,a,i,r,l,p,u){h.push({off:m,op:s,mnem:a,args:i,nm:l,ch:p,cmt:r,...u}),s!==0&&(m+=8)}for(const s of o.split(`
`)){const a=s.trim();if(!a||a.startsWith("//")||a.startsWith(";")||a.startsWith("#"))continue;const i=a.match(/GATE\(load\s*>\s*(\d+)\s*→\s*(\d+\.?\d*)nm\s*:\s*(\d+\.?\d*)nm\)/);if(i){const t=parseInt(i[1]),c=parseFloat(i[2]),x=parseFloat(i[3]);n(9,"GATE",`load>${t} → ${c}nm : ${x}nm`,`nonlinear switch · threshold at load=${t}`,void 0,void 0,{gateThreshold:t,gateHigh:c,gateLow:x});continue}const r=a.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);if(r){n(3,"EMIT",`λ=${r[1]}nm  ${r[2]}`,`emit on ${j(parseFloat(r[1]))} band`,parseFloat(r[1]),r[2]);continue}const l=a.match(/tune\((\d+\.?\d*)nm\)/);if(l){n(1,"TUNE",`λ=${l[1]}nm`,`receiver → ${j(parseFloat(l[1]))} band`,parseFloat(l[1]));continue}const p=a.match(/^agent\s+(\w+)/);if(p){const t=b(p[1]);n(10,"AGENT",`"${p[1]}"  ${t.psi}`,`AI agent λ=${t.nm}nm`,t.nm,t.psi);continue}const u=a.match(/^fn\s+(\w+)/);if(u){const t=b(u[1]);n(7,"LABEL",`${u[1]}  ${t.psi}`,`fn → λ=${t.nm}nm`,t.nm,t.psi);continue}const T=a.match(/node\.register\("([^"]+)"/);if(T){const t=b(T[1]);n(10,"AGENT",`"${T[1]}"  ${t.psi}  PUBLIC`,"spectral network node",t.nm,t.psi);continue}const g=a.match(/oscillate\(([^)]+)\)/);if(g){n(6,"OCS",g[1].trim(),"non-blocking wave loop");continue}const k=a.match(/broadcast\(([^)]+)\)/);if(k){const t=b(k[1].replace(/[^a-zA-Z]/g,"")||"data");n(5,"BROAD",k[1].trim(),`broadcast λ=${t.nm}nm`,t.nm);continue}const v=a.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);if(v){n(2,"PUSH",`@${v[1]}nm  "${v[2]}"`,`bind at λ=${v[1]}nm`,parseFloat(v[1]));continue}const A=a.match(/^\s*emit\s+(.+)/);if(A){const t=b(A[1].replace(/[^a-zA-Z]/g,"")||"out");n(3,"EMIT",A[1].trim(),`â† create quantum · λ=${t.nm}nm`,t.nm,void 0,{qSym:"â†"});continue}const C=a.match(/^\s*(?:channel|field)\s+(\w+)\s*(?::=|=)\s*(.*)/);if(C){const t=b(C[1]);n(2,"PUSH",`"${C[1]}"  |0⟩  ${t.psi}`,`â†|0⟩: initialise Fock vacuum at λ=${t.nm}nm`,t.nm,t.psi,{qSym:"|0⟩"});continue}const E=a.match(/^\s*absorb\s*\(?(.+?)\)?$/);if(E){const t=b(E[1].replace(/[^a-zA-Z]/g,"")||"ch");n(12,"ANNIH",E[1].trim(),`â annihilate · λ=${t.nm}nm`,t.nm,void 0,{qSym:"â"});continue}const $=a.match(/^\s*(?:\w+\s*:=\s*)?observe\s*\(?(.+?)\)?$/);if($){const t=b($[1].replace(/[^a-zA-Z]/g,"")||"ch");n(13,"NHAT",$[1].trim(),`n̂ = â†â · measure occupation · λ=${t.nm}nm`,t.nm,void 0,{qSym:"n̂"});continue}const d=a.match(/^\s*collapse\s*\(?(.+?)\)?$/);if(d){const t=b(d[1].replace(/[^a-zA-Z]/g,"")||"ch");n(14,"COLL",d[1].trim(),`collapse |n⟩ → classical value · λ=${t.nm}nm`,t.nm,void 0,{qSym:"⟨n|"});continue}const y=a.match(/^\s*entangle\s*\((.+?),\s*(.+?)\)/);if(y){const t=b(y[1]);n(15,"ENTGL",`${y[1]} ⊗ ${y[2]}`,`|Φ⁺⟩=(|00⟩+|11⟩)/√2 · λ=${t.nm}nm`,t.nm,t.psi,{qSym:"|Φ⁺⟩"});continue}if(a.match(/^\s*resonate\s+when\b/)){n(8,"JMPZ",a.replace(/^\s*resonate\s+when\s+/,"").trim(),"photon path branch · resonance condition",void 0,void 0,{qSym:"?λ"});continue}if(a.match(/^\s*propagate\s+over\b/)){n(6,"OCS",a.replace(/^\s*propagate\s+over\s+/,"").trim(),"non-blocking wave propagation",void 0,void 0,{qSym:"∿"});continue}if(a.startsWith("∿"))continue;if(a.startsWith("?λ ")){n(8,"JMPZ",a.slice(3).trim(),"photon path branch");continue}if(a==="}"||a.match(/^end\b/)){n(254,"RET","","scope end — wave collapses");continue}const R=a.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op",L=b(R);n(11,"EXEC",`@${L.nm}nm`,a.slice(0,60),L.nm)}return n(255,"HALT","","wavefunction terminated"),h}function P(){return{pc:0,registers:[],agents:[],output:[],tuned:520,halted:!1,cycleCount:0}}function I(o,h,m){if(o.halted||o.pc>=h.length)return{...o,halted:!0};const n=h[o.pc],s={...o,pc:o.pc+1,cycleCount:o.cycleCount+1};switch(s.registers=[...o.registers],s.agents=[...o.agents],s.output=[...o.output],n.op){case 1:s.tuned=n.nm??s.tuned,s.output.push({text:`TUNE → ${n.nm}nm  [${j(n.nm??s.tuned)}]`,nm:n.nm,type:"sys"});break;case 2:{s.registers=[...s.registers.filter(r=>r.nm!==(n.nm??s.tuned))];const a=n.args.match(/"([^"]+)"/)?.[1]??"val",i=n.qSym==="|0⟩";s.registers.push({nm:n.nm??s.tuned,name:a,value:`@${n.nm}nm`,band:j(n.nm??s.tuned),fockN:0}),s.output.push({text:i?`PUSH "${a}"  |0⟩ ← vacuum initialised  @${n.nm}nm`:`PUSH "${a}" → register @${n.nm}nm`,nm:n.nm,type:"sys"});break}case 3:{const a=n.nm??s.tuned;s.registers=s.registers.map(r=>r.nm===a?{...r,fockN:r.fockN+1}:r);const i=s.registers.find(r=>r.nm===a);s.output.push({text:`â†  EMIT  ${n.args}  ${i?`|${i.fockN-1}⟩→|${i.fockN}⟩`:""}`,nm:n.nm,type:"emit"});break}case 12:{const a=n.nm??s.tuned,i=s.registers.find(r=>r.nm===a);if(i&&i.fockN>0){s.registers=s.registers.map(l=>l.nm===a?{...l,fockN:Math.max(0,l.fockN-1)}:l);const r=s.registers.find(l=>l.nm===a);s.output.push({text:`â   ANNIH  ${n.args}  |${i.fockN}⟩→|${r?.fockN??0}⟩  value absorbed`,nm:n.nm,type:"annih"})}else s.output.push({text:`â   ANNIH  ${n.args}  â|0⟩ = 0  (vacuum — nothing to absorb)`,nm:n.nm,type:"annih"});break}case 13:{const a=n.nm??s.tuned,r=s.registers.find(l=>l.nm===a)?.fockN??0;s.output.push({text:`n̂   NHAT  ${n.args}  n̂|${r}⟩ = ${r}·|${r}⟩  (state preserved)`,nm:n.nm,type:"nhat"});break}case 14:{const a=n.nm??s.tuned,r=s.registers.find(l=>l.nm===a)?.fockN??0;s.registers=s.registers.map(l=>l.nm===a?{...l,fockN:0}:l),s.output.push({text:`⟨n| COLL  ${n.args}  |${r}⟩ → classical ${r}  (wavefunction collapsed)`,nm:n.nm,type:"coll"});break}case 15:{s.output.push({text:`|Φ⁺⟩ ENTGL  ${n.args}  (|00⟩+|11⟩)/√2  Bell state created`,nm:n.nm,type:"entgl"});break}case 4:s.output.push({text:"PHASE shift applied → channel coherence updated",type:"sys"});break;case 5:s.output.push({text:`[BROAD] → ${n.args}`,nm:n.nm,type:"broad"});break;case 6:s.output.push({text:`OCS oscillate(${n.args})  [non-blocking wave loop]`,type:"sys"});break;case 7:s.output.push({text:`LABEL fn ${n.args}  [${n.cmt}]`,nm:n.nm,type:"sys"});break;case 8:s.output.push({text:`?λ ${n.args}  [photon branch evaluated]`,type:"sys"});break;case 9:{const a=n.gateThreshold??5,i=n.gateHigh??468,r=n.gateLow??648,l=m>a,p=l?i:r,u=j(p);s.gateResult={routed:p,band:u,load:m,threshold:a},s.output.push({text:`GATE  load=${m} ${l?">":"≤"} ${a}  →  ${p}nm [${u}]  ${l?"HIGH-LOAD PATH":"LOW-LOAD PATH"}`,nm:p,type:"gate"}),s.output.push({text:"      same ψ_in · different load · different output · this is computation",nm:p,type:"proof"});break}case 10:{const a=n.args.match(/"([^"]+)"/)?.[1]??"agent";s.agents.find(i=>i.name===a)||s.agents.push({name:a,nm:n.nm??s.tuned,psi:n.ch??"Ψ(0,0,H)",status:"ACTIVE"}),s.output.push({text:`AGENT "${a}" registered at ${n.ch}  λ=${n.nm}nm`,nm:n.nm,type:"agent"});break}case 11:s.output.push({text:`EXEC ${n.args.slice(0,60)}`,nm:n.nm,type:"sys"});break;case 254:s.output.push({text:"RET  [wave collapses — scope end]",type:"sys"});break;case 255:s.output.push({text:`HALT  [wavefunction terminated · ${s.cycleCount} cycles]`,type:"sys"}),s.halted=!0;break}return s}const W=`// COMPUTATION PROOF v1.0
// Claim: same ψ_in, different channel state → different output
// This cannot be achieved by lookup or linear filtering.
//
// Three requirements demonstrated:
//   1. State-dependent output   (GATE reads live channelLoad)
//   2. Non-commutative T        (PUSH then GATE ≠ GATE then PUSH)
//   3. Nonlinearity             (threshold switch — not linear filter)

tune(520nm)

// Bind identical probe signal at LOGIC band
// ψ_in is the same every time — "birdsong" at 520nm
@520nm let ψ_in := probe("birdsong", @520nm)
emit ψ_in

// GATE: nonlinear threshold on channel load
// High load (>5): route to AUTH band  — higher authority, higher energy
// Low load  (≤5): route to STORAGE   — lower authority, lower energy
// Adjust the Channel Load slider to see output diverge
GATE(load > 5 → 468nm : 648nm)

// T1: compress result into authority register
@468nm let auth_path   := AuthBand.compress(ψ_in)
// T2: expand result into storage register
@648nm let store_path  := StorageBand.expand(ψ_in)

// Non-commutativity proof:
// compress(expand(ψ)) ≠ expand(compress(ψ))
// AUTH→STORAGE path ≠ STORAGE→AUTH path
emit auth_path
emit store_path`,V=[{label:"AI Agent",color:"#a78bfa",src:`tune(540nm)

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

node.register("ReasoningCore", @541.2nm)`},{label:"Governance Vote",color:"#2563eb",src:`tune(468nm)

@emit(469.4nm, Ψ(23,44,V))
fn submitProposal(param, newValue, proposerKey) {
  @468nm let proposal := GovernanceRegistry.create()
  emit proposal.id
}

@emit(471.0nm, Ψ(24,0,V))
fn castVote(proposalId, voteYes, voterKey) {
  @468nm let voter  := TrustLayer.verify(voterKey)
  @540nm let weight := SpectralAuth.bandWeight(voter.band)
  @648nm let record := VoteStore.append(proposalId, voteYes, weight)
  emit record
}`},{label:"P2P Transfer",color:"#06b6d4",src:`tune(501nm)

@emit(501.7nm, Ψ(31,17,V))
agent StreamParser {
  @501nm pipeline := ChunkEngine.new(size=512)
  @648nm store    := VectorStore.new()

  oscillate(Ψ(31,17,V), 0Hz) {
    @501nm let chunk   := tune(Ψ(31,17,V))
    @648nm let written := store.append(chunk.data, chunk.seq)
    broadcast(written.ack)
  }
}

node.register("StreamParser", @501.7nm)`},{label:"Spectral Wallet",color:"#ca8a04",src:`tune(468nm)

@emit(468.3nm, Ψ(23,83,V))
agent TrustLayer {
  @648nm ledger  := SpectralDB.connect("transactions")
  @468nm session := SessionStore.new()

  oscillate(Ψ(23,83,V), 0Hz) {
    @468nm let fee := PhysicsEngine.calcFee(req.sender.nm, req.amount)
    @648nm let tx  := ledger.write({ from: req.sender.psi, to: req.recipient.psi, amount: req.amount, fee })
    broadcast(tx)
  }
}

node.register("TrustLayer", @468.3nm)`},{label:"Computation Proof",color:"#10b981",src:W},{label:"Fock State — â†â",color:"#f59e0b",src:`∿ WLS v2.0 — Fock state execution model
∿ [â,â†]=1 · vacuum |0⟩ is the starting state of every channel
∿ emit = â† (creation)   absorb = â (annihilation)   observe = n̂ = â†â

∿ Declare channels — initialise each to vacuum |0⟩
channel sender   := |0⟩      ∿ AUTH band  468nm
channel receiver := |0⟩      ∿ AUTH band  471nm
channel fee      := |0⟩      ∿ LOGIC band 541nm

∿ Load 5 quanta into sender (apply â† five times)
emit sender
emit sender
emit sender
emit sender
emit sender

∿ Observe occupation without destroying — n̂|5⟩ = 5·|5⟩
observe(sender)

∿ Transfer 3 quanta: absorb from sender, emit into receiver
absorb(sender)
absorb(sender)
absorb(sender)
emit receiver
emit receiver
emit receiver

∿ Observe final states
observe(sender)
observe(receiver)

∿ Deduct 1 quantum for fee
absorb(sender)
emit fee
observe(fee)

∿ Collapse fee channel to classical value
collapse(fee)`}];function ae(){M({title:"WNSP Virtual Machine — Browser-Native Bytecode Interpreter",description:"The WNSP VM is a browser-native bytecode interpreter for WavelengthScript. Execute instructions step-by-step with each Ψ channel acting as a spectral register. No installation required.",canonical:"https://wnsp.io/wnsp-vm",ogTitle:"WNSP VM — Browser-Native Bytecode Interpreter",ogDescription:"Step-through WavelengthScript bytecode in your browser. Ψ channel registers. Physics-enforced execution. Run CE→SE pipeline output directly.",twitterTitle:"WNSP Virtual Machine",twitterDescription:"Browser-native WNSP bytecode interpreter. Ψ registers. Step-debug WavelengthScript programs. No install."});const[o,h]=N.useState(V[0].src),[m,n]=N.useState([]),[s,a]=N.useState(P()),[i,r]=N.useState(!1),[l,p]=N.useState(!1),[u,T]=N.useState(3),g=N.useRef(!1),k=N.useRef(null),v=o===W;function A(){const t=Y(o);n(t),a(P()),r(!0),p(!1),g.current=!1}function C(t,c){const w=I(s,m,u);return a(w),setTimeout(()=>k.current?.scrollTo({top:99999,behavior:"smooth"}),50),w}async function E(){if(!i)return;g.current=!0,p(!0);let t=s;const c=m;for(;!t.halted&&t.pc<c.length&&g.current;)t=I(t,c,u),a({...t}),await new Promise(x=>setTimeout(x,60));p(!1),g.current=!1}function $(){a(P()),g.current=!1,p(!1)}const d=i?m[s.pc]:null,y={TUNE:"#06b6d4",PUSH:"#a78bfa",EMIT:"#f59e0b",BROAD:"#f97316",OCS:"#16a34a",LABEL:"#8b00ff",JMPZ:"#dc2626",AGENT:"#0ea5e9",GATE:"#10b981",EXEC:"#6b7280",RET:"#4b5563",HALT:"#374151",ANNIH:"#06b6d4",NHAT:"#10b981",COLL:"#e879f9",ENTGL:"#f43f5e"},R=u>5?"#10b981":"#ca8a04",L=u>5?"HIGH → AUTH band (468nm)":"LOW → STORAGE band (648nm)";return e.jsxs("div",{className:"min-h-screen bg-black text-white flex flex-col",style:{fontFamily:"monospace"},children:[e.jsxs("div",{className:"border-b border-white/10 px-6 py-4 flex items-center justify-between flex-shrink-0",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(U,{href:"/nexus-command",children:e.jsx("button",{className:"text-white/30 hover:text-white/60 transition-colors","aria-label":"Back to Nexus Command",children:e.jsx(B,{size:15})})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(G,{size:13,className:"text-violet-400"}),e.jsx("h1",{className:"text-sm font-bold tracking-wider text-violet-400",children:"WNSP Virtual Machine"}),e.jsx("div",{className:"w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"})]}),e.jsx("span",{className:"text-white/20 text-[10px]",children:"Execute WavelengthScript bytecode · Ψ channels as Fock registers · [â,â†]=1 execution model"})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[i&&!s.halted&&e.jsxs("span",{className:"text-[8px] px-2 py-1 rounded border border-emerald-400/30 text-emerald-400/60",children:["PC: ",s.pc,"/",m.length]}),s.halted&&e.jsxs("span",{className:"text-[8px] px-2 py-1 rounded border border-amber-400/30 text-amber-400/60",children:["HALTED · ",s.cycleCount," cycles"]}),l&&e.jsx("span",{className:"text-[8px] px-2 py-1 rounded border border-cyan-400/30 text-cyan-400/60 animate-pulse",children:"EXECUTING…"})]})]}),e.jsxs("div",{className:"flex-1 overflow-hidden flex flex-col p-4 gap-4",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx("span",{className:"text-white/20 text-[9px] uppercase tracking-widest",children:"Load program:"}),V.map(t=>e.jsx("button",{onClick:()=>{h(t.src),n([]),a(P()),r(!1)},className:"text-[9px] px-2.5 py-1 rounded-full border transition-all",style:{borderColor:t.color+"40",color:t.color,background:t.color+"10"},"data-testid":`button-sample-${t.label.toLowerCase().replace(/\s+/g,"-")}`,children:t.label},t.label))]}),v&&e.jsxs("div",{className:"border border-emerald-400/20 rounded-xl px-4 py-3 flex items-center gap-6 flex-shrink-0",style:{background:"rgba(16,185,129,0.04)"},children:[e.jsxs("div",{className:"flex items-center gap-2 flex-shrink-0",children:[e.jsx(O,{size:11,className:"text-emerald-400"}),e.jsx("span",{className:"text-emerald-400 text-[9px] uppercase tracking-widest font-bold",children:"Computation Proof"})]}),e.jsxs("div",{className:"flex items-center gap-3 flex-1",children:[e.jsx("span",{className:"text-white/40 text-[9px] flex-shrink-0",children:"Channel Load:"}),e.jsx("input",{type:"range",min:0,max:10,step:1,value:u,onChange:t=>{T(parseInt(t.target.value)),i&&$()},className:"flex-1 accent-emerald-400","data-testid":"slider-channel-load"}),e.jsxs("span",{className:"font-bold text-[11px] flex-shrink-0",style:{color:R},children:[u,"/10"]})]}),e.jsx("div",{className:"text-[9px] flex-shrink-0",style:{color:R},children:L}),e.jsx("div",{className:"text-white/20 text-[8px] flex-shrink-0",children:"Same ψ_in · vary load · watch output diverge"})]}),e.jsxs("div",{className:"flex-1 overflow-hidden grid grid-cols-5 gap-4 min-h-0",children:[e.jsxs("div",{className:"col-span-2 flex flex-col gap-3 min-h-0",children:[e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0",children:[e.jsx("span",{className:"text-white/30 text-[9px] uppercase tracking-widest",children:"WavelengthScript Source"}),e.jsxs("button",{onClick:A,className:"flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-lg border border-violet-400/40 text-violet-400 hover:border-violet-400/70 transition-all",children:[e.jsx(G,{size:9})," Compile & Load"]})]}),e.jsx("textarea",{className:"flex-1 bg-transparent p-3 text-[10px] text-white/70 outline-none resize-none font-mono leading-relaxed min-h-0",value:o,onChange:t=>{h(t.target.value),r(!1)},spellCheck:!1,"data-testid":"textarea-vm-source"})]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:()=>C(),disabled:!i||s.halted,className:"flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-400/40 text-cyan-400 text-[10px] font-bold hover:border-cyan-400/70 disabled:opacity-30 transition-all","data-testid":"button-vm-step",children:[e.jsx(F,{size:11})," Step"]}),e.jsxs("button",{onClick:E,disabled:!i||s.halted||l,className:"flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-400/40 text-emerald-400 text-[10px] font-bold hover:border-emerald-400/70 disabled:opacity-30 transition-all","data-testid":"button-vm-run",children:[e.jsx(_,{size:11})," ",l?"Running…":"Run All"]}),e.jsxs("button",{onClick:$,className:"flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-white/40 text-[10px] hover:text-white/60 transition-all","data-testid":"button-vm-reset",children:[e.jsx(D,{size:11})," Reset"]})]}),o.trim()&&e.jsx("div",{className:"overflow-hidden",children:e.jsx(q,{text:o.slice(0,80),title:"Source Spectral Grid",showWavelengthData:!1})}),v&&s.gateResult&&e.jsxs("div",{className:"border rounded-xl p-3 space-y-2",style:{borderColor:f(s.gateResult.routed)+"40",background:f(s.gateResult.routed)+"08"},children:[e.jsxs("div",{className:"text-[9px] uppercase tracking-widest text-white/30 mb-1 flex items-center gap-1",children:[e.jsx(O,{size:9})," Gate Decision"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-2 h-2 rounded-full",style:{background:f(s.gateResult.routed)}}),e.jsxs("span",{className:"text-[10px] font-bold",style:{color:f(s.gateResult.routed)},children:[s.gateResult.routed,"nm · ",s.gateResult.band]})]}),e.jsxs("div",{className:"text-[9px] text-white/40",children:["load=",s.gateResult.load," ",s.gateResult.load>s.gateResult.threshold?">":"≤"," threshold=",s.gateResult.threshold]}),e.jsxs("div",{className:"text-[8px] text-white/25 border-t border-white/5 pt-2 mt-1",children:["Identical ψ_in. Channel load changed. Output diverged.",e.jsx("br",{}),"A lookup returns the same value. This did not."]})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-3",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/25 text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1",children:[e.jsx(Z,{size:9})," Fock Registers (",s.registers.length,")"]}),s.registers.length===0?e.jsx("div",{className:"text-white/15 text-[9px]",children:"No registers bound — vacuum |0,0,…⟩"}):e.jsx("div",{className:"space-y-1.5 max-h-36 overflow-y-auto",children:s.registers.map(t=>{const c=f(t.nm),x=Math.min(t.fockN,6);return e.jsxs("div",{className:"flex items-center gap-2 text-[9px]",children:[e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:c}}),e.jsxs("span",{className:"font-bold w-14 flex-shrink-0",style:{color:c},children:[t.nm,"nm"]}),e.jsx("span",{className:"text-white/40 flex-shrink-0 w-16 truncate",children:t.name}),e.jsxs("span",{className:"font-mono font-bold text-[10px] flex-shrink-0",style:{color:t.fockN===0?"#374151":c},children:["|",t.fockN,"⟩"]}),e.jsx("div",{className:"flex gap-px flex-shrink-0",children:Array.from({length:6}).map((S,w)=>e.jsx("div",{className:"w-1.5 h-1.5 rounded-sm",style:{background:w<x?c:c+"18"}},w))}),e.jsxs("span",{className:"text-white/15 text-[8px] ml-auto",children:["[",t.band,"]"]})]},t.nm)})})]}),e.jsxs("div",{className:"border border-white/10 rounded-xl p-3",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"text-white/25 text-[9px] uppercase tracking-widest mb-2 flex items-center gap-1",children:[e.jsx(J,{size:9})," Agent Registry (",s.agents.length,")"]}),s.agents.length===0?e.jsx("div",{className:"text-white/15 text-[9px]",children:"No agents registered"}):e.jsx("div",{className:"space-y-1",children:s.agents.map(t=>e.jsxs("div",{className:"flex items-center gap-2 text-[9px]",children:[e.jsx("div",{className:"w-1.5 h-1.5 rounded-full animate-pulse",style:{background:f(t.nm)}}),e.jsx("span",{className:"font-bold",style:{color:f(t.nm)},children:t.name}),e.jsx("span",{className:"text-white/25",children:t.psi})]},t.name))})]})]}),e.jsx("div",{className:"col-span-2 flex flex-col min-h-0",children:e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsx("div",{className:"px-3 py-2 border-b border-white/5 flex-shrink-0",children:e.jsxs("span",{className:"text-white/30 text-[9px] uppercase tracking-widest",children:["Instruction Stream — ",m.length," instructions"]})}),e.jsx("div",{className:"flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0",children:m.length===0?e.jsx("div",{className:"text-white/15 text-[10px] text-center py-16",children:"Load a program to see instructions"}):m.map((t,c)=>{const x=i&&c===s.pc&&!s.halted,S=i&&c<s.pc,w=y[t.mnem]??"#6b7280",z=t.op===255,H=t.op===9;return e.jsxs("div",{className:`flex items-start gap-2 px-2 py-1 rounded text-[9px] transition-all ${x?"border border-violet-400/40":H?"border border-emerald-400/20":"border border-transparent"}`,style:{background:x?"rgba(139,0,255,0.12)":H?"rgba(16,185,129,0.05)":S?"rgba(255,255,255,0.01)":"transparent"},"data-testid":`instruction-${c}`,children:[e.jsx("span",{className:"text-white/20 w-8 flex-shrink-0 text-right font-mono",children:c.toString().padStart(3,"0")}),x&&e.jsx("span",{className:"text-violet-400 flex-shrink-0",children:"▶"}),e.jsx("span",{className:`font-bold flex-shrink-0 w-12 ${S?"opacity-40":""}`,style:{color:w},children:t.mnem}),e.jsx("span",{className:"text-white/40 truncate flex-1",children:t.args}),t.nm&&e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0 mt-0.5",style:{background:f(t.nm),opacity:S?.3:1}}),z&&e.jsx(K,{size:9,className:"text-amber-400/50 flex-shrink-0"}),H&&!S&&e.jsx(O,{size:9,className:"text-emerald-400/60 flex-shrink-0"})]},c)})})]})}),e.jsx("div",{className:"col-span-1 flex flex-col min-h-0",children:e.jsxs("div",{className:"border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-0",style:{background:"rgba(255,255,255,0.01)"},children:[e.jsxs("div",{className:"px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0",children:[e.jsx("span",{className:"text-white/30 text-[9px] uppercase tracking-widest",children:"Output Stream"}),e.jsx(X,{size:9,className:"text-white/20"})]}),e.jsx("div",{ref:k,className:"flex-1 overflow-y-auto p-2 space-y-1 min-h-0",children:s.output.length===0?e.jsx("div",{className:"text-white/15 text-[9px] text-center py-8",children:"No output yet"}):s.output.map((t,c)=>{const x=t.type==="emit"?"#f59e0b":t.type==="annih"?"#06b6d4":t.type==="nhat"?"#10b981":t.type==="coll"?"#e879f9":t.type==="entgl"?"#f43f5e":t.type==="broad"?"#f97316":t.type==="agent"?"#0ea5e9":t.type==="gate"?"#10b981":t.type==="proof"?"#6ee7b7":"#4b5563";return e.jsx("div",{className:"text-[8.5px] font-mono leading-relaxed border-l-2 pl-2",style:{borderColor:x+"60",color:t.nm?t.type==="proof"?"#6ee7b7":f(t.nm):x},children:t.text},c)})})]})})]}),d&&!s.halted&&e.jsxs("div",{className:"border border-violet-400/20 rounded-xl px-4 py-3 flex items-center gap-4 flex-shrink-0",style:{background:"rgba(139,0,255,0.05)"},children:[e.jsx("div",{className:"text-violet-400/50 text-[9px] uppercase tracking-widest flex-shrink-0",children:"Next instruction"}),e.jsx("div",{className:"w-2 h-2 rounded-full flex-shrink-0",style:{background:d.nm?f(d.nm):d.op===9?"#10b981":"#6b7280"}}),e.jsx("span",{className:"font-bold text-[11px]",style:{color:y[d.mnem]??"#6b7280"},children:d.mnem}),e.jsx("span",{className:"text-white/50 text-[10px]",children:d.args}),e.jsx("span",{className:"text-white/20 text-[9px] ml-auto",children:d.cmt}),d.op===9&&e.jsxs("span",{className:"text-[9px] text-emerald-400/60",children:["load=",u," · threshold=",d.gateThreshold]}),d.nm&&d.op!==9&&e.jsxs("span",{className:"text-[9px] font-bold",style:{color:f(d.nm)},children:[d.nm,"nm · ",j(d.nm)]})]})]})]})}export{ae as default};
