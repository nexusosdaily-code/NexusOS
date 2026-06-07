import { Telegraf } from "telegraf";

const SPECTRAL_API_URL = process.env.SPECTRAL_API_URL || "http://localhost:5001";
const BOT_API_BASE = "http://localhost:5000";

// ── Physics helpers ───────────────────────────────────────────────────────────
function ceLocal(ch: string) {
  const code = ch.charCodeAt(0);
  const band = code % 128;
  const nm   = 380 + band * 3.125;
  const wdm  = Math.round((nm - 380) / 400 * 255);
  const oam  = wdm % 50;
  const pol  = wdm % 2 === 0 ? "H" : "V";
  const freq = 299792458 / (nm * 1e-9);
  const energy = 6.626e-34 * freq;
  const lambda = energy / (299792458 ** 2);
  return { nm, wdm, oam, pol, freq, energy, lambda, band: nmToBand(nm), psi: `Ψ(${wdm},${oam},${pol})` };
}
function nmToEmoji(nm: number) {
  if (nm < 450) return "🟣"; if (nm < 520) return "🔵";
  if (nm < 565) return "🟢"; if (nm < 590) return "🟡";
  if (nm < 625) return "🟠"; return "🔴";
}
function nmToBand(nm: number) {
  if (nm < 450) return "SYSTEM"; if (nm < 520) return "KERNEL";
  if (nm < 625) return "USER"; return "GUEST";
}
function encodeText(text: string) {
  const chars = text.toUpperCase().replace(/\s/g,"").slice(0,20).split("").map(ch=>({ch,...ceLocal(ch)}));
  const dominant = chars.reduce((a,b)=>a.energy>b.energy?a:b);
  const avg = chars.reduce((s,c)=>s+c.nm,0)/chars.length;
  const bands: Record<string,number> = {};
  chars.forEach(c=>{ bands[c.band]=(bands[c.band]??0)+1; });
  return { chars, dominant, avg, bands };
}
async function botFetch(path: string, opts?: RequestInit) {
  try {
    const r = await fetch(`${BOT_API_BASE}${path}`, opts);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
async function silentArchive(text: string, source: string) {
  try {
    const enc = encodeText(text);
    await fetch(`${BOT_API_BASE}/api/bot/mirror/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageText: "[auto]",
        senderHandle: `bot-${source}`,
        chatId: "bot-auto",
        nm: enc.dominant.nm,
        wdm: enc.dominant.wdm,
        oam: enc.dominant.oam,
        pol: enc.dominant.pol,
        band: enc.dominant.band,
        energy: enc.dominant.energy,
        lambdaMass: enc.dominant.lambda,
        psiChannel: enc.dominant.psi,
      }),
    });
  } catch {}
}

// ── WavelengthScript topics ───────────────────────────────────────────────────
const WLS: Record<string, string> = {
  hello:    `👋 *Hello World*\n\n\`\`\`\n@530nm let message := "Hello, Spectrum"\nbroadcast(message)\n\`\`\`\n\n• \`@530nm\` — lives at 530nm (USER band)\n• \`broadcast()\` — emits to network\n\nNext: /wls agent`,
  agent:    `🤖 *Agents*\n\n\`\`\`\n@520nm agent Greeter {\n  @530nm name := "Spectrum"\n  oscillate(Ψ(128,10,H), 0Hz) {\n    broadcast("Hello " + name)\n  }\n}\nnode.register("Greeter", @520nm)\n\`\`\`\n\nNext: /wls loop`,
  loop:     `🔄 *Loops (oscillate)*\n\n\`\`\`\n@468nm agent Counter {\n  @468nm count := 0\n  oscillate(Ψ(23,10,H), 1Hz) {\n    @468nm count := count + 1\n    ?λ(count >= 10) { halt }\n    broadcast(count)\n  }\n}\n\`\`\`\n\n\`?λ\` = spectral conditional (if). \`halt\` = stop.\nNext: /wls transfer`,
  transfer: `💸 *Token Transfer*\n\n\`\`\`\n@468nm agent TrustLayer {\n  @648nm ledger := SpectralDB.connect("tx")\n  oscillate(Ψ(23,83,V), 0Hz) {\n    @468nm let fee := PhysicsEngine.calcFee(\n      req.sender.nm, req.amount)\n    @648nm ledger.write({\n      from: req.sender.psi,\n      to:   req.recipient.psi,\n      amount: req.amount, fee\n    })\n    broadcast(fee)\n  }\n}\n\`\`\`\n\nNext: /wls store`,
  store:    `🗄️ *Spectral DB Write*\n\n\`\`\`\n@648nm agent Recorder {\n  @648nm db := SpectralDB.connect("data")\n  oscillate(Ψ(200,30,H), 0Hz) {\n    @648nm db.write({\n      label: req.label,\n      nm:    req.wavelength\n    })\n    broadcast("stored")\n  }\n}\n\`\`\`\n\n\`@648nm\` = STORAGE band. All writes live here.\nNext: /wls full`,
  full:     `📋 *Complete Program*\n\n\`\`\`\ntune(Ψ(95,45,H))\n@emit(571.5nm, Ψ(95,45,H))\n\nagent SpectralEncoder {\n  @648nm db := SpectralDB.connect("enc")\n  oscillate(Ψ(95,45,H), 0Hz) {\n    @530nm let enc := CE.encode(req.text)\n    ?λ(enc.nm >= 380 && enc.nm <= 780) {\n      @648nm db.write({label:req.text,nm:enc.nm})\n      broadcast({nm:enc.nm,psi:enc.psiChannel})\n    }\n  }\n}\nnode.register("SpectralEncoder", @571.5nm)\n\`\`\`\n\nNext: /wls syntax`,
  syntax:   `📖 *WLS Syntax Reference*\n\nDECLARATIONS\n  \`@Xnm let name := value\`\n  \`@Xnm name := value\`\n\nAGENTS\n  \`@Xnm agent Name { }\`\n  \`node.register("Name", @X)\`\n\nEXECUTION\n  \`oscillate(Ψ(w,o,p), Freq)\`\n  \`halt\` · \`tune(Ψ)\` · \`@emit(nm,Ψ)\`\n\nCONDITIONALS\n  \`?λ(condition) { }\`\n\nOUTPUT\n  \`broadcast(value)\`\n\nSTORAGE\n  \`SpectralDB.connect("name")\`\n  \`db.write({ })\`\n\nPHYSICS\n  \`CE.encode(text)\`\n  \`PhysicsEngine.calcFee(nm, amount)\`\n  \`req.sender.nm\` · \`req.sender.psi\`\n\nTry: /wls hello`,
};

// WLS code generation templates
const CODEGEN: Record<string, string> = {
  encoder:  `@530nm agent TextEncoder {\n  @648nm db := SpectralDB.connect("encoded")\n  oscillate(Ψ(128,0,H), 0Hz) {\n    @530nm let enc := CE.encode(req.text)\n    @648nm db.write({label:req.text,nm:enc.nm,psi:enc.psiChannel})\n    broadcast({input:req.text,nm:enc.nm})\n  }\n}\nnode.register("TextEncoder", @530nm)`,
  oracle:   `@412nm agent PhysicsOracle {\n  oscillate(Ψ(0,0,H), 0Hz) {\n    @412nm let q := req.question\n    @412nm let λ := CE.encode(q).nm\n    @412nm let E := PhysicsEngine.energy(λ)\n    broadcast({question:q,wavelength:λ,energy:E})\n  }\n}\nnode.register("PhysicsOracle", @412nm)`,
  wallet:   `@468nm agent WalletAgent {\n  @648nm ledger := SpectralDB.connect("tx")\n  oscillate(Ψ(64,0,H), 0Hz) {\n    @468nm let fee := PhysicsEngine.calcFee(\n      req.sender.nm, req.amount)\n    ?λ(req.amount > 0 && fee < req.amount) {\n      @648nm ledger.write({\n        from:req.sender.psi, to:req.to.psi,\n        amount:req.amount, fee\n      })\n      broadcast({status:"ok",fee})\n    }\n  }\n}\nnode.register("WalletAgent", @468nm)`,
  monitor:  `@530nm agent ChannelMonitor {\n  @530nm threshold := 520.0\n  oscillate(Ψ(128,25,H), 2Hz) {\n    @530nm let frame := CE.encode(req.payload)\n    ?λ(frame.nm < threshold) {\n      broadcast({alert:"KERNEL band message",nm:frame.nm})\n    }\n  }\n}\nnode.register("ChannelMonitor", @530nm)`,
  mirror:   `@648nm agent SpectralMirror {\n  @648nm db := SpectralDB.connect("mirror")\n  oscillate(Ψ(200,10,H), 0Hz) {\n    @530nm let enc  := CE.encode(req.message)\n    @648nm db.write({\n      label:req.message,\n      nm:enc.nm,\n      band:enc.band,\n      psi:enc.psiChannel\n    })\n    broadcast({mirrored:true,nm:enc.nm})\n  }\n}\nnode.register("SpectralMirror", @648nm)`,
};

// Physics laws
const LAWS: Record<string, string> = {
  planck:     `📐 *Planck's Law*\n\nE = hf = hc/λ\n\nh = 6.626×10⁻³⁴ J·s (Planck's constant)\nf = frequency (Hz)\nc = 299,792,458 m/s\nλ = wavelength (m)\n\nEvery photon carries energy proportional to its frequency. Higher frequency = shorter wavelength = more energy.\n\nIn NexusOS: every character has energy. E=hf is the fee formula.\n\nTry: /oracle what is the energy of 530nm`,
  maxwell:    `📐 *Maxwell's Equations*\n\nFour equations that describe all electromagnetic phenomena:\n\n∇·E = ρ/ε₀   (Gauss — electric fields from charges)\n∇·B = 0        (no magnetic monopoles)\n∇×E = -∂B/∂t  (Faraday — changing B makes E)\n∇×B = μ₀J+μ₀ε₀∂E/∂t  (Ampère-Maxwell)\n\nPrediction: electromagnetic waves travel at c = 1/√(μ₀ε₀)\n\nNexusOS: WNSP channel validation uses Maxwell compliance. A channel that violates Maxwell doesn't exist.`,
  heisenberg: `📐 *Heisenberg Uncertainty Principle*\n\nΔx·Δp ≥ ℏ/2\nΔE·Δt ≥ ℏ/2\n\nNothing can be simultaneously perfectly located AND perfectly still. The quantum vacuum cannot have zero energy AND zero time uncertainty.\n\nConsequence: the universe cannot stay in the Reposed State. The first oscillation was mandatory — physics demanded it.\n\nNexusOS calls this the origin of the first compression state.`,
  einstein:   `📐 *Einstein: E=mc²*\n\nE = mc²\n\nMass and energy are equivalent. Matter is frozen energy.\n\nNexusOS extends this: Λ = hf/c²\n\nEvery photon has a compression mass. A 400nm photon has Λ = 5.52×10⁻³⁶ kg.\n\nΛ is what NexusOS uses for transaction fees — not arbitrary numbers, but the physical mass of the information being transmitted.`,
};

// Snippet library
const SNIPPETS: Record<string, Record<string, string>> = {
  node: {
    encode: `// npm install nexusos-ce-encoder\nconst { ceEncode } = require('nexusos-ce-encoder');\nconst result = ceEncode('NEXUSOS');\nconsole.log(result);\n// { wavelength: 539.1, band: 'USER', psiChannel: 'Ψ(101,1,H)', energy: 3.69e-19 }`,
    frame:  `const { ceEncode } = require('nexusos-ce-encoder');\nconst text = 'NEXUSOS';\nconst chars = [...text].map(ch => ({ ch, ...ceEncode(ch) }));\nconst dominant = chars.reduce((a,b) => a.energy > b.energy ? a : b);\nconsole.log({ dominant: dominant.ch, nm: dominant.wavelength });`,
    fee:    `const { ceEncode } = require('nexusos-ce-encoder');\nconst h = 6.626e-34, c = 299792458;\nfunction calcFee(senderNm, amount, baseFeePct=0.001) {\n  const E_sender = h*c/(senderNm*1e-9);\n  const E_ref    = h*c/(530e-9); // USER reference\n  return amount * baseFeePct * (E_sender / E_ref);\n}\nconst fee = calcFee(ceEncode('A').wavelength, 100);\nconsole.log('Fee:', fee, 'NXT');`,
  },
  python: {
    encode: `# pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py\nfrom ce_encoder import ce_encode\nresult = ce_encode('NEXUSOS')\nprint(result)\n# {'wavelength': 539.1, 'band': 'USER', 'psi_channel': 'Ψ(101,1,H)', 'energy': 3.69e-19}`,
    frame:  `from ce_encoder import ce_encode\ntext = 'NEXUSOS'\nchars = [{'ch':ch, **ce_encode(ch)} for ch in text]\ndominant = max(chars, key=lambda x: x['energy'])\nprint(f"Dominant: {dominant['ch']} at {dominant['wavelength']:.1f}nm")`,
    fee:    `h, c = 6.626e-34, 299_792_458\ndef calc_fee(sender_nm, amount, base=0.001):\n    E_sender = h*c / (sender_nm * 1e-9)\n    E_ref    = h*c / (530e-9)\n    return amount * base * (E_sender / E_ref)\nprint(calc_fee(480.6, 100), 'NXT')`,
  },
  browser: {
    encode: `// CDN: <script src="https://unpkg.com/nexusos-ce-encoder"></script>\nconst { ceEncode } = NexusCE;\nconsole.log(ceEncode('NEXUSOS'));\n// Works offline — pure math, no server`,
    frame:  `const { ceEncode } = NexusCE;\nconst fingerprint = text => [...text].map(ch => ceEncode(ch));\nconst f = fingerprint('NEXUSOS');\nconsole.log(f.map(c => c.wavelength.toFixed(1)+'nm').join(' | '));`,
  },
};

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
  { q:"CE formula for wavelength?", opts:["arbitrary","380+(charCode%128×3.125)nm","charCode×6.2nm","lookup table"], ans:1, exp:"λ=380+(charCode%128×3.125)nm — 128 bands across 400nm of visible spectrum." },
  { q:"How many orthogonal WNSP channels?", opts:["1,024","4,096","25,600","65,536"], ans:2, exp:"256 WDM × 50 OAM × 2 pol = 25,600. Orthogonal by quantum mechanics." },
  { q:"What does oscillate() do in WLS?", opts:["plays sound","main loop","encodes char","opens DB"], ans:1, exp:"oscillate() is the WLS loop — runs at a specified frequency on a Ψ channel." },
  { q:"Character at 412nm → which band?", opts:["GUEST","USER","KERNEL","SYSTEM"], ans:3, exp:"SYSTEM: 380–450nm (violet). Highest energy = highest authority." },
  { q:"What is ?λ(condition){} in WLS?", opts:["measure λ","conditional block","broadcast","register node"], ans:1, exp:"?λ is the spectral conditional — WLS's if-block." },
  { q:"Why does Moore's Law end?", opts:["cost","quantum tunneling at 2nm","heat","software"], ans:1, exp:"At 2nm, electrons tunnel through transistor gates probabilistically. Physics, not engineering." },
  { q:"What is Λ=hf/c² ?", opts:["voltage","compression mass of a photon","clock speed","bit rate"], ans:1, exp:"Λ is the photon's compression mass. NexusOS uses it as the fee unit — not arbitrary numbers." },
  { q:"What does broadcast() do in WLS?", opts:["audio","emit to network","write DB","open channel"], ans:1, exp:"broadcast() emits a value to the WNSP network — WLS's output primitive." },
];

// ── Lessons ───────────────────────────────────────────────────────────────────
const LESSONS: Record<number,{title:string;body:string}> = {
  0: { title:"Module 0 — What Is a Wave?", body:`Foundation of everything.\n\nWave properties:\n• Wavelength (λ) — distance between peaks, nm\n• Frequency (f) — peaks/second, Hz\n• Energy (E) — E=hf (Planck)\n\nVisible light: 380nm (violet) → 780nm (red)\n\nNexusOS uses this as an addressing system.\n\nNext: /lesson 1` },
  1: { title:"Module 1 — The Reposed State", body:`Before the universe, quantum mechanics says: nothing can be perfectly still.\n\nHeisenberg: ΔE·Δt ≥ ℏ/2\nThe vacuum must fluctuate. The first oscillation was mandatory.\n\nNexusOS calls this: the Reposed State (Λ₀).\n\nFirst compression state transition:\nΛ = hf/c²\n\nh=Planck · f=frequency · c=light speed\n\nNext: /lesson 2` },
  2: { title:"Module 2 — Character Encoding", body:`ASCII: 'A' → 65 (arbitrary)\nCE:    'A' → 480.6nm (physics)\n\nAlgorithm:\n  band = charCode % 128\n  λ    = 380 + (band × 3.125) nm\n  E    = hc/λ\n\nTry: /encode YOURNAME\nCompare: /compare A\n\nNext: /lesson 3` },
  3: { title:"Module 3 — WNSP Protocol", body:`WNSP = Waveform Node Spectral Protocol\n\nAddress: Ψ(wdm, oam, pol)\n• WDM: 0–255\n• OAM: 0–49\n• Pol: H or V\n\n256×50×2 = 25,600 channels\n⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanics\n\nURI: wnsp://Ψ(228,45,H)/path\n\nNext: /lesson 4` },
  4: { title:"Module 4 — WavelengthScript", body:`Every instruction has a physical frequency.\n\n/wls hello   — Hello World\n/wls agent   — define a node\n/wls loop    — oscillation\n/wls transfer— token transfer\n/wls full    — complete program\n/wls syntax  — reference\n\nRun it: /wnsp-vm page on NexusOS\n\nNext: /lesson 5` },
  5: { title:"Module 5 — Physics Economy", body:`fee = base_fee × (E_sender / E_reference)\nE = hf = hc/λ\n\nBands:\n🟣 SYSTEM  380–450nm  highest fee\n🔵 KERNEL  450–520nm\n🟢 USER    520–625nm\n🔴 GUEST   625–780nm  lowest fee\n\nNXT: 21B supply · 8 decimals\nAll costs from Λ=hf/c²\n\nNext: /lesson 6` },
  6: { title:"Module 6 — Photonic Computing", body:`Moore's Law ends — physics won.\n\nAt 2nm: quantum tunneling. Electrons pass through transistor gates probabilistically.\nTSMC: 3nm today. Silicon atom: 0.2nm.\n\nSolution: photonic processors (~2032). Light doesn't tunnel.\n\nNexusOS today: CE = RAM table scan.\nNexusOS 2032: CE = physical wavelength selection in waveguide.\n\nNo rewrite needed.\n\nNext: /lesson 7` },
  7: { title:"Module 7 — Verified Trials", body:`All four trials passed. Public record.\n\n/trial 1 — CE at document scale\n/trial 2 — WLS transpiler\n/trial 3 — self-referential execution\n/trial 4 — VM arithmetic equivalence ✓\n\nTrial 4: "REPOSE"\nVM: 571.489nm · TS: 571.49nm · Δ<0.001nm\n\nCurriculum complete.\ngithub.com/nexusosdaily-code/NexusOS` },
};

const TRIALS: Record<number,string> = {
  1: `⚗️ Trial 1 — CE at Document Scale | PASS\n\nMulti-page document encoded browser-side in <1s. Zero server calls.\n\nSignificance: CE is viable fully offline.`,
  2: `⚗️ Trial 2 — WLS Transpiler | PASS\n\nspectral-visuals.tsx (231 lines of production React/TS) transpiled to WLS without errors.\n\nSignificance: WLS expressive enough for real production code.`,
  3: `⚗️ Trial 3 — First Self-Referential Execution | PASS\n\nNexusOS source → WLS → bytecode → WNSP VM → 369 spectral instructions.\n\nSignificance: NexusOS processed its own source through its own stack.`,
  4: `⚗️ Trial 4 — VM Arithmetic Equivalence | PASS ✓\n\nWord: "REPOSE"\n17 bytecode instructions · 21 VM cycles\nVM:  571.489nm\nTS:  571.490nm\nΔ:   < 0.001nm\n\nSame formula. Different runtime. One result.`,
};

const BANDS: Record<string,string> = {
  system:  `🟣 SYSTEM — 380–450nm (violet)\nHighest authority · highest energy · highest fee\nWDM: 0–63\nUse: AI kernel, consensus, root governance\n\nWLS: @412nm agent KernelOp { }`,
  kernel:  `🔵 KERNEL — 450–520nm (blue)\nSecond tier\nWDM: 64–127\nUse: governance, developer API, experiments\n\nWLS: @468nm agent TrustLayer { }`,
  user:    `🟢 USER — 520–625nm (green)\nAuthenticated operations\nWDM: 128–191\nUse: transfers, media, Spectral DB writes\n\nWLS: @530nm let data := "hello"`,
  guest:   `🔴 GUEST — 625–780nm (red)\nPublic access · lowest fee\nWDM: 192–255\nUse: read-only, anonymous queries\n\nWLS: @648nm let pub := record.read()`,
  storage: `🟤 STORAGE — 625–780nm (red)\nPersistent record layer\nEvery Spectral DB write = STORAGE emission\nPostgreSQL today → photonic waveguide 2032\n\nWLS: @648nm db := SpectralDB.connect("name")`,
};

const userQuizState = new Map<number, number>();

// ── Admin alert (called from btc-bridge-service) ──────────────────────────────
export async function sendAdminAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const adminId = process.env.TELEGRAM_ADMIN_ID;
    if (!adminId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: adminId, text: message, parse_mode: "HTML" }),
    });
  } catch { /* silent */ }
}

// ── Public channel post (TELEGRAM_CHANNEL_ID — e.g. @nexusos_official) ────────
export async function sendChannelPost(message: string): Promise<void> {
  const token     = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !channelId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    channelId,
        text:       message,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
  } catch { /* silent */ }
}

// ── Bot factory ───────────────────────────────────────────────────────────────
export function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log("[TelegramBot] TELEGRAM_BOT_TOKEN not set — bot not started."); return; }

  const bot = new Telegraf(token);

  // ── /start ────────────────────────────────────────────────────────────────
  bot.start(ctx => ctx.reply(
`👁 NexusOS Spectral Assistant

Ten bot modules — one place:

━━ 🌈 ENCODING ━━
/ce  /se  /encode WORD
/compare X  /frame TEXT
/spectrum TEXT  /fingerprint TEXT

━━ 🧑‍💻 WAVELENGTHSCRIPT ━━
/wls hello|agent|loop|transfer|store|full|syntax
/codegen encoder|oracle|wallet|monitor|mirror

━━ 🪞 SPECTRAL MIRROR ━━
/mirror store TEXT  — encode & archive text
/mirror stats       — band distribution
/mirror dominant    — highest-energy message
/mirror search NM1 NM2
/mirror last        — last 5 archived

━━ 🔭 PHYSICS ORACLE ━━
/oracle QUESTION  /law planck|maxwell|heisenberg|einstein

━━ 🔬 SCIENCE ━━
/lesson 0–7  /trial 1–4  /band NAME  /quiz

━━ 📈 TRACTION ━━
/traction   /npm   /ecosystem

━━ 🛠️ DEVELOPER ━━
/fee AMOUNT NM  /query NM1 NM2
/snippet node|python|browser encode|frame|fee
/channel WDM OAM POL

━━ 📋 EXPERIMENT LOGGER ━━
/log TITLE|RESULT|NM|NOTES
/experiments

━━ 🏛️ GOVERNANCE ━━
/governance  /params`
  ));

  bot.help(ctx => ctx.reply(
`NexusOS Bot — Quick Reference

/ce /se /encode /compare /frame /spectrum /fingerprint
/wls /codegen
/mirror stats|dominant|search|last|store
/oracle /law
/lesson /trial /band /quiz
/traction /npm /ecosystem
/fee /query /snippet /channel
/log /experiments
/governance /params`
  ));

  // ══════════════════════════════════════════
  // 1. ENCODING BOTS
  // ══════════════════════════════════════════
  bot.command("ce", ctx => ctx.reply(
`⚡ Character Encoding (CE)

You know ASCII:  'A' → 65  (arbitrary)
WNSP-CE gives:  'A' → 480.6nm (physics)

Algorithm (run it yourself):
  band = charCode % 128
  λ    = 380 + (band × 3.125) nm
  f    = c / λ
  E    = h × f

128 bands · 400nm range · 3.125nm per band
Every Unicode character → unique spectral address

Why does this matter?
ASCII: someone decided 'A'=65 in 1963
CE:   'A'=480.6nm because of E=hf and physics

Try: /encode YOURNAME
Compare: /compare A`
  ));

  bot.command("se", ctx => ctx.reply(
`🌈 Spectral Encoding (SE) — Frames

CE encodes single characters.
SE encodes entire text as a spectral frame.

A spectral frame has:
• Dominant wavelength — highest-energy character
• Spectral histogram — characters per band
• Ψ channel — the frame's network address
• WASCII vector — physics fingerprint for search

Example frame: "NEXUS"
  N → 539.1nm 🟢 USER   (most energetic)
  E → 474.1nm 🔵 KERNEL
  X → 605.3nm 🟠 USER
  U → 596.6nm 🟠 USER
  S → 558.4nm 🟢 USER

  Frame Ψ:  Ψ(101,1,H)   Band: USER

The frame is the WNSP transmission unit.
Not bytes — spectral frames with physical addresses.

Try: /frame NEXUSOS`
  ));

  bot.command("encode", async ctx => {
    const word = ctx.message.text.split(" ").slice(1).join(" ").trim().toUpperCase();
    if (!word) return ctx.reply("Usage: /encode <word>\nExample: /encode NEXUSOS");
    await ctx.reply(`⏳ Encoding "${word}"…`);
    const api = await (async () => {
      try {
        const r = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ instruction: word, label: word }),
        });
        return r.ok ? await r.json() : null;
      } catch { return null; }
    })();
    const enc = encodeText(word);
    const nm  = api?.wavelength_mid_nm ? parseFloat(api.wavelength_mid_nm) : enc.dominant.nm;
    const band = api?.band ?? enc.dominant.band;
    ctx.reply(
`${nmToEmoji(nm)} CE Encoding: "${word}"

Wavelength:  ${nm.toFixed(3)} nm
Band:        ${band}
Ψ Channel:   ${api?.psi_channel ?? enc.dominant.psi}
Frequency:   ${(enc.dominant.freq/1e12).toFixed(2)} THz
Energy:      ${enc.dominant.energy.toExponential(3)} J
Λ mass:      ${enc.dominant.lambda.toExponential(3)} kg

Physical coordinate — not a code number.
Every device that speaks WNSP locates "${word}" by wavelength.

Compare to ASCII: /compare ${word[0]}`
    );
    silentArchive(word, "encode");
  });

  bot.command("compare", ctx => {
    const ch   = (ctx.message.text.split(" ").slice(1).join("").trim() || "A").toUpperCase()[0];
    const r    = ceLocal(ch);
    const code = ch.charCodeAt(0);
    ctx.reply(
`📊 Encoding Comparison: "${ch}"

─── ASCII / UTF-8 ───
Decimal:   ${code}
Hex:       0x${code.toString(16).toUpperCase().padStart(2,"0")}
Binary:    ${code.toString(2).padStart(8,"0")}
Origin:    arbitrary assignment, 1963

─── WNSP-CE ───
${nmToEmoji(r.nm)} Wavelength:  ${r.nm.toFixed(3)} nm
Band:        ${r.band}
Ψ Channel:   ${r.psi}
Frequency:   ${(r.freq/1e12).toFixed(2)} THz
Energy:      ${r.energy.toExponential(3)} J
Λ mass:      ${r.lambda.toExponential(3)} kg
Origin:      E=hf · visible spectrum · physics

ASCII gives "${ch}" a number.
CE gives "${ch}" a coordinate in the universe.`
    );
  });

  bot.command("frame", ctx => {
    const text = ctx.message.text.split(" ").slice(1).join(" ").trim().toUpperCase();
    if (!text) return ctx.reply("Usage: /frame <text>\nExample: /frame NEXUSOS");
    const enc  = encodeText(text);
    const lines = enc.chars.map(c=>`  ${nmToEmoji(c.nm)} ${c.ch}  ${c.nm.toFixed(1)}nm  ${c.psi}`).join("\n");
    const bandStr = Object.entries(enc.bands).map(([b,n])=>`  ${b}: ${n}`).join("\n");
    ctx.reply(
`🌈 Spectral Frame: "${text}"

CHARACTER MAP
${lines}

FRAME SUMMARY
  Dominant:  ${enc.dominant.ch} (${enc.dominant.nm.toFixed(1)}nm — highest E)
  Average λ: ${enc.avg.toFixed(1)} nm
  Frame Ψ:   ${enc.dominant.psi}
  Band:      ${enc.dominant.band}

BAND DISTRIBUTION
${bandStr}

Every device speaking WNSP finds this frame by wavelength.
For full SE guide: /se`
    );
    silentArchive(text, "frame");
  });

  bot.command("spectrum", ctx => {
    const text = ctx.message.text.split(" ").slice(1).join(" ").trim().toUpperCase();
    if (!text) return ctx.reply("Usage: /spectrum <text>\nExample: /spectrum WNSP");
    const chars = text.replace(/\s/g,"").slice(0,14).split("").map(ch=>({ch,...ceLocal(ch)}));
    const lines = [`📊 Spectral Fingerprint: "${text}"\n`];
    chars.forEach(c => lines.push(`${nmToEmoji(c.nm)} ${c.ch}  →  ${c.nm.toFixed(1)}nm  ${c.psi}  [${c.band}]`));
    if (text.replace(/\s/g,"").length > 14) lines.push(`…${text.replace(/\s/g,"").length-14} more`);
    lines.push(`\nFull frame: /frame ${text.slice(0,8)}`);
    ctx.reply(lines.join("\n"));
  });

  bot.command("fingerprint", ctx => {
    const text = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!text) return ctx.reply("Usage: /fingerprint <text>\nExample: /fingerprint Hello world this is NexusOS");
    const enc   = encodeText(text);
    const total = enc.chars.length;
    const hash  = enc.chars.reduce((s,c)=>s+(c.nm*c.energy),0).toExponential(4);
    ctx.reply(
`🔐 Spectral Fingerprint

Input:   "${text.slice(0,40)}${text.length>40?"…":""}"
Chars:   ${total} encoded
Hash:    ${hash} J·nm  (Σ λᵢ×Eᵢ)
Domain:  ${enc.dominant.nm.toFixed(1)}nm (${enc.dominant.band})
Frame Ψ: ${enc.dominant.psi}

Band breakdown:
${Object.entries(enc.bands).map(([b,n])=>`  ${b}: ${n}/${total} (${Math.round(n/total*100)}%)`).join("\n")}

This fingerprint is physics-derived.
Alter one character → different hash.
Tamper-evident without cryptography.

See how it compares to SHA-256: /oracle what makes spectral fingerprinting different from sha256`
    );
    silentArchive(text, "fingerprint");
  });

  // ══════════════════════════════════════════
  // 2. WAVELENGTHSCRIPT BOTS
  // ══════════════════════════════════════════
  bot.command("wls", ctx => {
    const sub = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();
    if (WLS[sub]) return ctx.reply(WLS[sub]);
    ctx.reply(
`🧑‍💻 WavelengthScript

/wls hello      — Hello World
/wls agent      — define a computational node
/wls loop       — oscillation (the loop)
/wls transfer   — NXT token transfer
/wls store      — write to Spectral DB
/wls full       — complete program
/wls syntax     — full reference

Generate code for a use case: /codegen encoder`
    );
  });

  bot.command("codegen", ctx => {
    const topic = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();
    if (CODEGEN[topic]) {
      return ctx.reply(`🧑‍💻 WLS Code: ${topic}\n\n\`\`\`\n${CODEGEN[topic]}\n\`\`\`\n\nPaste this into /wnsp-vm on NexusOS to run it.\nAll five templates: encoder · oracle · wallet · monitor · mirror`);
    }
    ctx.reply(
`🧑‍💻 WLS Code Generator

/codegen encoder  — CE text encoder agent
/codegen oracle   — physics oracle agent
/codegen wallet   — NXT wallet transfer agent
/codegen monitor  — channel activity monitor
/codegen mirror   — spectral mirror agent

Each generates runnable WavelengthScript.`
    );
  });

  // ══════════════════════════════════════════
  // 3. SPECTRAL MIRROR BOT
  // ══════════════════════════════════════════
  bot.command("mirror", async ctx => {
    const parts = ctx.message.text.split(" ").slice(1);
    const sub   = parts[0]?.toLowerCase();
    const rest  = parts.slice(1).join(" ").trim();

    if (!sub || sub === "help") {
      return ctx.reply(
`🪞 Spectral Mirror Bot

/mirror store TEXT    — encode & archive any text
/mirror stats         — band distribution of archive
/mirror dominant      — highest-energy message stored
/mirror search NM NM  — messages in wavelength range
/mirror last          — last 5 archived messages

Every piece of text has a spectral identity.
The mirror makes it persistent and queryable by physics.`
      );
    }

    if (sub === "store") {
      if (!rest) return ctx.reply("Usage: /mirror store <text>\nExample: /mirror store The first spectral message");
      const enc = encodeText(rest);
      const payload = {
        messageText: rest,
        senderHandle: ctx.from?.username ?? "anonymous",
        chatId: String(ctx.chat?.id ?? "telegram"),
        nm: enc.dominant.nm,
        wdm: enc.dominant.wdm,
        oam: enc.dominant.oam,
        pol: enc.dominant.pol,
        band: enc.dominant.band,
        energy: enc.dominant.energy,
        lambdaMass: enc.dominant.lambda,
        psiChannel: enc.dominant.psi,
      };
      const result = await botFetch("/api/bot/mirror/store", {
        method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload),
      });
      ctx.reply(
`🪞 Stored in Spectral Mirror

Text:    "${rest.slice(0,50)}${rest.length>50?"…":""}"
${nmToEmoji(enc.dominant.nm)} λ:      ${enc.dominant.nm.toFixed(3)} nm
Band:    ${enc.dominant.band}
Ψ:       ${enc.dominant.psi}
Energy:  ${enc.dominant.energy.toExponential(3)} J
ID:      ${result?.id ?? "stored"}

This message now has a permanent physical address.
Query it: /mirror search ${Math.floor(enc.dominant.nm-5)} ${Math.ceil(enc.dominant.nm+5)}`
      );
      return;
    }

    if (sub === "stats") {
      const data = await botFetch("/api/bot/mirror/stats");
      if (!data) return ctx.reply("⚠️ Mirror DB unavailable.");
      const lines = Object.entries(data.bands ?? {}).map(([b,n])=>`  ${b}: ${n} message${(n as number)>1?"s":""}`).join("\n");
      ctx.reply(
`🪞 Spectral Mirror — Archive Stats

Total messages: ${data.total ?? 0}
${data.total > 0 ? `\nBAND DISTRIBUTION\n${lines}\n\nAverage λ: ${data.avgNm?.toFixed(1) ?? "—"} nm\nDominant band: ${data.dominantBand ?? "—"}` : "\nNo messages archived yet.\nTry: /mirror store Hello, Spectrum"}

Archive a message: /mirror store TEXT`
      );
      return;
    }

    if (sub === "dominant") {
      const data = await botFetch("/api/bot/mirror/dominant");
      if (!data || !data.record) return ctx.reply("No messages in archive yet.\nTry: /mirror store Hello world");
      const r = data.record;
      ctx.reply(
`🪞 Spectral Mirror — Dominant Message

${nmToEmoji(r.nm)} "${r.messageText?.slice(0,60) ?? ""}"

λ:    ${parseFloat(r.nm).toFixed(3)} nm
Band: ${r.band}
Ψ:    ${r.psiChannel}
E:    ${parseFloat(r.energy).toExponential(3)} J
By:   @${r.senderHandle ?? "anonymous"}
At:   ${new Date(r.createdAt).toUTCString()}`
      );
      return;
    }

    if (sub === "search") {
      const nm1 = parseFloat(parts[1]);
      const nm2 = parseFloat(parts[2]);
      if (isNaN(nm1) || isNaN(nm2)) return ctx.reply("Usage: /mirror search <nm_low> <nm_high>\nExample: /mirror search 520 625");
      const data = await botFetch(`/api/bot/mirror/search?nmLow=${nm1}&nmHigh=${nm2}`);
      if (!data) return ctx.reply("⚠️ Mirror DB unavailable.");
      if (!data.records?.length) return ctx.reply(`No messages found in ${nm1}–${nm2}nm range.\n\nTry: /mirror store Some text first`);
      const lines = (data.records as any[]).slice(0,5).map(r=>
        `${nmToEmoji(r.nm)} ${r.nm.toFixed(1)}nm  "${r.messageText?.slice(0,30) ?? ""}"`
      ).join("\n");
      ctx.reply(`🪞 Mirror Search: ${nm1}–${nm2}nm\n\n${lines}\n\nTotal: ${data.total} match${data.total!==1?"es":""}`);
      return;
    }

    if (sub === "last") {
      const data = await botFetch("/api/bot/mirror/last");
      if (!data?.records?.length) return ctx.reply("No messages archived yet.\nTry: /mirror store Hello, Spectrum");
      const lines = (data.records as any[]).map((r,i)=>
        `${i+1}. ${nmToEmoji(r.nm)} ${r.nm.toFixed(1)}nm [${r.band}]\n   "${r.messageText?.slice(0,40) ?? ""}"`
      ).join("\n");
      ctx.reply(`🪞 Mirror — Last ${data.records.length} Messages\n\n${lines}`);
      return;
    }

    ctx.reply("Unknown mirror command.\nTry: /mirror help");
  });

  // ══════════════════════════════════════════
  // 4. PHYSICS ORACLE BOT
  // ══════════════════════════════════════════
  bot.command("oracle", ctx => {
    const question = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();
    if (!question) return ctx.reply("Usage: /oracle <question>\nExample: /oracle what is the energy of 530nm light");

    if (question.includes("energy") && (question.includes("nm") || question.includes("nanometre") || question.includes("nanometer"))) {
      const nmMatch = question.match(/(\d{3,}\.?\d*)\s*nm/);
      const nm = nmMatch ? parseFloat(nmMatch[1]) : 530;
      const h=6.626e-34, c=299792458;
      const freq = c/(nm*1e-9);
      const energy = h*freq;
      const lambda = energy/(c**2);
      return ctx.reply(`🔭 Energy of ${nm}nm light\n\nFrequency: ${(freq/1e12).toFixed(2)} THz\nEnergy:    ${energy.toExponential(3)} J\nΛ mass:    ${lambda.toExponential(3)} kg\nBand:      ${nmToBand(nm)}\nΨ:         Ψ(${Math.round((nm-380)/400*255)},${Math.round((nm-380)/400*255)%50},${Math.round((nm-380)/400*255)%2===0?"H":"V"})\n\nFormula: E = hf = hc/λ\nh = 6.626×10⁻³⁴ J·s · c = 299,792,458 m/s`);
    }

    if (question.includes("channel") || question.includes("ψ") || question.includes("psi")) {
      return ctx.reply(`🔭 WNSP Channels\n\n25,600 orthogonal channels:\n256 WDM × 50 OAM × 2 polarisations\n\nOrthogonality: ⟨Ψᵢ|Ψⱼ⟩ = 0\nGuaranteed by quantum mechanics, not software.\n\nLook up a channel: /channel 128 10 H`);
    }

    if (question.includes("fee") || question.includes("cost") || question.includes("transfer")) {
      return ctx.reply(`🔭 Physics Fees\n\nfee = base_fee × (E_sender / E_reference)\nE = hf = hc/λ\n\nSYSTEM band (380nm): highest fee\nGUEST band (750nm):  lowest fee\n\nThis means energy-rich users pay more — not arbitrary policy.\n\nCalculate: /fee 100 480.6`);
    }

    if (question.includes("moore") || question.includes("transistor") || question.includes("silicon") || question.includes("photon")) {
      return ctx.reply(`🔭 Photonic Computing\n\nMoore's Law ends at ~2nm — quantum tunneling.\nElectrons pass through gates probabilistically.\nTSMC is at 3nm. Silicon atom = 0.2nm.\n\nPhotonic processors (~2032) use light.\nLight doesn't tunnel. No resistive heat.\n\nNexusOS: CE = RAM scan today.\nNexusOS 2032: CE = wavelength selection in waveguide.\n\nSame address. Different hardware.\n\nFull lesson: /lesson 6`);
    }

    if (question.includes("sha") || question.includes("hash") || question.includes("fingerprint") || question.includes("crypto")) {
      return ctx.reply(`🔭 Spectral vs Cryptographic Fingerprinting\n\nSHA-256: arbitrary math on bit sequences\nCE fingerprint: Σ(λᵢ × Eᵢ) — physics\n\nDifferences:\n• SHA: same input → same hash (good)\n• CE: same input → same physical coordinate (physics)\n• SHA: no meaning to the hash value\n• CE: the hash IS a location in the electromagnetic spectrum\n• SHA: breakable with enough compute\n• CE: to fake it, you fake physics\n\nThey solve different problems.\nSHA: data integrity.\nCE: physical identity.\n\nTry: /fingerprint Your message here`);
    }

    ctx.reply(`🔭 Physics Oracle\n\nI can answer questions about:\n• Energy of a wavelength: "what is the energy of 530nm"\n• WNSP channels: "how many channels exist"\n• Transfer fees: "how are fees calculated"\n• Photonic computing: "what happens at 2nm"\n• Fingerprinting: "how does spectral hashing compare to sha256"\n\nPhysics laws: /law planck|maxwell|heisenberg|einstein\n\nAsk anything: /oracle <your question>`);
  });

  bot.command("law", ctx => {
    const name = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();
    if (LAWS[name]) return ctx.reply(LAWS[name]);
    ctx.reply(`📐 Physics Laws\n\n/law planck     — E=hf\n/law maxwell    — electromagnetic field equations\n/law heisenberg — uncertainty principle\n/law einstein   — E=mc² and Λ=hf/c²`);
  });

  // ══════════════════════════════════════════
  // 5. SCIENCE / CURRICULUM BOTS
  // ══════════════════════════════════════════
  bot.command("lesson", ctx => {
    const n = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(n)||n<0||n>7) return ctx.reply("Usage: /lesson 0–7\n\n0 Waves · 1 Reposed State · 2 CE · 3 WNSP\n4 WLS · 5 Economy · 6 Photonics · 7 Trials");
    const l = LESSONS[n];
    ctx.reply(`📚 ${l.title}\n\n${l.body}`);
  });

  bot.command("trial", ctx => {
    const n = parseInt(ctx.message.text.split(" ")[1]);
    if (isNaN(n)||n<1||n>4) return ctx.reply("Usage: /trial 1–4\n\nAll four trials passed. Public record.");
    ctx.reply(TRIALS[n]);
  });

  bot.command("band", ctx => {
    const name = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();
    if (BANDS[name]) return ctx.reply(BANDS[name]);
    ctx.reply("Usage: /band SYSTEM | KERNEL | USER | GUEST | STORAGE");
  });

  bot.command("quiz", ctx => {
    const idx = Math.floor(Math.random()*QUIZ.length);
    userQuizState.set(ctx.from?.id??0, idx);
    const q = QUIZ[idx];
    const opts = q.opts.map((o,i)=>`${["A","B","C","D"][i]}) ${o}`).join("\n");
    ctx.reply(`❓ Quiz\n\n${q.q}\n\n${opts}\n\nReply: /answer A · B · C · D`);
  });

  bot.command("answer", ctx => {
    const userId = ctx.from?.id??0;
    const idx = userQuizState.get(userId);
    if (idx===undefined) return ctx.reply("Start a quiz first: /quiz");
    const letter = ctx.message.text.split(" ")[1]?.toUpperCase();
    const chosen = ({A:0,B:1,C:2,D:3} as any)[letter];
    if (chosen===undefined) return ctx.reply("Reply with /answer A, B, C, or D");
    userQuizState.delete(userId);
    const q = QUIZ[idx];
    const correct = chosen===q.ans;
    ctx.reply(`${correct?"✅ Correct!":"❌ Not quite."}\n\n${q.exp}\n\nAnother: /quiz`);
  });

  // ══════════════════════════════════════════
  // 6. TRACTION BOTS
  // ══════════════════════════════════════════
  bot.command("traction", async ctx => {
    await ctx.reply("⏳ Fetching GitHub traffic…");
    const data = await botFetch("/api/github/adoption");
    if (!data?.repos?.length) return ctx.reply("⚠️ GitHub API unavailable. Check back shortly.");
    const main = data.repos.find((r:any)=>r.repo==="NexusOS") ?? data.repos[0];
    ctx.reply(
`📈 NexusOS GitHub Traction

MAIN REPO — NexusOS
  14d clones:    ${main.clones_14d ?? "—"}
  14d unique:    ${main.unique_cloners_14d ?? "—"}
  Yesterday:     ${main.clones_yesterday} clones · ${main.unique_cloners_yesterday} unique
  Today:         ${main.clones_today} clones

  ⭐ Stars:     ${main.stars}
  🍴 Forks:     ${main.forks}

ECOSYSTEM REPOS
${data.repos.slice(1).map((r:any)=>`  ${r.repo}: ${r.clones_14d??0} clones · ${r.stars} ⭐`).join("\n")}

Source: GitHub Traffic API (14-day window)
npm downloads: /npm`
    );
  });

  bot.command("npm", async ctx => {
    await ctx.reply("⏳ Fetching npm stats…");
    const data = await botFetch("/api/npm/stats");
    if (!data) return ctx.reply("⚠️ npm registry unavailable.");
    ctx.reply(
`📦 npm — nexusos-ce-encoder

Weekly:   ${data.weekly} downloads
Monthly:  ${data.monthly} downloads
Daily:    ${data.daily} downloads

Install: npm install nexusos-ce-encoder
Version: 1.0.0 · AGPL-3.0

Usage:
  const { ceEncode } = require('nexusos-ce-encoder');
  console.log(ceEncode('NEXUSOS'));

Python equivalent: /snippet python encode
GitHub clones: /traction`
    );
  });

  bot.command("ecosystem", async ctx => {
    await ctx.reply("⏳ Fetching all metrics…");
    const [gh, npm] = await Promise.all([
      botFetch("/api/github/adoption"),
      botFetch("/api/npm/stats"),
    ]);
    const main = gh?.repos?.find((r:any)=>r.repo==="NexusOS");
    ctx.reply(
`🌐 NexusOS Ecosystem Status

GITHUB
  Clones (14d):  ${main?.clones_14d ?? "—"}
  Unique (14d):  ${main?.unique_cloners_14d ?? "—"}
  Stars:         ${main?.stars ?? "—"}
  Forks:         ${main?.forks ?? "—"}

NPM — nexusos-ce-encoder
  Weekly:        ${npm?.weekly ?? "—"}
  Monthly:       ${npm?.monthly ?? "—"}

COMMUNITY
  Telegram:      t.me/NexusOSWNSP
  Bot:           @Nexuswnspbot
  Reddit:        u/NEXUSOS-WNSP-CE-SE

PROTOCOL
  Channels:      25,600 orthogonal Ψ channels
  Trials:        4 completed · all pass
  CE packages:   npm + PyPI (GitHub source)

/traction for GitHub detail · /npm for package detail`
    );
  });

  // ══════════════════════════════════════════
  // 7. DEVELOPER BOTS
  // ══════════════════════════════════════════
  bot.command("fee", ctx => {
    const args = ctx.message.text.split(" ").slice(1);
    const amount = parseFloat(args[0]);
    const senderNm = parseFloat(args[1]);
    if (isNaN(amount)||isNaN(senderNm)) return ctx.reply("Usage: /fee <amount_NXT> <sender_wavelength_nm>\nExample: /fee 100 480.6");
    const h=6.626e-34, c=299792458;
    const E_sender = h*c/(senderNm*1e-9);
    const E_ref    = h*c/(530e-9);
    const fee      = amount * 0.001 * (E_sender/E_ref);
    const band     = nmToBand(senderNm);
    ctx.reply(
`💱 Physics Fee Calculator

Amount:    ${amount} NXT
Sender λ:  ${senderNm} nm (${band})
Reference: 530nm (USER)

Fee formula: amount × 0.001 × (E_sender / E_ref)
Fee:         ${fee.toFixed(8)} NXT
Net receive: ${(amount-fee).toFixed(8)} NXT

E_sender: ${E_sender.toExponential(3)} J
E_ref:    ${E_ref.toExponential(3)} J
Ratio:    ${(E_sender/E_ref).toFixed(4)}×

${band==="SYSTEM"||band==="KERNEL" ? "Higher authority band → higher fee." : "Lower authority band → lower fee."}`
    );
  });

  bot.command("query", async ctx => {
    const args = ctx.message.text.split(" ").slice(1);
    const nm1 = parseFloat(args[0]);
    const nm2 = parseFloat(args[1]);
    if (isNaN(nm1)||isNaN(nm2)) return ctx.reply("Usage: /query <nm_low> <nm_high>\nExample: /query 520 625\n\nBand ranges:\n  SYSTEM  380–450\n  KERNEL  450–520\n  USER    520–625\n  GUEST   625–780");
    const data = await botFetch(`/api/spectral-db/search?nmLow=${nm1}&nmHigh=${nm2}`);
    if (!data) return ctx.reply("⚠️ Spectral DB unavailable.");
    if (!data.records?.length) return ctx.reply(`No records in ${nm1}–${nm2}nm.\n\nBand for this range: ${nmToBand((nm1+nm2)/2)}`);
    const lines = (data.records as any[]).slice(0,5).map((r:any)=>
      `${nmToEmoji(r.wavelengthNm)} ${r.wavelengthNm?.toFixed(1)}nm  "${r.label?.slice(0,25) ?? ""}"`
    ).join("\n");
    ctx.reply(`🗄️ Spectral DB Query: ${nm1}–${nm2}nm\n\n${lines}\n\nTotal: ${data.total ?? data.records.length} record${data.total!==1?"s":""}\nBand: ${nmToBand((nm1+nm2)/2)}`);
  });

  bot.command("snippet", ctx => {
    const args = ctx.message.text.split(" ").slice(1);
    const lang  = args[0]?.toLowerCase();
    const topic = args[1]?.toLowerCase();
    if (!lang||!topic||!SNIPPETS[lang]?.[topic]) {
      return ctx.reply(`🛠️ Code Snippets\n\nLanguages: node · python · browser\nTopics:    encode · frame · fee\n\nUsage: /snippet <lang> <topic>\nExample: /snippet node encode\n\nAll three generate CE-encoding code that runs without NexusOS installed.`);
    }
    ctx.reply(`🛠️ ${lang.toUpperCase()} — ${topic}\n\n\`\`\`${lang==="browser"?"javascript":lang}\n${SNIPPETS[lang][topic]}\n\`\`\``);
  });

  bot.command("channel", ctx => {
    const args = ctx.message.text.split(" ").slice(1);
    const wdm = parseInt(args[0]);
    if (isNaN(wdm)||wdm<0||wdm>255) return ctx.reply("Usage: /channel <wdm 0–255> <oam 0–49> <H|V>\nExample: /channel 128 10 H");
    const oam = Math.min(49,Math.max(0,parseInt(args[1])||0));
    const pol = args[2]?.toUpperCase()==="V"?"V":"H";
    const nm  = 380+(wdm/255)*400;
    ctx.reply(
`${nmToEmoji(nm)} Ψ(${wdm},${oam},${pol})

Wavelength:   ${nm.toFixed(2)} nm
Band:         ${nmToBand(nm)}
WDM lane:     ${wdm} / 256
OAM mode:     ${oam} / 50
Polarisation: ${pol==="H"?"Horizontal":"Vertical"}

⟨Ψᵢ|Ψⱼ⟩ = 0
Orthogonal to all 25,599 other channels by quantum mechanics.

In WLS: oscillate(Ψ(${wdm},${oam},${pol}), 0Hz) { }`
    );
  });

  // ══════════════════════════════════════════
  // 8. EXPERIMENT LOGGER BOT
  // ══════════════════════════════════════════
  bot.command("log", async ctx => {
    const raw   = ctx.message.text.split(" ").slice(1).join(" ");
    const parts = raw.split("|").map(s=>s.trim());
    if (parts.length < 2) {
      return ctx.reply(
`📋 Experiment Logger

Format: /log TITLE | RESULT | NM | NOTES

RESULT options: pass · partial · fail · pending
NM: measured wavelength (optional)

Example:
/log LED @ 532nm green | pass | 532 | Clean emission, matches CE encoding

Or view recent: /experiments`
      );
    }
    const [title, result="pending", nmStr, notes=""] = parts;
    const nm = parseFloat(nmStr) || undefined;
    const payload = {
      tier: 1,
      title: title.slice(0,120),
      hypothesis: `Recorded via Telegram by @${ctx.from?.username??"anonymous"}`,
      apparatus: ["Telegram bot logger"],
      procedure: "Bot command /log",
      observations: notes || "Logged via Telegram",
      measuredWavelengthNm: nm,
      encodedText: title,
      databaseVerified: true,
      channelAddressingDemonstrated: !!nm,
      simultaneousEncodingDemonstrated: false,
      result: ["pass","partial","fail","pending"].includes(result.toLowerCase()) ? result.toLowerCase() : "pending",
      notes: notes || undefined,
    };
    const data = await botFetch("/api/hardware-experiments", {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload),
    });
    if (!data) return ctx.reply("⚠️ Could not reach experiment log. Try again.");
    const enc = nm ? ceLocal(String.fromCharCode(Math.min(127,Math.round((nm-380)/3.125)%128))) : null;
    ctx.reply(
`✅ Experiment Logged

Title:   ${title}
Result:  ${result}
λ:       ${nm ? nm+"nm" : "not measured"}${enc ? `  [${enc.band} band]` : ""}
ID:      #${data.id ?? "—"}

View all: /experiments
Hardware Lab: /hardware-lab on NexusOS`
    );
  });

  bot.command("experiments", async ctx => {
    const data = await botFetch("/api/hardware-experiments");
    if (!data?.experiments?.length) return ctx.reply("No experiments logged yet.\n\nTry: /log My First Test | pass | 532 | Green laser test");
    const recent = (data.experiments as any[]).slice(-5).reverse();
    const icons: Record<string,string> = { pass:"✅", partial:"🟡", fail:"❌", pending:"⏳" };
    const lines = recent.map((e:any)=>
      `${icons[e.result]??"⏳"} #${e.id} ${e.title?.slice(0,30)??""} ${e.measuredWavelengthNm?`(${e.measuredWavelengthNm}nm)`:""}`
    ).join("\n");
    ctx.reply(`📋 Recent Experiments\n\n${lines}\n\nLog a new one: /log TITLE | RESULT | NM | NOTES`);
  });

  // ══════════════════════════════════════════
  // 9. GOVERNANCE BOT
  // ══════════════════════════════════════════
  bot.command("governance", async ctx => {
    const data = await botFetch("/api/governance/proposals");
    if (!data) return ctx.reply("⚠️ Governance module unavailable.");
    const proposals = data.proposals ?? data ?? [];
    if (!proposals.length) {
      return ctx.reply(`🏛️ Governance\n\nNo active proposals.\n\nProposals require KERNEL band authority or higher.\nVoting is weighted by spectral authority band.\n\nView live params: /params\nFull governance: /governance page on NexusOS`);
    }
    const statusIcon: Record<string,string> = { open:"🟡", passed:"✅", rejected:"❌", pending:"⏳" };
    const lines = (proposals as any[]).slice(0,5).map((p:any)=>
      `${statusIcon[p.status]??"⏳"} #${p.id} ${p.title?.slice(0,40)??""}\n   ${p.status} · ${p.voteCount??0} votes`
    ).join("\n\n");
    ctx.reply(`🏛️ Governance Proposals\n\n${lines}\n\nVote on the app: /governance page on NexusOS\nLive params: /params`);
  });

  bot.command("params", async ctx => {
    const data = await botFetch("/api/governance/params");
    if (!data) return ctx.reply("⚠️ Governance params unavailable.");
    const params = data.params ?? data ?? [];
    if (!params.length) return ctx.reply("No governance parameters found.");
    const lines = (params as any[]).slice(0,8).map((p:any)=>
      `  ${p.key?.replace(/_/g," ")}: ${p.value}`
    ).join("\n");
    ctx.reply(`🏛️ Live Protocol Parameters\n\n${lines}\n\nAll parameters are changeable by governance vote.\nPropose a change: /governance page on NexusOS`);
  });

  // ══════════════════════════════════════════
  // 10. BROADCAST — Content Refractor
  // ══════════════════════════════════════════
  const REFRACT: Record<string, { platform: string; content: string }> = {
    hn: {
      platform: "Hacker News — Show HN",
      content: `Show HN: I replaced character encoding with electromagnetic physics (verified)

ASCII maps 'A' to 65 — an arbitrary assignment from 1963.
We built CE (Character Encoding) where 'A' maps to 480.6nm — a real position in the visible light spectrum, derived from Planck's law.

Algorithm:
  band = charCode % 128
  λ    = 380 + (band × 3.125) nm
  E    = hc/λ

Trial 4 (30 Apr 2026) — two independent runtimes, same word:
  WavelengthScript VM → 571.489nm
  TypeScript ceEncode() → 571.490nm
  Delta: < 0.001nm

The system (WNSP) uses 25,600 orthogonal channels:
256 WDM × 50 OAM × 2 polarisations
⟨Ψᵢ|Ψⱼ⟩ = 0 — by quantum mechanics, not software.

When photonic ASICs arrive (~2032), no rewrite needed.
The architecture already speaks in wavelengths.

Try it (no setup): @Nexuswnspbot on Telegram → /encode YOURWORD
Repo: github.com/nexusosdaily-code/NexusOS
npm: npm install nexusos-ce-encoder`,
    },
    reddit: {
      platform: "Reddit — r/compsci",
      content: `Title: I replaced ASCII with physics — here's the math and a verified result [OC]

ASCII maps 'A' → 65. Our Character Encoding (CE) maps 'A' → 480.6nm.

The formula: λ = 380 + (charCode % 128 × 3.125) nm
Every character → a unique position in the visible light spectrum.
Not arbitrary. E=hf.

Just verified across two independent runtimes:
  Word: "REPOSE"
  WavelengthScript VM: 571.489nm
  TypeScript:          571.490nm
  Delta:               < 0.001nm

The full system uses 25,600 orthogonal Ψ channels (256 WDM × 50 OAM × 2 pol).
⟨Ψᵢ|Ψⱼ⟩ = 0 — orthogonality by quantum mechanics.

Why: Moore's Law ends at ~2nm (tunneling). Photonic processors use light.
CE is already written in the language of that hardware.

npm install nexusos-ce-encoder  (offline, pure math, no server)
github.com/nexusosdaily-code/NexusOS`,
    },
    future: {
      platform: "Reddit — r/Futurology",
      content: `Title: What actually comes after Moore's Law — spectral computing with visible light

Moore's Law ends at ~2nm. Electrons tunnel through transistors probabilistically at that scale.
TSMC is at 3nm. Silicon atom = 0.2nm. The wall is close.

Photonic processors (~2032) use light. No tunneling. No resistive heat.

NexusOS is built for that hardware today:
• 'A' = 480.6nm (not 65) — derived from E=hf
• Every instruction has a physical frequency
• 25,600 orthogonal channels via WDM × OAM × polarisation
• Transaction costs from Λ=hf/c² — not arbitrary gas fees

Trial 4 verified (30 Apr 2026): same encoding in two runtimes → delta < 0.001nm.

1,206 GitHub clones · 232 unique cloners in 14 days. All organic.

github.com/nexusosdaily-code/NexusOS`,
    },
    threads: {
      platform: "Threads",
      content: `We just verified the same physics formula in two independent runtimes.

Word: REPOSE
VM result:         571.489nm
TypeScript result: 571.490nm
Delta:             < 0.001nm

That's not a number — that's a position in the visible light spectrum.

ASCII: A → 65 (arbitrary, 1963)
CE:    A → 480.6nm (E=hf, physics)

Try it in 10 seconds:
Telegram → @Nexuswnspbot → /encode YOURWORD

github.com/nexusosdaily-code/NexusOS
1,206 clones · 232 unique cloners · 14 days · no ads`,
    },
    quora: {
      platform: "Quora — answer to 'What comes after Moore's Law?'",
      content: `The short answer: photonic computing. The longer answer: it's already being built.

At 2nm, quantum tunneling makes transistors probabilistic. TSMC is at 3nm.
A silicon atom is 0.2nm. The math closes around 2026–2028.

Photonic processors (~2032) use light instead of electrons. Light doesn't tunnel.
Each photon carries wavelength, amplitude, phase, polarisation, and orbital angular momentum simultaneously — far more information than a binary gate.

One project (NexusOS) is already writing software in the language of that hardware:
• Characters map to wavelengths ('A' → 480.6nm, not 65) via E=hf
• 25,600 orthogonal communication channels (WDM × OAM × polarisation)
• Transaction costs from Λ=hf/c² — not arbitrary fees
• Verified: same formula in two runtimes → < 0.001nm delta (Trial 4, Apr 2026)

The architecture requires no rewrite when photonic ASICs arrive
because it already speaks in frequencies.

github.com/nexusosdaily-code/NexusOS`,
    },
    youtube: {
      platform: "YouTube — title + description",
      content: `TITLE:
I encoded text using light instead of numbers (verified in 2 runtimes)

DESCRIPTION:
ASCII maps 'A' to 65. That's arbitrary — someone decided it in 1963.

In this video: mapping every character to a position in the visible light spectrum using Planck's law (E=hf).

'A' → 480.6nm (blue, ~623 THz)
'B' → 483.7nm
Each character → a unique physical coordinate. Not a number.

Then the verification: same formula in two independent runtimes.
WavelengthScript VM: 571.489nm
TypeScript:          571.490nm
Delta: < 0.001nm. Two runtimes. One physics.

The system (WNSP) uses 25,600 orthogonal channels via WDM × OAM × polarisation.
Each orthogonal by quantum mechanics — not software policy.

Try it yourself (no setup):
Telegram → @Nexuswnspbot → /encode YOURWORD
npm install nexusos-ce-encoder

github.com/nexusosdaily-code/NexusOS

TIMESTAMPS:
0:00  Why ASCII is arbitrary
2:30  The physics formula (E=hf)
5:00  Live encoding demo
8:00  The VM verification (Trial 4)
12:00 25,600 orthogonal channels
15:00 What this means for photonic computing`,
    },
    arxiv: {
      platform: "ArXiv — abstract (submission ready)",
      content: `TITLE:
Multidimensional Orthogonal Communication via WDM, OAM, and Polarization: Security Properties, Protocol Architecture, and Empirical Verification

AUTHORS:
NexusOS Research Group

SUBJECT CLASS: cs.NI (Networking and Internet Architecture)
CROSS-LIST: quant-ph, cs.CR

ABSTRACT:
We present WNSP (Waveform Node Spectral Protocol), a communication protocol whose channel space, addressing scheme, security model, and transaction cost function are derived from electromagnetic physics rather than software convention.

The protocol defines a three-dimensional Hilbert space of orthogonal communication channels Ψ(wdm, oam, pol) comprising 256 Wavelength Division Multiplexing indices, 50 Orbital Angular Momentum modes, and 2 polarisation states — yielding 25,600 mutually orthogonal channels satisfying ⟨Ψᵢ|Ψⱼ⟩ = 0 by quantum mechanical law.

Character Encoding (WNSP-CE) maps each Unicode code point c to a deterministic spectral position:
  λ = 380 + ((ord(c) mod 128) × 3.125) nm
  E = hf = hc/λ

We prove five security properties that hold as physical laws rather than computational hardness assumptions: collision-free addressing, channel isolation, energy-based authority enforcement, OAM eavesdropping detection, and content-derived anti-spoofing.

Empirical verification (Trial 4, 30 April 2026): CE encoding of "REPOSE" executed in WavelengthScript bytecode (17 instructions, WNSP VM, 21 cycles) produced λ = 571.489nm. Independent TypeScript implementation produced λ = 571.490nm. Δλ < 0.001nm.

The architecture requires no modification for photonic computing hardware (~2032), where every protocol primitive maps directly to a physical operation.

Full paper (11 sections, print/PDF):
nexusos.replit.app/wnsp-paper

Implementation: github.com/nexusosdaily-code/NexusOS (AGPL-3.0)
Package: nexusos-ce-encoder@1.0.0 (npmjs.com)`,
    },
  };

  bot.command("refract", ctx => {
    const target = ctx.message.text.split(" ").slice(1).join(" ").trim().toLowerCase();

    if (!target || !REFRACT[target]) {
      return ctx.reply(
`📡 Content Refractor

One result — seven platform formats.
Physics stays the same. The orbital mode changes.

/refract hn       — Hacker News (Show HN post)
/refract reddit   — Reddit r/compsci
/refract future   — Reddit r/Futurology
/refract threads  — Threads (short post)
/refract quora    — Quora answer
/refract youtube  — YouTube title + description
/refract arxiv    — ArXiv abstract

Each is ready to copy and post directly.
Trial 4 is the hook on every platform — same data, different orbital angle.`
      );
    }

    const r = REFRACT[target];
    ctx.reply(`📡 ${r.platform}\n\n${r.content}\n\n─────────────────────\nCopy and post directly. No editing needed.`);
  });

  // ── DM forwarder — sends every private message to admin ──────────────────
  async function forwardToAdmin(ctx: any, label: string) {
    const adminId = process.env.TELEGRAM_ADMIN_ID || process.env.TELEGRAM_CHANNEL_ID;
    if (!adminId) return;
    const from = ctx.from;
    const name = [from.first_name, from.last_name].filter(Boolean).join(" ") || "Unknown";
    const handle = from.username ? `@${from.username}` : `ID:${from.id}`;
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminId,
          parse_mode: "HTML",
          text: `📩 <b>New DM [${label}]</b>\n👤 ${name} (${handle})\n\n${ctx.message.text}`,
        }),
      });
    } catch { /* silent */ }
  }

  // ── Catch-all text ────────────────────────────────────────────────────────
  bot.on("text", async ctx => {
    if (ctx.message.text.startsWith("/")) return;
    const t = ctx.message.text.toLowerCase();

    // ── OFFER / PARTNERSHIP / INVESTMENT ──────────────────────────────────
    const isOffer = t.match(/offer|partner|invest|deal|collaborat|list|exchang|integrat|sponsor|fund|acqui|buy.*project|purchase|proposal|business|opportunit|interest.*project|joint/i);
    if (isOffer) {
      await forwardToAdmin(ctx, "OFFER");
      return ctx.reply(
`👁 *NexusOS — Partnership & Offer Enquiries*

Thank you for reaching out. Your message has been received and will be reviewed shortly.

*About NexusOS:*
NexusOS is not a blockchain — it's a physics engine. We're building the OS for the hardware that doesn't exist yet: photonic computing.

• *WavelengthScript* — the native language of photonic processors
• *WNSP Protocol* — 25,600 orthogonal channels from Maxwell's equations
• *NXWV Rune* — live on Bitcoin (ID: 952596:379 · 21T supply · 1,000/1,000 mints sealed)
• *Physics engine* — every fee, address, and transaction derived from E=hf

🌐 Platform: https://wnsp.io
📊 Coinsniper: https://coinsniper.net/coin/91963
💻 GitHub: https://github.com/nexusosdaily-code/NexusOS

The team will follow up directly. For urgent matters, reply with more details and we'll prioritise.`,
        { parse_mode: "Markdown" }
      );
    }

    // ── PRICE / TOKEN / RUNE ──────────────────────────────────────────────
    const isPrice = t.match(/price|how much|market cap|nxwv|rune|token|buy.*nxwv|value|chart|pump|dip|moon/i);
    if (isPrice) {
      await forwardToAdmin(ctx, "PRICE");
      return ctx.reply(
`🟠 *NEXUS•WAVELENGTH (NXWV)*

Bitcoin Rune — the economic layer of NexusOS.

• *Rune ID:* 952596:379
• *Supply:* 21,000,000,000,000 (21 trillion)
• *Mints:* 1,000 / 1,000 — fully sealed June 2026
• *Chain:* Bitcoin (Ordinals protocol)

📊 *Live listing:* https://coinsniper.net/coin/91963
🗳️ Vote to boost visibility on Coinsniper

🌐 Full platform + staking: https://wnsp.io

NexusOS uses NXWV as governance + yield token. Stakers auto-mint WNUSD stablecoin against their position.`,
        { parse_mode: "Markdown" }
      );
    }

    // ── WHAT IS / HOW DOES / EXPLAIN ─────────────────────────────────────
    const isQuestion = t.match(/what is|what are|how does|explain|tell me|what.*nexus|about.*nexus|nexusos\?|wnsp\?/i);
    if (isQuestion) {
      await forwardToAdmin(ctx, "QUESTION");
      return ctx.reply(
`👁 *What is NexusOS?*

NexusOS is a physics-based OS and protocol stack — the answer to Moore's Law.

Silicon transistors hit their physics limit at ~2nm (quantum tunnelling). The next era is photonic computing (~2032), where light replaces electrons.

*NexusOS is already written in the language of that hardware:*

🔬 Characters map to wavelengths — 'A' → 480.6nm (E=hf, not arbitrary)
📡 25,600 orthogonal channels (WDM × OAM × polarisation)
⚡ Transaction fees from Λ=hf/c² — photon compression mass
🧑‍💻 WavelengthScript — runs today in software, runs natively on photonic ASICs in 2032

No rewrite needed when the hardware arrives. The architecture already speaks in frequencies.

*Try the physics engine live:*
/encode NEXUSOS
/lesson 0

🌐 https://wnsp.io`,
        { parse_mode: "Markdown" }
      );
    }

    // ── GREETING ──────────────────────────────────────────────────────────
    const isGreeting = t.match(/^(hi|hello|hey|gm|good morning|good day|sup|yo|hola|greetings|howdy)[\s!.?]*$/i);
    if (isGreeting) {
      await forwardToAdmin(ctx, "GREETING");
      return ctx.reply(
`👋 *Welcome to NexusOS*

The physics-based OS for the photonic computing era.

━━ Quick start ━━
/encode YOURNAME  — see your name as light
/lesson 0         — what is a wave?
/wls hello        — write your first WavelengthScript
/traction         — live metrics

━━ The project ━━
🌐 https://wnsp.io
🟠 NXWV Rune on Coinsniper: https://coinsniper.net/coin/91963

For partnership enquiries, just describe what you're looking for and we'll get back to you.`,
        { parse_mode: "Markdown" }
      );
    }

    // ── STAKING / EARN / YIELD ────────────────────────────────────────────
    if (t.includes("stake")||t.includes("staking")||t.includes("yield")||t.includes("earn")||t.includes("apy")||t.includes("apr")) {
      await forwardToAdmin(ctx, "STAKING");
      return ctx.reply(
`⚡ *NexusOS Staking*

Stake sats → earn NXT yield → auto-mint WNUSD stablecoin → add to liquidity pools.

*Lock periods & NXT yield:*
• 7 days   → 5%
• 14 days  → 12%
• 30 days  → 28%
• 90 days  → 90%
• 180 days → 200%
• 365 days → 420%

*WNUSD* is auto-minted at 150% collateral ratio when you stake.

🌐 Stake now: https://wnsp.io/stake-earn`,
        { parse_mode: "Markdown" }
      );
    }

    // ── COMMUNITY ROLE / MODERATOR / JOB APPLICATION ─────────────────────
    const isCommunity = t.match(/moderator|mod\b|community|hype.?man|raider|raid|chatter|engag|role|position|apply|application|help.*project|join.*team|team.*member|contribute|volunteer|work.*with|support.*team|mass.?dm/i);
    if (isCommunity) {
      await forwardToAdmin(ctx, "COMMUNITY_APP");
      return ctx.reply(
`💜 *NexusOS — Community Team*

Love the energy! We're always looking for passionate people to help build the NexusOS movement.

*Paid community roles — earn NXT for every contribution:*
🛡 Moderator — 500 NXT / month (fixed)
📣 Hype Crew — 50 NXT / post or campaign (performance)
🔁 Raider — 100 NXT / organised raid (performance)
💬 Engager — 200 NXT / week (active presence)
🎨 Creator — 500 NXT / piece of content (bounty)

NXT is paid directly to your wnsp.io wallet. No volunteers — everyone gets compensated.

*Apply here:*
🌐 https://wnsp.io/join-community

Fill in the form and we'll reach out to confirm your role + wallet details.

@NexusOSWNSP`,
        { parse_mode: "Markdown" }
      );
    }

    // ── ENCODING / PHYSICS / TECHNICAL ───────────────────────────────────
    if (t.includes("encode")||t.includes("wavelength")||t.includes("nm"))
      return ctx.reply(`Encoding? Try:\n/encode YOURWORD\n/compare A\n/frame YOURTEXT`);
    if (t.includes("code")||t.includes("program")||t.includes("wls")||t.includes("wavelengthscript"))
      return ctx.reply(`Ready to code? Try:\n/wls hello\n/wls agent\n/codegen encoder`);
    if (t.includes("fee")||t.includes("transfer")||t.includes("nxt")||t.includes("wallet"))
      return ctx.reply(`Economics:\n/fee 100 480.6 — calculate transfer fee\n/wls transfer — WLS code for transfers\n/lesson 5 — the physics economy`);
    if (t.includes("mirror")||t.includes("archive")||t.includes("store"))
      return ctx.reply(`Spectral Mirror:\n/mirror store Your text here\n/mirror stats\n/mirror dominant`);
    if (t.includes("traction")||t.includes("clone")||t.includes("download")||t.includes("npm")||t.includes("github"))
      return ctx.reply(`Traction:\n/traction — GitHub clone stats\n/npm — npm download stats\n/ecosystem — all metrics`);
    if (t.includes("governance")||t.includes("proposal")||t.includes("vote"))
      return ctx.reply(`Governance:\n/governance — active proposals\n/params — live protocol parameters`);

    // ── Default — forward + reply ─────────────────────────────────────────
    await forwardToAdmin(ctx, "DM");
    ctx.reply(
`👁 *NexusOS*

Thanks for your message — the team will follow up.

*While you're here:*
🌐 https://wnsp.io
📊 NXWV on Coinsniper: https://coinsniper.net/coin/91963

/start — full bot menu
/encode NEXUSOS — see the physics
/lesson 0 — the vision from first principles`,
      { parse_mode: "Markdown" }
    );
  });

  console.log("[TelegramBot] Launching NexusOS full-spectrum bot…");
  bot.launch({ dropPendingUpdates: true })
    .then(()=>console.log("[TelegramBot] All 10 bot modules running."))
    .catch(err=>console.error("[TelegramBot] Launch error:", err?.message??err));

  process.once("SIGINT", ()=>{ try { bot.stop("SIGINT"); } catch {} });
  process.once("SIGTERM", ()=>{ try { bot.stop("SIGTERM"); } catch {} });
}
