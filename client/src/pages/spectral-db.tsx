import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Database, Search, Zap, Map, Trash2, Copy, Check } from "lucide-react";

// ── Band helpers ──────────────────────────────────────────────────
function getBand(nm: number) {
  if (nm < 450) return { name: "SYSTEM",  color: "#8b00ff", emoji: "⚙" };
  if (nm < 490) return { name: "AUTH",    color: "#0050ff", emoji: "🔐" };
  if (nm < 520) return { name: "STREAM",  color: "#00cfcf", emoji: "⚡" };
  if (nm < 565) return { name: "CORE",    color: "#00c800", emoji: "⚙" };
  if (nm < 590) return { name: "UI",      color: "#cccc00", emoji: "🎨" };
  if (nm < 625) return { name: "EVENT",   color: "#ff8c00", emoji: "📡" };
  return         { name: "STORAGE", color: "#cc0000", emoji: "💾" };
}

function bandColor(band: string) {
  const map: Record<string, string> = {
    SYSTEM: "#8b00ff", AUTH: "#0050ff", STREAM: "#00cfcf",
    CORE: "#00c800", UI: "#cccc00", EVENT: "#ff8c00", STORAGE: "#cc0000",
  };
  return map[band] ?? "#94a3b8";
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Record card ───────────────────────────────────────────────────
function RecordCard({ record, onDelete }: { record: any; onDelete: () => void }) {
  const nm   = parseFloat(record.wavelengthNm);
  const band = getBand(nm);
  const bc   = bandColor(record.band ?? band.name);

  return (
    <div className="rounded-lg border p-3 bg-slate-900/60"
      style={{ borderColor: `${bc}40` }}
      data-testid={`record-${record.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: bc }} />
          <span className="font-semibold text-sm text-slate-100">{record.label}</span>
          <Badge className="text-xs px-1.5 py-0 font-mono"
            style={{ background: `${bc}20`, color: bc, borderColor: `${bc}40` }}>
            {record.band}
          </Badge>
        </div>
        <button onClick={onDelete} className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{record.content}</p>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-mono text-slate-500">
        <span style={{ color: bc }}>λ = {nm.toFixed(1)} nm</span>
        <span className="flex items-center gap-1">
          {record.psiChannel}
          <CopyBtn text={record.psiChannel} />
        </span>
        <span>{parseFloat(record.energyJoules).toExponential(2)} J</span>
        <span>{new Date(record.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// ── Tab 1: Store ──────────────────────────────────────────────────
const PRESETS = [
  { label: "user_auth_token",      content: "function authenticate(user, password) validates credentials and returns a signed session token" },
  { label: "websocket_handler",    content: "real-time bidirectional event stream handler for sensor telemetry and live dashboard updates" },
  { label: "kernel_boot_sequence", content: "five phase operating system kernel boot initialises spectral channels and registers core agents" },
  { label: "lambda_gate_operator", content: "photonic logic gate operator performing Boolean operations on polarised light beams" },
  { label: "user_profile_record",  content: "database record for user profile containing name email wallet address and spectral identity" },
  { label: "api_rate_limiter",     content: "event-driven rate limiter that throttles API requests based on spectral authority band" },
];

function StoreTab({ onStored }: { onStored: () => void }) {
  const [content, setContent] = useState(PRESETS[0].content);
  const [label,   setLabel]   = useState(PRESETS[0].label);
  const [result,  setResult]  = useState<any>(null);

  const storeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/spectral-db/store", { content, label })
        .then(r => r.json()),
    onSuccess: (data) => {
      setResult(data);
      onStored();
    },
  });

  const loadPreset = (p: typeof PRESETS[0]) => {
    setContent(p.content); setLabel(p.label); setResult(null);
  };

  const nm   = result?.spectral?.wavelength_mid_nm;
  const band = nm ? getBand(nm) : null;
  const bc   = band ? bandColor(band.name) : "#06b6d4";

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Describe what you want to store. The CE→SE process encodes it to a
        physical wavelength — that wavelength IS the address. The data lives
        there permanently, not at an assigned ID.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 space-y-2">
          <Label className="text-xs text-slate-400">Content (what you are storing)</Label>
          <Textarea value={content} onChange={e => setContent(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 text-sm min-h-24"
            data-testid="input-content" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Label</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-label" />
          <Button className="w-full" onClick={() => storeMutation.mutate()}
            disabled={storeMutation.isPending || !content}
            data-testid="btn-store">
            <Zap className="w-3 h-3 mr-1" />
            {storeMutation.isPending ? "Encoding + Storing…" : "Store at Wavelength"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => loadPreset(p)}
            className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono"
            data-testid={`preset-${i}`}>
            {p.label}
          </button>
        ))}
      </div>

      {result?.success && band && (
        <div className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: `${bc}50`, background: `${bc}08` }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: bc }} />
            <span className="font-bold text-slate-100">{label}</span>
            <span className="text-xs font-mono" style={{ color: bc }}>stored</span>
          </div>

          {/* Spectrum marker */}
          <div className="relative h-6">
            <div className="h-2 w-full rounded"
              style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)", marginTop: "6px" }} />
            <div className="absolute top-0 flex flex-col items-center"
              style={{ left: `${((nm - 380) / 400) * 100}%`, transform: "translateX(-50%)" }}>
              <div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: bc }} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            {[
              { label: "Wavelength", value: `${nm.toFixed(1)} nm`, color: bc },
              { label: "Channel",    value: result.spectral.psi_channel },
              { label: "Band",       value: band.name, color: bc },
              { label: "Energy",     value: `${parseFloat(result.spectral.energy_joules).toExponential(2)} J` },
            ].map((item, i) => (
              <div key={i} className="p-2 bg-slate-900 rounded">
                <div className="text-slate-500 mb-0.5">{item.label}</div>
                <div style={{ color: item.color ?? "#e2e8f0" }}>{item.value}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 font-mono">
            This content is now retrievable by its physical address —
            wavelength {nm.toFixed(1)} nm or channel {result.spectral.psi_channel}.
            No external ID was assigned. The physics derived the address.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Spectrum Map ───────────────────────────────────────────
function SpectrumMapTab({ records }: { records: any[] }) {
  const [hovered, setHovered] = useState<any>(null);

  const bandGroups: Record<string, any[]> = {};
  records.forEach(r => {
    const b = r.band ?? "CORE";
    if (!bandGroups[b]) bandGroups[b] = [];
    bandGroups[b].push(r);
  });

  return (
    <div className="space-y-5">
      <p className="text-slate-400 text-sm">
        Every stored record mapped to its physical position on the
        electromagnetic spectrum. Records cluster by semantic domain — auth
        records in blue, storage in red, core logic in green. Physics categorises
        automatically.
      </p>

      {records.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-mono text-sm">
          No records stored yet — use the Store tab to add data to the spectrum.
        </div>
      ) : (
        <>
          {/* Full spectrum bar with record markers */}
          <div className="relative">
            <div className="h-8 w-full rounded-lg"
              style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }} />
            {records.map((r, i) => {
              const nm  = parseFloat(r.wavelengthNm);
              const pct = ((nm - 380) / 400) * 100;
              const bc  = bandColor(r.band);
              return (
                <div key={i}
                  className="absolute top-0 bottom-0 flex items-center cursor-pointer"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                  onMouseEnter={() => setHovered(r)}
                  onMouseLeave={() => setHovered(null)}
                  data-testid={`marker-${r.id}`}>
                  <div className="w-2.5 h-8 rounded-full border border-white/60 bg-white/20 hover:bg-white/50 transition-colors" />
                </div>
              );
            })}
          </div>

          {/* Band labels */}
          <div className="flex justify-between text-xs font-mono text-slate-600">
            {["SYSTEM", "AUTH", "STREAM", "CORE", "UI", "EVENT", "STORAGE"].map((b, i) => (
              <span key={i} style={{ color: bandColor(b) }}>{b}</span>
            ))}
          </div>

          {/* Hover tooltip */}
          {hovered && (
            <div className="p-3 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono">
              <span className="text-slate-200 font-semibold">{hovered.label}</span>
              <span className="text-slate-500 mx-2">·</span>
              <span style={{ color: bandColor(hovered.band) }}>λ = {parseFloat(hovered.wavelengthNm).toFixed(1)} nm</span>
              <span className="text-slate-500 mx-2">·</span>
              <span className="text-slate-400">{hovered.psiChannel}</span>
            </div>
          )}

          {/* Band groups */}
          <div className="space-y-3">
            {Object.entries(bandGroups)
              .sort(([a], [b]) => Object.keys({ SYSTEM:0,AUTH:1,STREAM:2,CORE:3,UI:4,EVENT:5,STORAGE:6 }).indexOf(a) - Object.keys({ SYSTEM:0,AUTH:1,STREAM:2,CORE:3,UI:4,EVENT:5,STORAGE:6 }).indexOf(b))
              .map(([band, recs]) => (
                <div key={band}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: bandColor(band) }} />
                    <span className="text-xs font-mono font-semibold" style={{ color: bandColor(band) }}>
                      {band}
                    </span>
                    <span className="text-xs text-slate-600">({recs.length} record{recs.length !== 1 ? "s" : ""})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-4">
                    {recs.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono text-slate-400 p-1.5 rounded bg-slate-900/40">
                        <span style={{ color: bandColor(band) }}>{parseFloat(r.wavelengthNm).toFixed(1)} nm</span>
                        <span className="text-slate-300">{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tab 3: Proximity Search ───────────────────────────────────────
function ProximitySearchTab() {
  const [wavelength, setWavelength] = useState(540);
  const [range,      setRange]      = useState(30);
  const [results,    setResults]    = useState<any[] | null>(null);
  const [searching,  setSearching]  = useState(false);

  const search = async () => {
    setSearching(true);
    try {
      const res = await apiRequest("GET",
        `/api/spectral-db/search?wavelength=${wavelength}&range=${range}`);
      const data = await res.json();
      setResults(data.records ?? []);
    } finally {
      setSearching(false);
    }
  };

  const bandAtWl = getBand(wavelength);
  const bc = bandColor(bandAtWl.name);

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Query the database by wavelength proximity — find everything stored
        within ± nm of a target wavelength. Similar content clusters near each
        other on the spectrum. Proximity search IS semantic search.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Target wavelength (nm)</Label>
          <Input type="number" min="380" max="780" value={wavelength}
            onChange={e => setWavelength(Number(e.target.value))}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
            data-testid="input-wavelength" />
          <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: bc }}>
            <div className="w-2 h-2 rounded-full" style={{ background: bc }} />
            {bandAtWl.name} band
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-400">Range ± nm</Label>
          <Input type="number" min="1" max="200" value={range}
            onChange={e => setRange(Number(e.target.value))}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
            data-testid="input-range" />
          <div className="text-xs text-slate-600 font-mono">
            {(wavelength - range).toFixed(0)} – {(wavelength + range).toFixed(0)} nm
          </div>
        </div>
        <Button onClick={search} disabled={searching} data-testid="btn-search">
          <Search className="w-3 h-3 mr-1" />
          {searching ? "Searching…" : "Proximity Search"}
        </Button>
      </div>

      {/* Target marker on spectrum */}
      <div className="relative">
        <div className="h-4 w-full rounded"
          style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }} />
        <div className="absolute top-0 h-4 rounded opacity-30"
          style={{
            left:  `${Math.max(0, (wavelength - range - 380) / 400 * 100)}%`,
            width: `${(range * 2) / 400 * 100}%`,
            background: bc,
          }} />
        <div className="absolute top-0 h-4 w-0.5 bg-white"
          style={{ left: `${((wavelength - 380) / 400) * 100}%`, transform: "translateX(-50%)" }} />
      </div>

      {results !== null && (
        <div className="space-y-2">
          <p className="text-xs font-mono text-slate-500">
            {results.length} record{results.length !== 1 ? "s" : ""} found
            within {range} nm of {wavelength} nm
          </p>
          {results.length === 0 ? (
            <div className="text-slate-600 text-sm font-mono py-4 text-center">
              No records in this spectral region. Store something first.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => {
                const rNm = parseFloat(r.wavelengthNm);
                const dist = Math.abs(rNm - wavelength).toFixed(1);
                const rBc  = bandColor(r.band);
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-900/60"
                    data-testid={`search-result-${i}`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rBc }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-200">{r.label}</span>
                        <span className="text-xs font-mono text-slate-500">{r.psiChannel}</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{r.content}</p>
                    </div>
                    <div className="flex-shrink-0 text-right text-xs font-mono">
                      <div style={{ color: rBc }}>{rNm.toFixed(1)} nm</div>
                      <div className="text-slate-600">Δ {dist} nm</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: All Records ────────────────────────────────────────────
function AllRecordsTab({ records, onDelete }: { records: any[]; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {records.length === 0 ? (
        <div className="text-center py-12 text-slate-600 font-mono text-sm">
          The spectral database is empty. Store something from the Store tab.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-mono text-slate-500">
              {records.length} record{records.length !== 1 ? "s" : ""} across the spectrum
            </p>
            <div className="flex gap-2 text-xs font-mono text-slate-600">
              {["SYSTEM","AUTH","STREAM","CORE","UI","EVENT","STORAGE"].map(b => {
                const count = records.filter(r => r.band === b).length;
                return count > 0 ? (
                  <span key={b} style={{ color: bandColor(b) }}>{b} {count}</span>
                ) : null;
              })}
            </div>
          </div>
          <div className="space-y-2">
            {records.map(r => (
              <RecordCard key={r.id} record={r} onDelete={() => onDelete(r.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function SpectralDbPage() {
  const qc = useQueryClient();

  const { data: scanData, refetch } = useQuery<any>({
    queryKey: ["/api/spectral-db/scan"],
    refetchInterval: 10000,
  });

  const records: any[] = scanData?.records ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/spectral-db/${id}`).then(r => r.json()),
    onSuccess: () => refetch(),
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#8b00ff,#00c800,#cc0000)" }}>
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Spectral Database</h1>
            <p className="text-slate-400 text-sm">
              Content-addressed storage — data lives at its wavelength, not at an assigned ID
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs font-mono text-slate-500">
            <span>{records.length} records</span>
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            <span>25,600 channels available</span>
          </div>
        </div>

        {/* Live mini spectrum */}
        <div className="relative h-3 w-full rounded mb-1"
          style={{ background: "linear-gradient(to right,#8b00ff,#0050ff,#00cfcf,#00c800,#cccc00,#ff8c00,#cc0000)" }}>
          {records.map((r, i) => {
            const nm  = parseFloat(r.wavelengthNm);
            const pct = ((nm - 380) / 400) * 100;
            return (
              <div key={i} className="absolute top-0 bottom-0 w-0.5 bg-white/70"
                style={{ left: `${pct}%` }}
                title={`${r.label}: ${nm.toFixed(1)}nm`} />
            );
          })}
        </div>
        <div className="flex justify-between text-xs font-mono text-slate-700">
          <span>380 nm</span><span>480 nm</span><span>560 nm</span><span>620 nm</span><span>780 nm</span>
        </div>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="store"    data-testid="tab-store">
            <Zap className="w-3 h-3 mr-1" /> Store
          </TabsTrigger>
          <TabsTrigger value="map"      data-testid="tab-map">
            <Map className="w-3 h-3 mr-1" /> Spectrum Map
          </TabsTrigger>
          <TabsTrigger value="search"   data-testid="tab-search">
            <Search className="w-3 h-3 mr-1" /> Proximity Search
          </TabsTrigger>
          <TabsTrigger value="records"  data-testid="tab-records">
            <Database className="w-3 h-3 mr-1" /> Records ({records.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Describe it → CE encodes it → wavelength stores it
          </h2>
          <StoreTab onStored={() => refetch()} />
        </TabsContent>

        <TabsContent value="map">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Every record at its physical position — similar data clusters naturally
          </h2>
          <SpectrumMapTab records={records} />
        </TabsContent>

        <TabsContent value="search">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Proximity search = semantic search — nearby wavelengths, similar content
          </h2>
          <ProximitySearchTab />
        </TabsContent>

        <TabsContent value="records">
          <h2 className="text-sm font-semibold text-amber-300 mb-3">
            All stored records ordered by wavelength (380 nm → 780 nm)
          </h2>
          <AllRecordsTab records={records} onDelete={id => deleteMutation.mutate(id)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
