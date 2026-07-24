import{j as e}from"./vendor-query-Bv9H5-RN.js";import{r as b,L as G}from"./vendor-router-tr6KpmeX.js";import{u as je}from"./use-page-meta-BRxgrg9H.js";import{f as Ee,R as ce,a9 as Me,C as Te,Z as Le,aV as oe,ap as Ae,J as Ce,c as Re,d as ke}from"./vendor-icons-DxZLqVKp.js";const re=250,V=200,U=20,ee=30;function xe(){return new Promise(o=>{const m=new MessageChannel;m.port1.onmessage=()=>o(),m.port2.postMessage(null)})}function Y(o){return o<450?"#8b00ff":o<495?"#2563eb":o<520?"#06b6d4":o<565?"#16a34a":o<590?"#ca8a04":o<625?"#ea580c":"#dc2626"}function J(o){return o<450?"SYSTEM":o<495?"AUTH":o<520?"STREAM":o<565?"LOGIC":o<590?"INTERFACE":o<625?"EVENT":"STORAGE"}function x(o){const m=o.toUpperCase().split("").map(h=>h.charCodeAt(0)).filter(h=>h>=32&&h<=126);m.length||m.push(77);const s=m.reduce((h,a)=>h+a,0)/m.length,t=parseFloat((380+(s-32)/94*400).toFixed(2)),u=Math.floor((t-380)/4)+1,d=m.reduce((h,a)=>h+a,0)%100,p=m.length%2===0?"H":"V";return{nm:t,psi:`Ψ(${u},${d},${p})`,band:J(t)}}function ue(o,m,s){const t=o.trim();if(!t){s.push("");return}if(t.startsWith("#")||t.startsWith("//")||t.startsWith("--")||t.startsWith("/*")||t.startsWith("*")||t.startsWith(";;")){s.push(`// ${t.replace(/^[#/*;\-]+\s*/,"")}`);return}if(m==="typescript"||m==="solidity"){const a=t.match(/^(?:export\s+)?interface\s+(\w+)/);if(a){const l=x(a[1]);s.push(`@channel(${l.psi}) // ${l.nm}nm · ${l.band}`),s.push(`type ${a[1]} : SpectralInterface {`);return}}if(m==="typescript"){const a=t.match(/^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/);if(a){const l=x(a[1]);s.push(`@band(${l.band}) enum ${a[1]} {  // ${l.nm}nm · ${l.psi}`);return}if(t.match(/^@\w+/)&&!t.match(/^@\d/)){s.push(`// decorator: ${t}`);return}}if(m==="kotlin"){const a=t.match(/^data\s+class\s+(\w+)/);if(a){const n=x(a[1]);s.push(`@channel(${n.psi}) // ${n.nm}nm · ${n.band} · data`),s.push(`type ${a[1]} : SpectralRecord {`);return}const l=t.match(/^(?:companion\s+)?object\s+(\w+)/);if(l){const n=x(l[1]);s.push(`@singleton(${n.psi}) object ${l[1]} {  // ${n.nm}nm`);return}if(t==="companion object"||t==="companion object {"){s.push("@singleton(Ψ(128,50,H)) companion object {");return}}if(m==="swift"){const a=t.match(/^protocol\s+(\w+)/);if(a){const n=x(a[1]);s.push(`@channel(${n.psi}) // ${n.nm}nm · ${n.band} · protocol`),s.push(`type ${a[1]} : SpectralProtocol {`);return}const l=t.match(/^extension\s+(\w+)/);if(l){const n=x(l[1]);s.push(`@channel(${n.psi}) // ${n.nm}nm · extension`),s.push(`type ${l[1]}Ext : SpectralNode {`);return}if(t.match(/^guard\s+/)){s.push(`  ?λ ${t.replace(/^guard\s+/,"")}:`);return}if(t.match(/^@\w+/)&&!t.match(/^@\d/)){s.push(`// property-wrapper: ${t}`);return}}if(m==="csharp"){const a=t.match(/^namespace\s+(\S+)/);if(a){const n=x(a[1].replace(/[^a-zA-Z]/g,"")||"ns");s.push(`tune(${n.nm}nm)  // namespace ${a[1]} → ${n.psi}`);return}if(t.match(/^using\s+\w/)){const n=(t.match(/using\s+(\S+?);?$/)??[])[1]??"ns",r=x(n.replace(/[^a-zA-Z]/g,"")||"mod");s.push(`tune(${r.nm}nm)  // ${n} → ${r.psi}`);return}const l=t.match(/^(?:public|private|protected|internal|static|abstract|sealed|override|virtual)\s+(.+)/);if(l){const n=l[1].trim(),r=n.match(/^(?:class|struct|enum|record)\s+(\w+)/);if(r){const f=x(r[1]);s.push(`@channel(${f.psi}) // ${f.nm}nm · ${f.band}`),s.push(`type ${r[1]} : SpectralNode {`);return}const i=n.match(/^(?:\w+\s+)?(\w+)\s*\(([^)]*)\)/);if(i){const f=x(i[1]),g=i[2].split(",").map(N=>N.trim()).filter(Boolean).map(N=>`@${x(N.replace(/[^a-zA-Z]/g,"")||"x").nm}nm ${N}`).join(", ");s.push(`@emit(${f.nm}nm, ${f.psi}) // λ=${f.nm}nm · ${f.band}`),s.push(`fn ${i[1]}(${g}) {`);return}}}if(m==="php"){if(t.startsWith("<?php")||t.startsWith("?>")){s.push(`// PHP: ${t}`);return}const a=t.match(/^\$(\w+)\s*=\s*(.+)/);if(a){const l=x(a[1]);s.push(`@${l.nm}nm let ${a[1]} := ${a[2].replace(/;$/,"")}  // ${l.psi}`);return}if(t.match(/^echo\s+/)){s.push(`  broadcast(${t.slice(5).trim()})  // STREAM`);return}}if(m==="ruby"){const a=t.match(/^module\s+(\w+)/);if(a){const n=x(a[1]);s.push(`@channel(${n.psi}) // ${n.nm}nm · ${n.band} · module`),s.push(`type ${a[1]} : SpectralModule {`);return}const l=t.match(/^attr_(?:accessor|reader|writer)\s+:(\w+)/);if(l){const n=x(l[1]);s.push(`@${n.nm}nm let ${l[1]} := SpectralField  // ${n.psi}`);return}if(t.match(/^puts\s+/)){s.push(`  broadcast(${t.slice(5).trim()})  // STREAM`);return}if(t==="end"){s.push("}");return}}if(m==="sql"){if(t.match(/^SELECT\b/i)){const n=x("query");s.push(`  emit QUERY(@${n.nm}nm, ${n.psi})  // SQL SELECT → spectral`);return}const a=t.match(/^CREATE\s+TABLE\s+(\w+)/i);if(a){const n=x(a[1]);s.push(`@channel(${n.psi}) type ${a[1]} : SpectralTable {  // ${n.nm}nm`);return}const l=t.match(/^INSERT\s+INTO\s+(\w+)/i);if(l){const n=x(l[1]);s.push(`  tune(${n.nm}nm)  // INSERT → ${n.psi}`);return}if(t.match(/^(?:FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING|LIMIT|ON|VALUES)\b/i)){const n=t.split(/\s/)[0],r=x(n);s.push(`  /* @${r.nm}nm */ ${t}`);return}if(t.match(/^(?:UPDATE|DELETE|ALTER|DROP|CREATE INDEX)\b/i)){const n=x(t.split(/\s/)[0]);s.push(`  tune(${n.nm}nm)  // SQL ${t.split(/\s/)[0].toUpperCase()}`);return}}if(m==="solidity"){const a=t.match(/^contract\s+(\w+)/);if(a){const r=x(a[1]);s.push(`@channel(${r.psi}) // ${r.nm}nm · ${r.band} · contract`),s.push(`type ${a[1]} : SpectralContract {`);return}const l=t.match(/^event\s+(\w+)/);if(l){const r=x(l[1]);s.push(`@emit(${r.nm}nm, ${r.psi}) // event · ${r.band}`);return}const n=t.match(/^modifier\s+(\w+)/);if(n){const r=x(n[1]);s.push(`@emit(${r.nm}nm, ${r.psi}) // modifier`),s.push(`fn ${n[1]}(_) {`);return}if(t.match(/^mapping\s*\(/)){const r=x("mapping");s.push(`@${r.nm}nm let mapping := SpectralMap  // ${r.psi}`);return}if(t.match(/^emit\s+\w+/)){s.push(`  broadcast(${t.slice(5).trim()})  // STREAM`);return}if(t.match(/^pragma\b/)){s.push(`// pragma: ${t}`);return}}if(m==="haskell"){const a=t.match(/^module\s+(\S+)\s+where/);if(a){const i=x(a[1].replace(/\./g,"")||"mod");s.push(`tune(${i.nm}nm)  // module ${a[1]} → ${i.psi}`);return}const l=t.match(/^data\s+(\w+)/);if(l){const i=x(l[1]);s.push(`@channel(${i.psi}) type ${l[1]} : SpectralADT {  // ${i.nm}nm`);return}const n=t.match(/^type\s+(\w+)\s+=/);if(n){const i=x(n[1]);s.push(`@${i.nm}nm let ${n[1]} := SpectralAlias  // ${i.psi}`);return}if(t.match(/^import\s+/)){const i=(t.match(/import\s+(?:qualified\s+)?(\S+)/)??[])[1]??"hs",f=x(i.replace(/[^a-zA-Z]/g,"")||"mod");s.push(`tune(${f.nm}nm)  // ${i} → ${f.psi}`);return}if(t==="where"||t==="where {"){s.push("where {");return}const r=t.match(/^(\w+)\s*<-\s*(.+)/);if(r){const i=x(r[1]);s.push(`@${i.nm}nm let ${r[1]} := ${r[2]}  // ${i.psi}`);return}}const u=t.match(/^(?:def|function|fn|func|fun|void|int|string|bool|float|double|async\s+function|export\s+(?:async\s+)?function)\s+(\w+)\s*\(([^)]*)\)/);if(u){const[,a,l]=u,n=x(a),r=l.split(",").map(i=>i.trim()).filter(Boolean).map(i=>`@${x(i.replace(/[^a-zA-Z]/g,"")||"x").nm}nm ${i.trim()}`).join(", ");s.push(`@emit(${n.nm}nm, ${n.psi}) // λ=${n.nm}nm · ${n.band}`),s.push(`fn ${a}(${r}) {`);return}const d=t.match(/^(?:class|struct|type)\s+(\w+)/);if(d){const a=x(d[1]);s.push(`@channel(${a.psi}) // ${a.nm}nm · ${a.band}`),s.push(`type ${d[1]} : SpectralNode {`);return}const p=t.match(/^(?:let|const|var|val|auto)?\s*(\w+)\s*[:=]+\s*(.+)/);if(p&&!p[1].match(/^(?:if|else|for|while|return|import|from|use|fn|def|class|struct|type|func|fun|contract|event|module|data|interface|enum|protocol|extension|namespace|guard|pragma)$/)){const[,a,l]=p,n=x(a);s.push(`@${n.nm}nm let ${a} := ${l.replace(/;$/,"")}  // ${n.psi}`);return}if(t.startsWith("return")){s.push(`  emit ${t.slice(6).trim()}  // → spectral output`);return}if(t.match(/^(?:import|from|use|require|include|using)\b/)){const a=t.match(/["']([^"']+)["']/)||t.match(/\s+(\S+)\s*$/),l=a?a[1]:"module",n=x(l.replace(/[^a-zA-Z]/g,"")||"mod");s.push(`tune(${n.nm}nm)  // ${l} → ${n.psi}`);return}if(t.match(/^(?:print|console\.log|println!|printf|fmt\.Print(?:ln)?|System\.out\.print(?:ln)?|echo|puts)\b/)){s.push(`  broadcast(${t.replace(/^[^(]+/,"")})  // STREAM`);return}if(t.startsWith("if ")||t==="else"||t.startsWith("else if")||t.startsWith("else {")){s.push(`  ?λ ${t.replace(/^else\s*/,"// else ")}:`);return}if(t.match(/^(?:for|while|loop|forEach|each)\b/)){s.push(`  oscillate(${t.replace(/^(?:for|while|loop|forEach|each)\s+/,"")}) {`);return}if(t==="}"||t==="})"||t.match(/^end(\s|$)/)){s.push("}");return}const h=x(t.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op");s.push(`  /* @${h.nm}nm */ ${t}`)}function We(o,m){if(!o.trim())return"";const s=["// WavelengthScript v1.0 · NexusOS · AGPL-3.0",`// ${m.toUpperCase()} → WLS · ${new Date().toISOString().slice(0,19)}Z`,""];for(const u of o.split(`
`))ue(u,m,s);s.push(""),s.push("// ── Spectral manifest ───────────────────────────");const t=Array.from(new Set(o.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g)??[])).slice(0,8);for(const u of t){const d=x(u);s.push(`// ${u.padEnd(18)} → ${d.nm}nm  ${d.psi}  [${d.band}]`)}return s.join(`
`)}async function Pe(o,m,s,t){const u=o.split(`
`),d=u.length,p=["// WavelengthScript v1.0 · NexusOS · AGPL-3.0",`// ${m.toUpperCase()} → WLS · ${new Date().toISOString().slice(0,19)}Z`,""];for(let a=0;a<d;a+=V){if(t.cancelled)return[];u.slice(a,a+V).forEach(r=>ue(r,m,p));const l=Math.min(a+V,d)/d,n=parseFloat((380+l*400).toFixed(1));s(Math.min(a+V,d),d,n),await xe()}p.push(""),p.push("// ── Spectral manifest ───────────────────────────");const h=Array.from(new Set(o.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g)??[])).slice(0,8);for(const a of h){const l=x(a);p.push(`// ${a.padEnd(18)} → ${l.nm}nm  ${l.psi}  [${l.band}]`)}return p}const Ie=["Scanning 51,200 Ψ channels…","Mapping λ coordinates…","Encoding to WavelengthScript…","Resolving spectral manifold…","Applying CE table…","Deriving Ψ(WDM,OAM,POL) addresses…","Building spectral manifest…","Collapsing wavefunctions…","Verifying Maxwell constraints…","Almost there — compressing state…"],Oe=["Parsing WavelengthScript opcodes…","Mapping λ addresses to bytecode…","Resolving Ψ channel registers…","Encoding EMIT / TUNE / PUSH ops…","Building WNSP instruction set…","Verifying opcode boundaries…","Linking spectral labels…","Finalising bytecode manifest…"];function ie({linesTotal:o,linesDone:m,activeNm:s,label:t="TRANSPILING"}){const[u,d]=b.useState(0),[p,h]=b.useState(0),a=t==="COMPILING"?Oe:Ie;b.useEffect(()=>{const w=setInterval(()=>d(v=>(v+1)%a.length),1100),y=setInterval(()=>h(v=>v+1),30);return()=>{clearInterval(w),clearInterval(y)}},[a.length]);const l=o>0?m/o:0,r=(w=>w<450?"#8b00ff":w<495?"#2563eb":w<520?"#06b6d4":w<565?"#16a34a":w<590?"#ca8a04":w<625?"#ea580c":"#dc2626")(s),i=480,f=80,g=i/2,N=[{amp:22,freq:2.5,phase:p*.04,color:r,op:.8},{amp:14,freq:4,phase:p*.06+1,color:"#06b6d4",op:.5},{amp:8,freq:6,phase:p*.09+2.5,color:"#8b00ff",op:.35}],M=(w,y,v)=>Array.from({length:i+1},(W,A)=>{const R=f/2+w*Math.sin(A/i*Math.PI*2*y+v);return`${A===0?"M":"L"}${A},${R}`}).join(" ");return e.jsxs("div",{className:"flex flex-col items-center justify-center h-full w-full gap-5 select-none",style:{background:"#020c08"},children:[e.jsxs("div",{className:"relative w-full max-w-lg px-4",children:[e.jsxs("svg",{viewBox:`0 0 ${i} ${f}`,className:"w-full",style:{filter:`drop-shadow(0 0 8px ${r})`},children:[N.map((w,y)=>e.jsx("path",{d:M(w.amp,w.freq,w.phase),stroke:w.color,strokeWidth:y===0?2:1,fill:"none",opacity:w.op},y)),e.jsx("line",{x1:g,y1:0,x2:g,y2:f,stroke:r,strokeWidth:1,opacity:.3})]}),e.jsx("div",{className:"absolute inset-0 pointer-events-none",style:{background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.12) 3px,rgba(0,0,0,0.12) 4px)"}})]}),e.jsxs("div",{className:"text-center",children:[e.jsxs("div",{className:"text-3xl font-bold font-mono tabular-nums",style:{color:r,textShadow:`0 0 20px ${r}`},children:[s.toFixed(1),"nm"]}),e.jsxs("div",{className:"text-[11px] font-mono mt-1",style:{color:r,opacity:.6},children:[s<450?"SYSTEM":s<495?"AUTH":s<520?"STREAM":s<565?"LOGIC":s<590?"INTERFACE":s<625?"EVENT":"STORAGE"," band"]})]}),o>0&&e.jsxs("div",{className:"w-full max-w-md px-8",children:[e.jsxs("div",{className:"flex justify-between text-[10px] font-mono mb-1.5",style:{color:r,opacity:.7},children:[e.jsxs("span",{children:[m.toLocaleString()," / ",o.toLocaleString()," lines"]}),e.jsxs("span",{children:[Math.round(l*100),"%"]})]}),e.jsx("div",{className:"h-1 bg-white/5 rounded-full overflow-hidden",children:e.jsx("div",{className:"h-full rounded-full transition-all duration-200",style:{width:`${l*100}%`,backgroundColor:r,boxShadow:`0 0 8px ${r}`}})})]}),e.jsx("div",{className:"text-[9px] font-mono tracking-widest uppercase mb-[-12px]",style:{color:r,opacity:.4},children:t}),e.jsx("div",{className:"text-[12px] font-mono text-center px-6",style:{color:r,opacity:.8},children:a[u]}),e.jsx("div",{className:"flex gap-1 items-end px-8 w-full max-w-md h-8",children:["#8b00ff","#2563eb","#06b6d4","#16a34a","#ca8a04","#ea580c","#dc2626"].map((w,y)=>{const v=Math.floor(l*7)>=y,_=Math.floor(l*7)===y,W=v?_?20+p%8*1.5:14:4;return e.jsx("div",{className:"flex-1 rounded-t transition-all duration-200",style:{height:`${W}px`,backgroundColor:w,boxShadow:_?`0 0 10px ${w}`:"none",opacity:v?1:.15}},y)})}),e.jsx("div",{className:"text-[10px] text-gray-700 font-mono",children:"NexusOS · WavelengthScript Transpiler · Browser-native"})]})}function He({lines:o}){const m=b.useRef(null),[s,t]=b.useState(0),[u,d]=b.useState(600);b.useEffect(()=>{const r=m.current;if(!r)return;d(r.clientHeight);const i=new ResizeObserver(()=>d(r.clientHeight));return i.observe(r),()=>i.disconnect()},[]);const p=Math.max(0,Math.floor(s/U)-ee),h=Math.min(o.length,Math.ceil((s+u)/U)+ee);o.length*U;const a=p*U,l=Math.max(0,(o.length-h)*U),n=b.useMemo(()=>o.slice(p,h),[o,p,h]);return e.jsx("div",{ref:m,className:"flex-1 overflow-auto font-mono text-xs",style:{lineHeight:`${U}px`},onScroll:r=>t(r.target.scrollTop),children:e.jsx("div",{style:{paddingTop:a,paddingBottom:l},children:n.map((r,i)=>{const f=p+i,g=r.match(/(\d{3,3}\.\d+)nm/),N=g?parseFloat(g[1]):null;return e.jsxs("div",{className:"flex gap-2 px-4",style:{height:U},children:[e.jsx("span",{className:"text-gray-700 select-none w-6 text-right shrink-0 text-[10px]",children:f+1}),e.jsx("span",{style:{color:N?Y(N):r.startsWith("//")?"#4b5563":"#86efac"},children:r||" "})]},f)})})})}function de(o){if(!o.trim())return[];const m=[];let s=0;function t(u,d,p,h,a,l){m.push({off:s,op:u,mnem:d,args:p,nm:a,psi:l,cmt:h}),u!==0&&(s+=8)}t(0,".WNSP","v1.0","NexusOS WNSP Bytecode"),t(0,".ARCH","WDM256·OAM50·POL2·DIR2","51,200 Ψ channels"),s=0;for(const u of o.split(`
`)){const d=u.trim();if(!d||d.startsWith("//")||d.startsWith(";")||d.startsWith("#"))continue;const p=d.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);if(p){const g=parseFloat(p[1]);t(3,"EMIT",`λ=${g}nm  ${p[2]}`,`emit · ${J(g)}`,g,p[2]);continue}const h=d.match(/tune\((\d+\.?\d*)nm\)/);if(h){const g=parseFloat(h[1]);t(1,"TUNE",`λ=${g}nm`,`tune → ${J(g)}`,g);continue}const a=d.match(/^fn\s+(\w+)/);if(a){const g=x(a[1]);t(7,"LABEL",`${a[1]}  ${g.psi}`,`fn λ=${g.nm}nm`,g.nm,g.psi);continue}const l=d.match(/oscillate\(([^)]+)\)/);if(l){t(6,"OCS",l[1].trim(),"wave loop");continue}const n=d.match(/broadcast\(([^)]+)\)/);if(n){const g=x(n[1].replace(/[^a-zA-Z]/g,"")||"data");t(5,"BROAD",n[1].trim(),`broadcast λ=${g.nm}nm`,g.nm);continue}const r=d.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);if(r){t(2,"PUSH",`@${r[1]}nm  "${r[2]}"`,`bind λ=${r[1]}nm`,parseFloat(r[1]));continue}const i=d.match(/^\s*emit\s+(.+)/);if(i){const g=x(i[1].replace(/[^a-zA-Z]/g,"")||"out");t(3,"EMIT",i[1].trim(),`output λ=${g.nm}nm`,g.nm);continue}if(d.startsWith("?λ ")){t(8,"JMPZ",d.slice(3).trim(),"photon branch");continue}if(d==="}"||d.match(/^end\b/)){t(254,"RET","","scope end");continue}const f=x(d.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op");t(11,"EXEC",`@${f.nm}nm`,d.slice(0,50),f.nm)}return t(255,"HALT","","wavefunction terminated"),m}async function me(o,m,s){const t=o.split(`
`),u=t.length,d=[];let p=0;function h(l,n,r,i,f,g){d.push({off:p,op:l,mnem:n,args:r,nm:f,psi:g,cmt:i}),l!==0&&(p+=8)}h(0,".WNSP","v1.0","NexusOS WNSP Bytecode"),h(0,".ARCH","WDM256·OAM50·POL2·DIR2","51,200 Ψ channels"),p=0;const a=l=>{const n=l.trim();if(!n||n.startsWith("//")||n.startsWith(";")||n.startsWith("#"))return;const r=n.match(/@emit\((\d+\.?\d*)nm,\s*(Ψ\([^)]+\))\)/);if(r){const v=parseFloat(r[1]);h(3,"EMIT",`λ=${v}nm  ${r[2]}`,`emit · ${J(v)}`,v,r[2]);return}const i=n.match(/tune\((\d+\.?\d*)nm\)/);if(i){const v=parseFloat(i[1]);h(1,"TUNE",`λ=${v}nm`,`tune → ${J(v)}`,v);return}const f=n.match(/^fn\s+(\w+)/);if(f){const v=x(f[1]);h(7,"LABEL",`${f[1]}  ${v.psi}`,`fn λ=${v.nm}nm`,v.nm,v.psi);return}const g=n.match(/oscillate\(([^)]+)\)/);if(g){h(6,"OCS",g[1].trim(),"wave loop");return}const N=n.match(/broadcast\(([^)]+)\)/);if(N){const v=x(N[1].replace(/[^a-zA-Z]/g,"")||"data");h(5,"BROAD",N[1].trim(),`broadcast λ=${v.nm}nm`,v.nm);return}const M=n.match(/@(\d+\.?\d*)nm\s+let\s+(\w+)\s*:=/);if(M){h(2,"PUSH",`@${M[1]}nm  "${M[2]}"`,`bind λ=${M[1]}nm`,parseFloat(M[1]));return}const w=n.match(/^\s*emit\s+(.+)/);if(w){const v=x(w[1].replace(/[^a-zA-Z]/g,"")||"out");h(3,"EMIT",w[1].trim(),`output λ=${v.nm}nm`,v.nm);return}if(n.startsWith("?λ ")){h(8,"JMPZ",n.slice(3).trim(),"photon branch");return}if(n==="}"||n.match(/^end\b/)){h(254,"RET","","scope end");return}const y=x(n.split(/\s/)[0].replace(/[^a-zA-Z]/g,"")||"op");h(11,"EXEC",`@${y.nm}nm`,n.slice(0,50),y.nm)};for(let l=0;l<u;l+=V){if(s.cancelled)return[];t.slice(l,l+V).forEach(a);const n=Math.min(l+V,u)/u;m(Math.min(l+V,u),u,parseFloat((380+n*400).toFixed(1))),await xe()}return h(255,"HALT","","wavefunction terminated"),d}const X=28;function Fe({rows:o}){const m=b.useRef(null),[s,t]=b.useState(0),[u,d]=b.useState(220);b.useEffect(()=>{const r=m.current;if(!r)return;d(r.clientHeight);const i=new ResizeObserver(()=>d(r.clientHeight));return i.observe(r),()=>i.disconnect()},[]);const p=Math.max(0,Math.floor(s/X)-ee),h=Math.min(o.length,Math.ceil((s+u)/X)+ee),a=p*X,l=Math.max(0,(o.length-h)*X),n=o.slice(p,h);return e.jsx("div",{ref:m,className:"overflow-auto flex-1",onScroll:r=>t(r.target.scrollTop),children:e.jsxs("table",{className:"w-full font-mono text-xs",children:[e.jsx("thead",{className:"border-b border-white/5 sticky top-0 bg-black/90 z-10",children:e.jsxs("tr",{className:"text-gray-600",children:[e.jsx("th",{className:"px-3 py-1.5 text-left",children:"Offset"}),e.jsx("th",{className:"px-3 py-1.5 text-left",children:"Op"}),e.jsx("th",{className:"px-3 py-1.5 text-left",children:"Mnem"}),e.jsx("th",{className:"px-3 py-1.5 text-left",children:"Args"}),e.jsx("th",{className:"px-3 py-1.5 text-left hidden md:table-cell",children:"λ"}),e.jsx("th",{className:"px-3 py-1.5 text-left hidden lg:table-cell",children:"Comment"})]})}),e.jsxs("tbody",{children:[a>0&&e.jsx("tr",{style:{height:a},children:e.jsx("td",{colSpan:6})}),n.map((r,i)=>e.jsxs("tr",{className:"border-b border-white/5 hover:bg-white/5",style:{height:X},children:[e.jsx("td",{className:"px-3 text-gray-700",children:r.op!==0?`0x${r.off.toString(16).padStart(4,"0")}`:""}),e.jsx("td",{className:"px-3 text-gray-600",children:r.op!==0?`0x${r.op.toString(16).padStart(2,"0")}`:""}),e.jsx("td",{className:"px-3 font-bold",style:{color:r.nm?Y(r.nm):"#6b7280"},children:r.mnem}),e.jsx("td",{className:"px-3 text-gray-300 max-w-[180px] truncate",children:r.args}),e.jsx("td",{className:"px-3 text-gray-600 hidden md:table-cell",children:r.nm?`${r.nm}nm`:""}),e.jsx("td",{className:"px-3 text-gray-700 max-w-[200px] truncate hidden lg:table-cell",children:r.cmt})]},p+i)),l>0&&e.jsx("tr",{style:{height:l},children:e.jsx("td",{colSpan:6})})]})]})})}const pe={python:`def greet(name):
    message = "Hello, " + name
    print(message)
    return message

def add(a, b):
    result = a + b
    return result

greet("World")
add(3, 4)`,javascript:`function greet(name) {
  const message = "Hello, " + name
  console.log(message)
  return message
}

function add(a, b) {
  const result = a + b
  return result
}

greet("World")
add(3, 4)`,typescript:`interface SpectralNode {
  wavelength: number
  channel: string
  energy: number
}

enum Band {
  SYSTEM = "violet",
  LOGIC  = "green",
  STREAM = "cyan",
}

async function encodeSpectral(node: SpectralNode): Promise<string> {
  const { wavelength, channel } = node
  console.log(\`Encoding \${channel} at \${wavelength}nm\`)
  return channel
}

const node: SpectralNode = { wavelength: 520, channel: "Ψ(70,20,H)", energy: 2.38 }
encodeSpectral(node)`,rust:`fn greet(name: &str) -> String {
    let message = format!("Hello, {}", name);
    println!("{}", message);
    return message;
}

fn add(a: i32, b: i32) -> i32 {
    let result = a + b;
    return result;
}`,go:`func greet(name string) string {
    message := "Hello, " + name
    fmt.Println(message)
    return message
}

func add(a int, b int) int {
    result := a + b
    return result
}`,kotlin:`data class SpectralNode(
    val wavelength: Double,
    val channel: String,
    val energy: Double
)

object SpectrumRegistry {
    val nodes = mutableListOf<SpectralNode>()

    fun register(node: SpectralNode) {
        nodes.add(node)
        println("Registered: \${node.channel}")
    }
}

fun main() {
    val node = SpectralNode(520.0, "Ψ(70,20,H)", 2.38)
    SpectrumRegistry.register(node)
}`,swift:`protocol SpectralTransmitter {
    var wavelength: Double { get }
    func transmit() -> String
}

struct PhotonNode: SpectralTransmitter {
    var wavelength: Double
    var channel: String

    func transmit() -> String {
        guard wavelength > 380 else { return "out of range" }
        print("Transmitting at \\(wavelength)nm")
        return channel
    }
}

extension PhotonNode {
    func energyEV() -> Double {
        return 1240.0 / wavelength
    }
}

let node = PhotonNode(wavelength: 520.0, channel: "Ψ(70,20,H)")
node.transmit()`,csharp:`using System
using NexusOS.Spectral

namespace WavelengthRuntime {

public class SpectralNode {
    public double Wavelength { get; set; }
    public string Channel { get; set; }

    public string Transmit() {
        Console.WriteLine($"Encoding {Channel} at {Wavelength}nm")
        return Channel
    }
}

public class Program {
    public static void Main(string[] args) {
        var node = new SpectralNode {
            Wavelength = 520.0,
            Channel = "Ψ(70,20,H)"
        }
        node.Transmit()
    }
}
}`,java:`public class Main {
    public static String greet(String name) {
        String message = "Hello, " + name;
        System.out.println(message);
        return message;
    }

    public static int add(int a, int b) {
        int result = a + b;
        return result;
    }
}`,cpp:`std::string greet(std::string name) {
    std::string message = "Hello, " + name;
    std::cout << message << std::endl;
    return message;
}

int add(int a, int b) {
    int result = a + b;
    return result;
}`,php:`<?php

function greet($name) {
    $message = "Hello, " . $name;
    echo $message;
    return $message;
}

function addSpectral($wavelength, $energy) {
    $result = $wavelength * $energy;
    return $result;
}

$node = "Ψ(70,20,H)";
$wavelength = 520.0;
greet($node);
addSpectral($wavelength, 2.38);`,ruby:`module SpectralEncoding
  def encode(name)
    wavelength = name.chars.map(&:ord).sum % 400 + 380
    "Ψ(#{(wavelength - 380) / 4 + 1},20,H)"
  end
end

class PhotonNode
  include SpectralEncoding
  attr_accessor :wavelength, :channel

  def initialize(wavelength, channel)
    @wavelength = wavelength
    @channel = channel
  end

  def transmit
    puts "Transmitting #{@channel} at #{@wavelength}nm"
    encode(@channel)
  end
end

node = PhotonNode.new(520.0, "Ψ(70,20,H)")
node.transmit`,sql:`CREATE TABLE spectral_nodes (
    id          SERIAL PRIMARY KEY,
    wavelength  DECIMAL(8,2) NOT NULL,
    channel     VARCHAR(32)  NOT NULL,
    band        VARCHAR(16)  NOT NULL,
    energy_ev   DECIMAL(10,6)
)

INSERT INTO spectral_nodes (wavelength, channel, band, energy_ev)
VALUES (520.0, 'Ψ(70,20,H)', 'LOGIC', 2.38)

SELECT id, wavelength, channel, band, energy_ev
FROM spectral_nodes
WHERE band = 'LOGIC'
  AND wavelength BETWEEN 495 AND 565
ORDER BY wavelength ASC`,solidity:`// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0

interface ISpectralNode {
    function transmit(uint256 wavelength) external returns (string memory)
}

contract SpectralRegistry is ISpectralNode {
    event NodeRegistered(address indexed owner, uint256 wavelength, string channel)

    mapping(address => uint256) public wavelengths
    mapping(address => string)  public channels

    modifier onlyValidWavelength(uint256 wl) {
        require(wl >= 380 && wl <= 780, "Out of visible range")
        _
    }

    function register(uint256 wavelength, string calldata channel)
        external onlyValidWavelength(wavelength) {
        wavelengths[msg.sender] = wavelength
        channels[msg.sender]   = channel
        emit NodeRegistered(msg.sender, wavelength, channel)
    }

    function transmit(uint256 wavelength) external returns (string memory) {
        return channels[msg.sender]
    }
}`,haskell:`module SpectralEngine where

import Data.List (sortBy)

data SpectralNode = SpectralNode
  { wavelength :: Double
  , channel    :: String
  , band       :: String
  } deriving (Show, Eq)

type Registry = [SpectralNode]

encodeNode :: String -> SpectralNode
encodeNode name =
  let charSum  = fromIntegral (sum (map fromEnum name))
      wl       = 380.0 + fromIntegral (charSum \`mod\` 400)
      ch       = "Ψ(70,20,H)"
  in SpectralNode { wavelength = wl, channel = ch, band = "LOGIC" }

transmit :: SpectralNode -> String
transmit node = "Transmitting " ++ channel node ++ " at " ++ show (wavelength node) ++ "nm"

main :: IO ()
main = do
  let node = encodeNode "NexusOS"
  putStrLn (transmit node)`},le=[{id:"python",label:"Python"},{id:"javascript",label:"JS"},{id:"typescript",label:"TS"},{id:"rust",label:"Rust"},{id:"go",label:"Go"},{id:"kotlin",label:"Kotlin"},{id:"swift",label:"Swift"},{id:"csharp",label:"C#"},{id:"java",label:"Java"},{id:"cpp",label:"C++"},{id:"php",label:"PHP"},{id:"ruby",label:"Ruby"},{id:"sql",label:"SQL"},{id:"solidity",label:"Solidity"},{id:"haskell",label:"Haskell"}];function he({text:o}){const[m,s]=b.useState(!1);return e.jsxs("button",{onClick:()=>{navigator.clipboard.writeText(o),s(!0),setTimeout(()=>s(!1),1500)},className:"flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-white/10 text-gray-500 hover:text-white hover:border-white/30 transition-all",children:[m?e.jsx(Re,{size:10,className:"text-green-400"}):e.jsx(ke,{size:10}),m?"copied":"copy"]})}const K=[{label:"SYSTEM",min:380,max:450,color:"#8b00ff"},{label:"AUTH",min:450,max:495,color:"#2563eb"},{label:"STREAM",min:495,max:520,color:"#06b6d4"},{label:"LOGIC",min:520,max:565,color:"#16a34a"},{label:"INTERFACE",min:565,max:590,color:"#ca8a04"},{label:"EVENT",min:590,max:625,color:"#ea580c"},{label:"STORAGE",min:625,max:780,color:"#dc2626"}];function Ge(){je({title:"CE→SE Pipeline — Any Language to Spectral Bytecode",description:"The unified 4-stage CE→SE pipeline: paste any language → transpile to WavelengthScript → compile to WNSP bytecode → execute in the WNSP VM. The central demonstration of the NexusOS physics stack.",canonical:"https://wnsp.io/ce-se-pipeline",ogTitle:"CE→SE Pipeline — Any Language to Spectral Bytecode",ogDescription:"4-stage pipeline: any language → WavelengthScript transpile → WNSP bytecode compile → WNSP VM execution. Physics-native computing, live in your browser.",twitterTitle:"CE→SE Pipeline — 4-Stage Spectral Compiler",twitterDescription:"Paste any language → WavelengthScript → WNSP bytecode → execute in WNSP VM. The NexusOS physics stack, live."});const[o,m]=b.useState("python"),[s,t]=b.useState(pe.python),[u,d]=b.useState([]),[p,h]=b.useState(!1),[a,l]=b.useState(!1),[n,r]=b.useState({done:0,total:0,nm:380}),[i,f]=b.useState([]),[g,N]=b.useState(!1),[M,w]=b.useState(!1),[y,v]=b.useState(!1),[_,W]=b.useState([]),[A,R]=b.useState(-1),[te,z]=b.useState({}),[P,I]=b.useState({translate:0,compile:0,execute:0}),[De,ge]=b.useState(!1),ne=b.useRef(void 0),Q=b.useRef(void 0),se=b.useRef({cancelled:!1}),Z=b.useRef(null);b.useEffect(()=>{if(clearTimeout(ne.current),se.current.cancelled=!0,!s.trim()){d([]),h(!1);return}const c=s.split(`
`).length,j=c>=re;j&&(h(!0),r({done:0,total:c,nm:380}),f([]),N(!1),w(!1),W([]),R(-1),z({}));const $=j?0:200;return ne.current=setTimeout(async()=>{const S={cancelled:!1};if(se.current=S,j){const T=performance.now(),O=await Pe(s,o,(C,H,L)=>{S.cancelled||r({done:C,total:H,nm:L})},S);if(S.cancelled)return;const E=performance.now();d(O),h(!1),I({translate:parseFloat((E-T).toFixed(2)),compile:0,execute:0})}else{f([]),N(!1),w(!1),W([]),R(-1),z({});const T=performance.now(),O=We(s,o),E=performance.now();d(O.split(`
`)),I({translate:parseFloat((E-T).toFixed(2)),compile:0,execute:0})}},$),()=>{clearTimeout(ne.current)}},[s,o]);const D=b.useMemo(()=>u.join(`
`),[u]),fe=()=>{clearTimeout(Q.current),f([]),N(!1),w(!1),v(!1),W([]),R(-1),z({}),I(c=>({...c,compile:0,execute:0}))},be=c=>{m(c),t(pe[c]??""),d([]),se.current.cancelled=!0,h(!1),fe(),ge(!1),I({translate:0,compile:0,execute:0})},we=b.useCallback(async()=>{const c=u.length,j=c>=re;if(w(!1),W([]),R(-1),z({}),j){l(!0),r({done:0,total:c,nm:380});const $={cancelled:!1},S=performance.now(),T=await me(D,(E,C,H)=>r({done:E,total:C,nm:H}),$),O=performance.now();f(T),N(!0),l(!1),I(E=>({...E,compile:parseFloat((O-S).toFixed(2)),execute:0}))}else{const $=performance.now(),S=de(D),T=performance.now();f(S),N(!0),I(O=>({...O,compile:parseFloat((T-$).toFixed(2)),execute:0}))}},[D,u.length]),ve=b.useCallback(()=>{const c=i.filter(E=>E.op!==0&&E.mnem&&!E.mnem.startsWith("."));if(!c.length)return;const j=performance.now(),$=Math.max(30,Math.min(120,800/c.length));v(!0),w(!1),W([]),R(-1),z({});let S=0;const T={};function O(){if(S>=c.length){const C=parseFloat((performance.now()-j).toFixed(2));v(!1),w(!0),R(-1),I(H=>({...H,execute:C}));return}const E=c[S];if(W(C=>[...C,E]),R(S),E.nm){const C=K.find(H=>E.nm>=H.min&&E.nm<H.max);C&&(T[C.label]=(T[C.label]??0)+1,z({...T}))}Z.current&&(Z.current.scrollTop=Z.current.scrollHeight),S++,Q.current=setTimeout(O,$)}O()},[i]),ye=b.useCallback(async()=>{if(!D.trim()||p||y||a)return;clearTimeout(Q.current),f([]),N(!1),w(!1),v(!1),W([]),R(-1),z({}),I(L=>({...L,compile:0,execute:0}));const c=u.length,j=c>=re;let $;if(j){l(!0),r({done:0,total:c,nm:380});const L={cancelled:!1},F=performance.now();$=await me(D,(ae,$e,Ne)=>r({done:ae,total:$e,nm:Ne}),L);const q=performance.now();l(!1),I(ae=>({...ae,compile:parseFloat((q-F).toFixed(2)),execute:0}))}else{const L=performance.now();$=de(D);const F=performance.now();I(q=>({...q,compile:parseFloat((F-L).toFixed(2)),execute:0}))}f($),N(!0);const S=$.filter(L=>L.op!==0&&L.mnem&&!L.mnem.startsWith("."));if(!S.length)return;const T=performance.now(),O=Math.max(30,Math.min(120,800/S.length));v(!0),w(!1),W([]),R(-1),z({});let E=0;const C={};function H(){if(E>=S.length){v(!1),w(!0),R(-1),I(F=>({...F,execute:parseFloat((performance.now()-T).toFixed(2))}));return}const L=S[E];if(W(F=>[...F,L]),R(E),L.nm){const F=K.find(q=>L.nm>=q.min&&L.nm<q.max);F&&(C[F.label]=(C[F.label]??0)+1,z({...C}))}Z.current&&(Z.current.scrollTop=Z.current.scrollHeight),E++,Q.current=setTimeout(H,O)}H()},[D,u.length,p,y,a]),k=i.filter(c=>c.op!==0&&c.mnem&&!c.mnem.startsWith(".")),B=P.translate+P.compile+P.execute,Se=le.find(c=>c.id===o)?.label??o;return e.jsxs("div",{className:"min-h-screen bg-[#0a0a0f] text-white flex flex-col",children:[e.jsxs("div",{className:"border-b border-white/10 px-4 py-3 flex items-center gap-3 flex-shrink-0",children:[e.jsx(G,{href:"/wnsp",children:e.jsx("button",{className:"text-gray-500 hover:text-white transition-colors",children:e.jsx(Ee,{size:16})})}),e.jsx("div",{className:"h-4 w-px bg-white/15"}),e.jsx(ce,{size:14,className:"text-violet-400"}),e.jsx("h1",{className:"text-sm font-semibold text-white",children:"WavelengthScript Translator"}),e.jsx("span",{className:"text-xs text-gray-600 hidden sm:block",children:"Any language → WLS → Bytecode → Execute · Browser-native · Zero server"}),e.jsxs("div",{className:"ml-auto flex items-center gap-2",children:[P.translate>0&&e.jsxs("span",{className:"text-[10px] text-green-400 flex items-center gap-1",children:[e.jsx(Me,{size:10})," ",P.translate,"ms"]}),B>0&&M&&e.jsxs("span",{className:`text-[10px] font-bold px-2 py-0.5 rounded border ${B<1e3?"border-green-500/40 text-green-400 bg-green-950/30":"border-yellow-500/40 text-yellow-400"}`,children:[B.toFixed(1),"ms total"]})]})]}),e.jsx("div",{className:"border-b border-white/10 px-4 py-2 flex-shrink-0 bg-black/20",children:e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsxs("h2",{className:"text-[10px] text-gray-600 uppercase tracking-wider shrink-0",children:["Source · ",e.jsxs("span",{className:"text-violet-500",children:[le.length," languages"]})]}),e.jsx("div",{className:"flex flex-wrap gap-1 flex-1",children:le.map(c=>e.jsx("button",{"data-testid":`lang-${c.id}`,onClick:()=>be(c.id),className:`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${o===c.id?"bg-violet-600 text-white":"text-gray-500 hover:text-white hover:bg-white/5"}`,children:c.label},c.id))}),e.jsxs("div",{className:"text-[10px] text-gray-600 shrink-0",children:[s.length.toLocaleString()," chars"]})]})}),e.jsxs("div",{className:"flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0",children:[e.jsxs("div",{className:"flex-1 flex flex-col border-r border-white/10 min-h-0",children:[e.jsxs("div",{className:"px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/10 flex-shrink-0",children:[e.jsx(Te,{size:12,className:"text-gray-500"}),e.jsx("span",{className:"text-[10px] text-gray-500 uppercase tracking-wider",children:Se})]}),e.jsx("textarea",{"data-testid":"code-input",value:s,onChange:c=>t(c.target.value),className:"flex-1 w-full bg-transparent p-4 font-mono text-sm text-green-300 resize-none focus:outline-none leading-relaxed",spellCheck:!1,placeholder:"Paste or type any code here..."})]}),e.jsxs("div",{className:"flex-1 flex flex-col min-h-0 border-t lg:border-t-0 border-white/10",children:[e.jsxs("div",{className:"px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-violet-950/20 flex-shrink-0",children:[e.jsx(ce,{size:12,className:p?"text-yellow-400 animate-pulse":"text-violet-400"}),e.jsx("h2",{className:`text-[10px] uppercase tracking-wider ${p?"text-yellow-400":"text-violet-400"}`,children:"WavelengthScript"}),e.jsx("span",{className:"text-[10px] text-gray-600 ml-1",children:p?`${n.done.toLocaleString()} / ${n.total.toLocaleString()} lines…`:u.length>0?`${u.length.toLocaleString()} lines · live`:"live"}),e.jsx("div",{className:"ml-auto flex items-center gap-2",children:u.length>0&&!p&&e.jsx(he,{text:D})})]}),p?e.jsx(ie,{linesTotal:n.total,linesDone:n.done,activeNm:n.nm}):u.length>0?e.jsx(He,{lines:u}):e.jsx("div",{className:"flex-1 flex items-center justify-center",children:e.jsxs("div",{className:"text-gray-700 text-xs text-center px-6",children:["Type or paste code on the left — WavelengthScript appears here instantly.",e.jsx("br",{}),e.jsx("span",{className:"text-gray-800 text-[10px]",children:"Large files (250+ lines) show a spectral loading screen."})]})})]})]}),e.jsxs("div",{className:"border-t border-white/10 px-4 py-3 flex items-center gap-2 flex-shrink-0 bg-black/30 flex-wrap",children:[e.jsx("button",{"data-testid":"btn-run-all",onClick:ye,disabled:!D||p||a||y,className:`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${M?"bg-violet-900/60 border border-violet-500/30 text-violet-300":a||y?"bg-violet-800/60 border border-violet-500/20 text-violet-300 cursor-wait":"bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"}`,children:a||y?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"w-3 h-3 rounded-full border-2 border-violet-300 border-t-transparent animate-spin"})," ",a?"Compiling…":"Running…"]}):e.jsxs(e.Fragment,{children:[e.jsx(Le,{size:14})," ",M?"Run All ✓":"Run All"]})}),e.jsx("div",{className:"w-px h-5 bg-white/10 mx-1 hidden sm:block"}),e.jsx("button",{"data-testid":"btn-compile",onClick:we,disabled:!D||p||a||y,className:`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${g?"bg-cyan-900/60 border border-cyan-500/30 text-cyan-400":"text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"}`,children:a?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"})," Compiling…"]}):e.jsxs(e.Fragment,{children:[e.jsx(oe,{size:12})," ",g?"Bytecode ready":"Compile"]})}),e.jsx("span",{className:"text-gray-700 text-xs",children:"→"}),e.jsx("button",{"data-testid":"btn-execute",onClick:ve,disabled:!g||y,className:`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${M?"bg-green-900/60 border border-green-500/30 text-green-400":y?"bg-green-800/60 border border-green-500/20 text-green-300 cursor-wait":"text-gray-400 hover:text-white hover:bg-white/5 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed"}`,children:y?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"w-3 h-3 rounded-full border-2 border-green-400 border-t-transparent animate-spin"})," Running…"]}):e.jsxs(e.Fragment,{children:[e.jsx(Ae,{size:12})," ",M?"Executed ✓":"Execute"]})}),(g||M)&&e.jsx("button",{onClick:()=>{f([]),N(!1),w(!1),I(c=>({...c,compile:0,execute:0}))},className:"flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-500 hover:text-white transition-colors",children:"Reset"}),e.jsxs("div",{className:"ml-auto flex items-center gap-3 text-[10px]",children:[P.translate>0&&e.jsxs("span",{className:"text-gray-600",children:["WLS ",e.jsxs("span",{className:"text-violet-400",children:[P.translate,"ms"]})]}),P.compile>0&&e.jsxs("span",{className:"text-gray-600",children:["compile ",e.jsxs("span",{className:"text-cyan-400",children:[P.compile,"ms"]})]}),P.execute>0&&e.jsxs("span",{className:"text-gray-600",children:["execute ",e.jsxs("span",{className:"text-green-400",children:[P.execute,"ms"]})]}),M&&e.jsxs("span",{className:`font-bold px-2 py-0.5 rounded border ${B<1e3?"border-green-500/40 text-green-300 bg-green-950/30":"border-yellow-500/40 text-yellow-300"}`,children:[B.toFixed(2),"ms total"]})]})]}),(a||g&&i.length>0)&&e.jsxs("div",{className:`border-t border-cyan-500/20 bg-black/40 flex-shrink-0 flex flex-col ${a?"h-72":"max-h-56"}`,children:[e.jsxs("div",{className:"px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/80 flex-shrink-0",children:[e.jsx(oe,{size:12,className:a?"text-yellow-400 animate-pulse":"text-cyan-400"}),e.jsx("h2",{className:`text-[10px] uppercase tracking-wider ${a?"text-yellow-400":"text-cyan-400"}`,children:"WNSP Bytecode"}),e.jsx("span",{className:"text-[10px] text-gray-600 ml-1",children:a?`${n.done.toLocaleString()} / ${n.total.toLocaleString()} lines…`:`${k.length.toLocaleString()} instructions · ${P.compile}ms`}),g&&!a&&e.jsx("div",{className:"ml-auto",children:e.jsx(he,{text:i.map(c=>`0x${c.op.toString(16).padStart(2,"0")}  ${c.mnem.padEnd(6)}  ${c.args}`).join(`
`)})})]}),a?e.jsx(ie,{linesTotal:n.total,linesDone:n.done,activeNm:n.nm,label:"COMPILING"}):e.jsx(Fe,{rows:i.filter(c=>c.mnem&&!["",".WNSP",".ARCH",".MODEL"].includes(c.mnem))})]}),(y||M)&&e.jsxs("div",{className:"border-t border-green-500/20 bg-black flex-shrink-0",children:[e.jsxs("div",{className:"px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-black/90",children:[e.jsx("div",{className:`w-2 h-2 rounded-full ${y?"bg-green-400 animate-pulse":"bg-green-600"}`}),e.jsx(Ce,{size:12,className:"text-green-400"}),e.jsxs("span",{className:"text-[10px] text-green-400 uppercase tracking-wider font-mono",children:["WNSP VM ",y?`— executing ${_.length}/${k.length}`:"— HALT"]}),M&&e.jsxs("span",{className:`ml-auto text-[10px] font-bold px-2 py-0.5 rounded border ${B<1e3?"border-green-500/40 text-green-300 bg-green-950/30":"border-yellow-500/40 text-yellow-300"}`,children:[B.toFixed(2),"ms total ",B<1e3?"· ✓ under 1s":""]})]}),e.jsxs("div",{className:"flex flex-col lg:flex-row",children:[e.jsxs("div",{className:"flex-1 relative overflow-hidden",style:{minHeight:"200px",maxHeight:"280px"},children:[e.jsx("div",{className:"absolute inset-0 pointer-events-none z-10",style:{background:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)"}}),e.jsx("div",{className:"absolute inset-0 pointer-events-none z-10",style:{background:"radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)"}}),e.jsxs("div",{ref:Z,className:"h-full overflow-auto p-4 font-mono text-xs space-y-px",style:{background:"#020805"},children:[e.jsx("div",{className:"text-green-700 mb-2 opacity-70",children:"[WNSP VM v1.0] Boot sequence · 51,200 Ψ channels ready"}),_.map((c,j)=>{const $=j===A,S=c.nm?Y(c.nm):"#4b5563";return e.jsxs("div",{className:"flex gap-3 py-px transition-all duration-150",style:{opacity:$?1:.75},children:[$&&e.jsx("span",{className:"w-1 shrink-0 rounded-full self-stretch",style:{backgroundColor:S,boxShadow:`0 0 6px ${S}`}}),!$&&e.jsx("span",{className:"w-1 shrink-0"}),e.jsx("span",{className:"text-gray-600 w-8 shrink-0",children:`0x${c.op.toString(16).padStart(2,"0")}`}),e.jsx("span",{className:"w-14 shrink-0 font-bold",style:{color:S,textShadow:$?`0 0 8px ${S}`:"none"},children:c.mnem}),e.jsx("span",{className:"text-gray-400 flex-1 truncate",children:c.args}),c.nm&&e.jsxs("span",{className:"shrink-0 hidden sm:block",style:{color:S,opacity:.6},children:[c.nm,"nm"]})]},j)}),y&&e.jsxs("div",{className:"flex items-center gap-1 mt-1",children:[e.jsx("span",{className:"text-green-400 animate-pulse font-bold",children:"█"}),e.jsx("span",{className:"text-green-700 text-[10px]",children:"executing…"})]}),M&&e.jsxs("div",{className:"mt-2 pt-2 border-t border-green-900/40 text-green-600",children:["[WNSP VM] HALT · ",k.length," instructions · wavefunction collapsed"]})]})]}),e.jsxs("div",{className:"lg:w-56 border-t lg:border-t-0 lg:border-l border-white/10 p-4 flex flex-col gap-2",style:{background:"#020805"},children:[e.jsx("h3",{className:"text-[9px] text-gray-600 uppercase tracking-wider mb-1 font-mono",children:"Spectrum Activity"}),K.map(c=>{const j=te[c.label]??0,$=Math.max(1,...Object.values(te)),S=j>0?Math.max(8,j/$*100):0,T=k[A]?.nm?k[A].nm>=c.min&&k[A].nm<c.max:!1;return e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("div",{className:"w-16 text-[9px] font-mono shrink-0",style:{color:c.color,opacity:j>0?1:.25},children:c.label}),e.jsx("div",{className:"flex-1 h-3 bg-white/5 rounded-full overflow-hidden",children:e.jsx("div",{className:"h-full rounded-full transition-all duration-200",style:{width:`${S}%`,backgroundColor:c.color,boxShadow:T?`0 0 8px ${c.color}`:"none",opacity:j>0?T?1:.6:0}})}),e.jsx("div",{className:"w-6 text-right text-[9px] font-mono shrink-0",style:{color:c.color,opacity:j>0?1:.2},children:j>0?j:""})]},c.label)}),y&&k[A]?.nm&&e.jsxs("div",{className:"mt-2 pt-2 border-t border-white/10 text-center",children:[e.jsx("div",{className:"text-[9px] text-gray-600 font-mono mb-1",children:"Active λ"}),e.jsxs("div",{className:"text-lg font-bold font-mono",style:{color:Y(k[A].nm),textShadow:`0 0 12px ${Y(k[A].nm)}`},children:[k[A].nm,"nm"]}),e.jsx("div",{className:"text-[9px] font-mono mt-0.5",style:{color:Y(k[A].nm),opacity:.7},children:k[A].psi??J(k[A].nm)})]}),M&&e.jsxs("div",{className:"mt-auto pt-2 border-t border-white/10",children:[e.jsx("div",{className:"text-[9px] text-gray-600 font-mono mb-1",children:"Channels used"}),e.jsx("div",{className:"flex flex-wrap gap-1",children:Object.entries(te).map(([c,j])=>{const $=K.find(S=>S.label===c);return e.jsxs("span",{className:"text-[8px] px-1.5 py-0.5 rounded font-mono",style:{backgroundColor:`${$.color}20`,color:$.color,border:`1px solid ${$.color}40`},children:[c," ×",j]},c)})})]})]})]})]}),e.jsxs("div",{className:"border-t border-white/8 px-4 py-4 flex-shrink-0 bg-black/20",children:[e.jsx("h2",{className:"text-[9px] text-gray-600 uppercase tracking-widest mb-3",children:"Related Resources"}),e.jsxs("div",{className:"flex flex-wrap gap-x-6 gap-y-2",children:[e.jsx(G,{href:"/wavelength-lang",className:"text-[11px] text-violet-400 hover:text-violet-300 transition-colors",children:"WavelengthScript Language Spec"}),e.jsx(G,{href:"/wnsp-vm",className:"text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors",children:"WNSP Virtual Machine"}),e.jsx(G,{href:"/hardware-spec",className:"text-[11px] text-blue-400 hover:text-blue-300 transition-colors",children:"Hardware Specification"}),e.jsx(G,{href:"/compression-explorer",className:"text-[11px] text-green-400 hover:text-green-300 transition-colors",children:"Compression State Explorer"}),e.jsx(G,{href:"/oscillating-quanta",className:"text-[11px] text-yellow-400 hover:text-yellow-300 transition-colors",children:"Theory of Compression States"}),e.jsx(G,{href:"/ce-code-writer",className:"text-[11px] text-pink-400 hover:text-pink-300 transition-colors",children:"CE→SE Code Writer"})]})]})]})}export{Ge as default};
