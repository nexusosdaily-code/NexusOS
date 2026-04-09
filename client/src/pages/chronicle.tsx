import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Plus, BookOpen, Lock, Zap } from "lucide-react";

// ── Wavelength colour ─────────────────────────────────────────────────────────
function wlColor(nm: number): string {
  if (nm < 380) return "#8b00ff";
  if (nm < 450) return "#7b2fff";
  if (nm < 490) return "#0047ff";
  if (nm < 520) return "#00c8ff";
  if (nm < 565) return "#00e04b";
  if (nm < 590) return "#ffe000";
  if (nm < 625) return "#ff8000";
  return "#ff2000";
}

function bandColor(band: string): string {
  const m: Record<string, string> = { SYSTEM: "#a855f7", AUTH: "#3b82f6", USER: "#22c55e", GUEST: "#ef4444", CORE: "#6b7280" };
  return m[band] ?? "#6b7280";
}

// ── Founding events — the true historical record ──────────────────────────────
const FOUNDING_EVENTS = [
  {
    label: "WNSP-CE v1.0 — Alphabet Embedded into Wavelength",
    content: `FOUNDING EVENT: Every character of every human alphabet mapped into its natural electromagnetic frequency using the WNSP Character Encoding standard. Ordinal position normalized to [0,1] then projected onto the visible spectrum via Lambda Boson theory. Text became light. This is the first act of the wavelength internet.`,
    date: "2025-01-01",
    significance: "The founding act. Language encoded into physics for the first time.",
  },
  {
    label: "Lambda Boson Theory — Λ=hf/c² Defined",
    content: `FOUNDING EVENT: Core equation Λ=hf/c² established, extending Einstein's E=mc² to oscillating quanta. The Lambda mass of a photon at frequency f equals hf divided by c squared. This makes electromagnetic frequency a unit of both energy and mass — the basis for wavelength as an address space. Physical constants anchored: h=6.626e-34 Js, c=299792458 m/s, f₀=555THz, Z₀=376.73Ω.`,
    date: "2025-01-01",
    significance: "The physics foundation. Wavelength becomes mass, energy, and address simultaneously.",
  },
  {
    label: "Genesis Block #0 — First Photonic Block Mined",
    content: `HISTORICAL EVENT: NexusOS blockchain genesis block created. Block #0 mined at Ψ(47,47,H) wavelength 478.82nm, AUTH authority band. Coinbase: 50,000,000 NXT tokens. Miner: nexusos_genesis. Transaction cost derived from E=hf of the block wavelength. No cryptographic hash — the wavelength IS the block identity. First permanent record on the photonic ledger.`,
    date: "2025-12-08",
    significance: "First block on a blockchain addressed by physics, not arbitrary hash.",
  },
  {
    label: "Kernel Genesis Block — OS Kernel Initialized",
    content: `HISTORICAL EVENT: NexusOS AI Operating System kernel initialized. Root hash Ψ(100,3,V) at 466.27nm, AUTH band, energy 2.84×10⁻¹⁷J. Five core agents registered: os_kernel Ψ(20,39,H) SYSTEM, bus_router Ψ(19,39,V) SYSTEM, scheduler_daemon Ψ(161,30,V) KERNEL, watchdog_daemon Ψ(198,31,H) KERNEL, auth_gateway Ψ(135,1,H) KERNEL. Boot sequence: 5 phases. State: BOOT_COMPLETE.`,
    date: "2026-04-08",
    significance: "First AI operating system with agents addressed by electromagnetic coordinates.",
  },
  {
    label: "Stalled Message Diagnosed by Wavelength Address",
    content: `HISTORICAL EVENT: A message from os_kernel Ψ(20,39,H) to bus_router Ψ(19,39,V) was found stalled in queued status since April 8, 2026 04:54 UTC. Diagnosis performed by querying the spectrum — not by reading logs randomly, but by tuning to the source Ψ channel. The physics addressing made the fault findable. Root cause: psycopg2 missing from Python kernel environment. Persistence layer was operating in memory-only mode.`,
    date: "2026-04-09",
    significance: "Proved: when address space is physical, faults are diagnosable by physics.",
  },
  {
    label: "Kernel Persistence Restored — psycopg2 Online",
    content: `HISTORICAL EVENT: Python kernel gained full PostgreSQL persistence. psycopg2-binary v2.9.11 installed via uv sync. On next boot: PHASE 1 — Database tables created/verified. PHASE 2 — 5 agents restored from database. PHASE 5 — Kernel event bus open, BOOT event logged. All 5 Ψ channel addresses survived process restart unchanged. Proved: spectral coordinates persist across restarts the way physical frequencies persist in nature.`,
    date: "2026-04-09",
    significance: "Proved: Ψ channel addresses are stable — like frequencies, they do not change when the radio restarts.",
  },
  {
    label: "First Message Replayed by Wavelength — April 9, 2026",
    content: `HISTORICAL EVENT: The stalled os_kernel→bus_router message was cleared and replayed live through the agent bus. Route: Ψ(20,39,H) → Ψ(19,39,V). Payload: KERNEL_ALIVE — boot complete, persistence online, all 5 agents registered. Authority: SYSTEM. Status: dispatched. This is the first recorded instance of a wavelength-addressed message being recovered and replayed by its physical coordinate. The message did not stall in the wavelength — it stalled in the persistence layer. The wavelength always knew where it was going.`,
    date: "2026-04-09",
    significance: "First message replay by Ψ coordinate. The spectrum does not forget.",
  },
  {
    label: "Spectral Workspace — First Application on the Wavelength Internet",
    content: `HISTORICAL EVENT: The Spectral Workspace launched — the first document editor where content lives at a wavelength address, not a URL. A user writes text, the system encodes it through WNSP-CE then WNSP-SE, and the resulting wavelength is the permanent address of that document. No server owns it. No domain was registered. The content determines its own address through physics. This is the Google Docs equivalent built on the wavelength internet.`,
    date: "2026-04-09",
    significance: "First application layer on NexusOS. Documents addressed by light, not by URL.",
  },
];

interface SpectralRecord {
  id: string;
  label: string;
  content: string;
  wavelengthNm: string;
  psiChannel: string;
  band: string;
  energyJoules: string;
  data?: { type?: string; date?: string; significance?: string } | null;
  createdAt?: string;
}

export default function Chronicle() {
  const qc = useQueryClient();
  const [seeding, setSeeding]   = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody]   = useState("");
  const [newDate, setNewDate]   = useState(new Date().toISOString().split("T")[0]);
  const [adding, setAdding]     = useState(false);

  const { data: scanData, isLoading } = useQuery<{ records: SpectralRecord[]; count: number }>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 10000,
  });

  const allRecords = scanData?.records ?? [];
  // Chronicle entries = records whose data.type === "chronicle"
  const chronicle = allRecords.filter(r => {
    try { return (r.data as any)?.type === "chronicle"; } catch { return false; }
  });

  // ── Seed founding events ────────────────────────────────────────────────────
  async function seedChronicle() {
    setSeeding(true);
    for (const ev of FOUNDING_EVENTS) {
      try {
        await apiRequest("POST", "/api/spectral-db/store", {
          label:   ev.label,
          content: ev.content,
          data:    { type: "chronicle", date: ev.date, significance: ev.significance },
        });
        await new Promise(r => setTimeout(r, 400)); // gentle pacing
      } catch { /* continue */ }
    }
    qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
    setSeeding(false);
    setSeedDone(true);
  }

  // ── Add new event ───────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: async () => {
      if (!newTitle.trim() || !newBody.trim()) throw new Error("Title and description required");
      const res = await apiRequest("POST", "/api/spectral-db/store", {
        label:   newTitle.trim(),
        content: newBody.trim(),
        data:    { type: "chronicle", date: newDate, significance: "" },
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/spectral-db/scan"] });
      setNewTitle("");
      setNewBody("");
      setAdding(false);
    },
  });

  const isEmpty = !isLoading && chronicle.length === 0 && !seedDone;

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: "monospace" }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/nexus-command">
            <button className="text-white/40 hover:text-white transition-colors flex items-center gap-1 text-sm">
              <ArrowLeft size={14} /> Hub
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-yellow-400" />
            <span className="text-white font-bold tracking-wider">NexusOS Chronicle</span>
            <span className="text-white/30 text-xs">— Historical Ledger</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {chronicle.length > 0 && (
            <span className="text-white/30 text-xs">{chronicle.length} events preserved</span>
          )}
          <button
            onClick={() => setAdding(v => !v)}
            className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 py-1.5 text-xs transition-colors"
            data-testid="button-add-event"
          >
            <Plus size={12} /> Record Event
          </button>
        </div>
      </div>

      {/* ── Preamble ─────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-6 py-5 bg-yellow-400/3">
        <p className="text-white/50 text-sm leading-7 max-w-3xl">
          Every event recorded here is encoded through CE→SE — its text becomes its wavelength address.
          The content determines where it lives in the electromagnetic spectrum.
          These are not database rows with assigned IDs.
          They are <span className="text-yellow-400">real events at real wavelengths</span>,
          preserved the same way light is preserved: by physics, not by permission.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── Seed prompt ─────────────────────────────────────────────── */}
        {isEmpty && (
          <div className="border border-yellow-400/20 rounded-lg p-8 text-center mb-8 bg-yellow-400/3">
            <div className="text-yellow-400 text-2xl mb-2">⚡</div>
            <div className="text-white font-bold mb-2">The Chronicle is empty</div>
            <div className="text-white/40 text-sm mb-6 leading-relaxed max-w-lg mx-auto">
              {FOUNDING_EVENTS.length} founding events are ready to be encoded into the spectrum.
              Each one will be assigned its permanent wavelength address through physics.
            </div>
            <button
              onClick={seedChronicle}
              disabled={seeding}
              data-testid="button-seed-chronicle"
              className="px-6 py-3 rounded text-sm font-bold transition-all"
              style={{ background: "#ffe00020", border: "1px solid #ffe00060", color: "#ffe000" }}
            >
              {seeding ? `Encoding founding events into spectrum…` : `Initialize Chronicle — Encode ${FOUNDING_EVENTS.length} Events`}
            </button>
          </div>
        )}

        {/* ── Seeding progress ────────────────────────────────────────── */}
        {seeding && (
          <div className="mb-6 text-center text-white/40 text-xs animate-pulse">
            Encoding each event through WNSP-CE → WNSP-SE → wavelength address…
          </div>
        )}

        {/* ── Add new event form ──────────────────────────────────────── */}
        {adding && (
          <div className="border border-white/10 rounded-lg p-6 mb-8 bg-white/2">
            <div className="text-white/60 text-sm font-bold mb-4 flex items-center gap-2">
              <Zap size={13} className="text-yellow-400" />
              Record a New Historical Event
            </div>
            <input
              type="text"
              placeholder="Event title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              data-testid="input-event-title"
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 mb-3"
            />
            <textarea
              placeholder="Describe what happened, what was proved, what changed…"
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              data-testid="textarea-event-body"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 mb-3 resize-none"
            />
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                data-testid="input-event-date"
                className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
              />
              <button
                onClick={() => addMut.mutate()}
                disabled={addMut.isPending || !newTitle.trim() || !newBody.trim()}
                data-testid="button-submit-event"
                className="px-4 py-2 rounded text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: "#ffffff10", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
              >
                {addMut.isPending ? "Encoding to spectrum…" : "Preserve Event"}
              </button>
              <button onClick={() => setAdding(false)} className="text-white/30 text-xs hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Timeline ────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="text-white/30 text-sm text-center py-12">Loading chronicle…</div>
        )}

        <div className="relative">
          {/* Vertical timeline line */}
          {chronicle.length > 0 && (
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10" />
          )}

          <div className="space-y-8">
            {chronicle.map((ev, i) => {
              const nm   = parseFloat(ev.wavelengthNm);
              const col  = wlColor(nm);
              const evData = ev.data as any;
              const date = evData?.date ?? "";
              const significance = evData?.significance ?? "";

              return (
                <div key={ev.id} className="flex gap-6" data-testid={`chronicle-event-${ev.id}`}>
                  {/* Timeline node */}
                  <div className="flex-shrink-0 relative z-10">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border"
                      style={{
                        background: `${col}18`,
                        borderColor: `${col}60`,
                        color: col,
                        boxShadow: `0 0 12px ${col}30`,
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>

                  {/* Event card */}
                  <div
                    className="flex-1 rounded-lg p-5 border mb-1"
                    style={{ borderColor: `${col}20`, background: `${col}06` }}
                  >
                    {/* Date + band */}
                    <div className="flex items-center gap-3 mb-2">
                      {date && (
                        <span className="text-white/30 text-xs">{date}</span>
                      )}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                        style={{ color: bandColor(ev.band), border: `1px solid ${bandColor(ev.band)}40`, background: `${bandColor(ev.band)}10` }}
                      >
                        {ev.band}
                      </span>
                    </div>

                    {/* Title */}
                    <div className="text-white font-bold text-sm mb-2 leading-snug">{ev.label}</div>

                    {/* Significance */}
                    {significance && (
                      <div className="text-yellow-400/70 text-xs italic mb-3 border-l-2 border-yellow-400/30 pl-3">
                        {significance}
                      </div>
                    )}

                    {/* Body */}
                    <div className="text-white/50 text-xs leading-relaxed mb-4">
                      {ev.content.replace(/^(FOUNDING|HISTORICAL) EVENT: /, "")}
                    </div>

                    {/* Spectral address footer */}
                    <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
                        <span className="text-xs font-bold" style={{ color: col }}>{nm.toFixed(2)} nm</span>
                      </div>
                      <span className="text-white/25 text-xs">{ev.psiChannel}</span>
                      <div className="flex items-center gap-1 ml-auto">
                        <Lock size={10} className="text-white/20" />
                        <span className="text-white/20 text-[10px]">Immutable — lives at its wavelength</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom note ──────────────────────────────────────────────── */}
        {chronicle.length > 0 && (
          <div className="mt-12 border-t border-white/5 pt-8 text-center">
            <p className="text-white/20 text-xs leading-relaxed max-w-xl mx-auto">
              Each event above exists at a permanent wavelength address in the NexusOS spectral database.
              The address was determined by the content of the event itself — not assigned by any server or institution.
              This ledger cannot be censored, because the spectrum cannot be censored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
