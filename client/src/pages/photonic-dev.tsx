import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Zap, Code2, Layers, BookOpen, Plus, Trash2, Play } from "lucide-react";

// ─── spectrum helpers ────────────────────────────────────────────

const SPECTRUM_MIN = 380;
const SPECTRUM_MAX = 780;

function wlToPercent(nm: number) {
  return ((nm - SPECTRUM_MIN) / (SPECTRUM_MAX - SPECTRUM_MIN)) * 100;
}

function wlLabel(nm: number): string {
  if (nm < 450) return "Violet";
  if (nm < 490) return "Blue";
  if (nm < 520) return "Cyan";
  if (nm < 565) return "Green";
  if (nm < 590) return "Yellow";
  if (nm < 625) return "Orange";
  return "Red";
}

const BAND_INFO: { range: string; role: string; color: string }[] = [
  { range: "380–449", role: "System routes",            color: "#8b00ff" },
  { range: "450–489", role: "Auth + security",          color: "#0050ff" },
  { range: "490–519", role: "Data streams",             color: "#00cfcf" },
  { range: "520–564", role: "Core functions",           color: "#00c800" },
  { range: "565–589", role: "UI components",            color: "#d0d000" },
  { range: "590–624", role: "Events + interrupts",      color: "#ff8c00" },
  { range: "625–780", role: "Storage + persistence",    color: "#cc0000" },
];

// ─── Spectrum Bar ────────────────────────────────────────────────

function SpectrumBar({
  markers = [],
}: {
  markers?: { label: string; nm: number; color: string; type?: string }[];
}) {
  return (
    <div className="relative w-full">
      {/* Rainbow bar */}
      <div
        className="h-8 w-full rounded-lg"
        style={{
          background:
            "linear-gradient(to right," +
            "#8b00ff 0%," +
            "#4400ff 10%," +
            "#0000ff 15%," +
            "#0080ff 22%," +
            "#00cfff 30%," +
            "#00ff80 40%," +
            "#00ff00 48%," +
            "#80ff00 55%," +
            "#ffff00 60%," +
            "#ffcc00 65%," +
            "#ff8c00 70%," +
            "#ff4400 76%," +
            "#ff0000 85%," +
            "#cc0000 100%)",
        }}
      />
      {/* nm labels */}
      <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
        <span>380</span>
        <span>450</span>
        <span>520</span>
        <span>580</span>
        <span>640</span>
        <span>700</span>
        <span>780</span>
      </div>
      {/* Markers */}
      {markers.map((m, i) => {
        const pct = wlToPercent(m.nm);
        return (
          <div
            key={i}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          >
            <div
              className="w-0.5 h-8"
              style={{ background: "rgba(255,255,255,0.9)" }}
            />
            <div
              className="mt-1 px-1 py-0.5 rounded text-xs font-mono whitespace-nowrap"
              style={{ background: m.color, color: "#fff", fontSize: "10px" }}
              data-testid={`spectrum-marker-${i}`}
            >
              {m.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Encode result card ──────────────────────────────────────────

function EncodedCard({ data }: { data: any }) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        borderColor: data.spectrum_color,
        background: `${data.spectrum_color}18`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ background: data.spectrum_color }}
        />
        <span className="font-mono text-sm text-slate-200">{data.label || data.instruction}</span>
        <Badge className="ml-auto text-xs bg-slate-700 text-slate-300">
          {data.psi_channel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
        <div className="bg-slate-900/60 rounded p-2">
          <p className="text-slate-500">Wavelength</p>
          <p className="text-cyan-300">{data.wavelength_mid_nm} nm</p>
          <p className="text-slate-600">{wlLabel(data.wavelength_mid_nm)}</p>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <p className="text-slate-500">Frequency</p>
          <p className="text-yellow-300">{(data.frequency_hz / 1e12).toFixed(1)} THz</p>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <p className="text-slate-500">Energy (E=hf)</p>
          <p className="text-green-300">{data.energy_joules?.toExponential(3)} J</p>
        </div>
        <div className="bg-slate-900/60 rounded p-2">
          <p className="text-slate-500">Λ mass</p>
          <p className="text-violet-300">{data.lambda_mass_kg?.toExponential(3)} kg</p>
        </div>
      </div>

      <div className="relative">
        <div
          className="h-2 w-full bg-slate-800 rounded"
        />
        <div
          className="absolute top-0 h-2 rounded"
          style={{
            left: `${wlToPercent(data.wavelength_start_nm)}%`,
            width: `${wlToPercent(data.wavelength_end_nm) - wlToPercent(data.wavelength_start_nm)}%`,
            background: data.spectrum_color,
            minWidth: "4px",
          }}
        />
      </div>

      <p className="text-xs text-slate-500 font-mono">
        {data.frame_count} SE frames · {data.ce_token_count} CE tokens ·{" "}
        {data.wavelength_start_nm}–{data.wavelength_end_nm} nm
      </p>
    </div>
  );
}

// ─── Tab 1: Encode ───────────────────────────────────────────────

function EncodeTab() {
  const [instruction, setInstruction] = useState("function renderApp() { return <App /> }");
  const [label, setLabel]             = useState("renderApp");
  const [result, setResult]           = useState<any>(null);

  const encodeMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/nexus/dev/encode", { instruction, label })
        .then(r => r.json()),
    onSuccess: setResult,
  });

  const EXAMPLES = [
    { label: "GET /home",         instruction: "function home() { return <Home /> }" },
    { label: "POST /api/auth",    instruction: "async function authenticate(user, pass) {}" },
    { label: "useState",          instruction: "const [user, setUser] = useState(null)" },
    { label: "useEffect",         instruction: "useEffect(() => { fetchData() }, [])" },
    { label: "renderHeader",      instruction: "function Header() { return <header><nav /></header> }" },
    { label: "SELECT query",      instruction: "SELECT * FROM users WHERE active = true" },
    { label: "WebSocket connect", instruction: "const ws = new WebSocket(url)" },
    { label: "Lambda function",   instruction: "const handler = async (event) => { return 200 }" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Type any code instruction. It will be encoded through WNSP-CE → WNSP-SE and
        assigned a physical wavelength address in the visible spectrum.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label className="text-xs text-slate-400">Instruction / Code</Label>
          <Textarea
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm min-h-16"
            data-testid="input-instruction"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-400">Label</Label>
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-sm"
            data-testid="input-label"
          />
          <Button
            className="w-full mt-2"
            onClick={() => encodeMutation.mutate()}
            disabled={encodeMutation.isPending || !instruction}
            data-testid="btn-encode"
          >
            <Zap className="w-3 h-3 mr-1" />
            {encodeMutation.isPending ? "Encoding…" : "Encode → Spectrum"}
          </Button>
        </div>
      </div>

      {/* Quick examples */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Quick examples:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setInstruction(ex.instruction); setLabel(ex.label); }}
              className="px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 font-mono"
              data-testid={`example-${i}`}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && !result.error && (
        <div className="space-y-3">
          <SpectrumBar
            markers={[{
              label:  result.label || result.instruction?.slice(0, 12),
              nm:     result.wavelength_mid_nm,
              color:  result.spectrum_color,
            }]}
          />
          <EncodedCard data={result} />

          {/* Frame table */}
          {result.frames?.length > 0 && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-slate-400">
                  SE Wave Frames ({result.frames.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-500">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Symbols</th>
                      <th className="p-2 text-right">λ start (nm)</th>
                      <th className="p-2 text-right">λ end (nm)</th>
                      <th className="p-2 text-right">Energy (J)</th>
                      <th className="p-2 text-right">Λ mass (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.frames.slice(0, 12).map((f: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/40">
                        <td className="p-2 text-slate-500">{i + 1}</td>
                        <td className="p-2 text-slate-200">{f.ce_symbols?.join(" + ")}</td>
                        <td className="p-2 text-right text-cyan-400">{f.wavelength_start_nm?.toFixed(2)}</td>
                        <td className="p-2 text-right text-cyan-300">{f.wavelength_end_nm?.toFixed(2)}</td>
                        <td className="p-2 text-right text-green-400">{f.energy_joules?.toExponential(3)}</td>
                        <td className="p-2 text-right text-violet-400">{f.lambda_mass_kg?.toExponential(3)}</td>
                      </tr>
                    ))}
                    {result.frames.length > 12 && (
                      <tr>
                        <td colSpan={6} className="p-2 text-center text-slate-500">
                          +{result.frames.length - 12} more frames
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {result?.error && (
        <p className="text-red-400 text-sm font-mono">{result.error}</p>
      )}
    </div>
  );
}

// ─── Tab 2: App Builder ──────────────────────────────────────────

const DEFAULT_COMPONENTS = [
  { label: "GET /",          type: "route",    instruction: "function home() { return <Home /> }" },
  { label: "GET /auth",      type: "route",    instruction: "function auth() { return <Auth /> }" },
  { label: "renderHeader",   type: "function", instruction: "function Header() { return <header /> }" },
  { label: "userState",      type: "variable", instruction: "const [user, setUser] = useState(null)" },
  { label: "onLogin",        type: "event",    instruction: "function onLogin(e) { dispatch(login(e)) }" },
];

function AppBuilderTab() {
  const [appName, setAppName]       = useState("MyNexusApp");
  const [components, setComponents] = useState(DEFAULT_COMPONENTS);
  const [builtApp, setBuiltApp]     = useState<any>(null);

  const buildMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/nexus/dev/build", { app_name: appName, components })
        .then(r => r.json()),
    onSuccess: setBuiltApp,
  });

  const addComponent = () =>
    setComponents(c => [...c, { label: "", type: "function", instruction: "" }]);

  const removeComponent = (i: number) =>
    setComponents(c => c.filter((_, idx) => idx !== i));

  const updateComponent = (i: number, field: string, value: string) =>
    setComponents(c => c.map((comp, idx) =>
      idx === i ? { ...comp, [field]: value } : comp
    ));

  const markers = builtApp?.components?.map((c: any) => ({
    label: c.label,
    nm:    c.wavelength_mid_nm,
    color: c.spectrum_color,
    type:  c.component_type,
  })) ?? [];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">
        Define your app's components. Each one will be encoded through CE→SE and
        assigned a unique wavelength address and Ψ channel in the Hilbert space.
      </p>

      <div className="flex gap-3 items-center">
        <div className="flex-1">
          <Label className="text-xs text-slate-400">App Name</Label>
          <Input
            value={appName}
            onChange={e => setAppName(e.target.value)}
            className="bg-slate-800 border-slate-600 text-slate-200 font-mono"
            data-testid="input-app-name"
          />
        </div>
        <Button
          className="mt-5"
          onClick={() => buildMutation.mutate()}
          disabled={buildMutation.isPending || components.length === 0}
          data-testid="btn-build-app"
        >
          <Play className="w-3 h-3 mr-1" />
          {buildMutation.isPending ? "Building…" : "Build App"}
        </Button>
      </div>

      {/* Component list */}
      <div className="space-y-2">
        {components.map((comp, i) => (
          <div key={i} className="flex gap-2 items-start p-2 rounded border border-slate-700 bg-slate-900/40">
            <div className="w-24 flex-shrink-0">
              <Select
                value={comp.type}
                onValueChange={v => updateComponent(i, "type", v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-xs h-8"
                  data-testid={`select-type-${i}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="route">route</SelectItem>
                  <SelectItem value="function">function</SelectItem>
                  <SelectItem value="variable">variable</SelectItem>
                  <SelectItem value="event">event</SelectItem>
                  <SelectItem value="component">component</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              value={comp.label}
              onChange={e => updateComponent(i, "label", e.target.value)}
              placeholder="Label"
              className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-xs h-8 w-32 flex-shrink-0"
              data-testid={`input-comp-label-${i}`}
            />
            <Input
              value={comp.instruction}
              onChange={e => updateComponent(i, "instruction", e.target.value)}
              placeholder="Code instruction"
              className="bg-slate-800 border-slate-600 text-slate-200 font-mono text-xs h-8 flex-1"
              data-testid={`input-comp-instruction-${i}`}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-slate-500 hover:text-red-400"
              onClick={() => removeComponent(i)}
              data-testid={`btn-remove-${i}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <Button
          size="sm" variant="outline"
          onClick={addComponent}
          data-testid="btn-add-component"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Component
        </Button>
      </div>

      {/* Built app output */}
      {builtApp && !builtApp.error && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-lg text-slate-100">{builtApp.app_name}</span>
            <Badge className="bg-green-800">BUILT</Badge>
            <span className="text-slate-400 text-sm">
              {builtApp.component_count} components ·{" "}
              {builtApp.spectrum_coverage?.span_nm?.toFixed(0)} nm spectrum span
            </span>
          </div>

          <SpectrumBar markers={markers} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {builtApp.components?.map((c: any, i: number) => (
              <EncodedCard key={i} data={c} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-3">
                <p className="text-slate-500">Spectrum Range</p>
                <p className="text-cyan-300">
                  {builtApp.spectrum_coverage?.min_nm}–{builtApp.spectrum_coverage?.max_nm} nm
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-3">
                <p className="text-slate-500">Total Energy</p>
                <p className="text-green-300">
                  {builtApp.total_energy_joules?.toExponential(3)} J
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-700">
              <CardContent className="p-3">
                <p className="text-slate-500">Components</p>
                <p className="text-violet-300">{builtApp.component_count} × Ψ channels</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {builtApp?.error && (
        <p className="text-red-400 text-sm font-mono">{builtApp.error}</p>
      )}
    </div>
  );
}

// ─── Tab 3: Spectrum Map ─────────────────────────────────────────

function SpectrumMapTab() {
  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm">
        Every band of the visible spectrum is a domain for a different class of
        software component. A Nexus-native app assigns each component to its
        natural spectral home.
      </p>

      {/* Full spectrum display */}
      <div
        className="h-16 w-full rounded-xl"
        style={{
          background:
            "linear-gradient(to right," +
            "#8b00ff 0%," +
            "#4400ff 10%," +
            "#0000ff 15%," +
            "#0080ff 22%," +
            "#00cfff 30%," +
            "#00ff80 40%," +
            "#00ff00 48%," +
            "#80ff00 55%," +
            "#ffff00 60%," +
            "#ffcc00 65%," +
            "#ff8c00 70%," +
            "#ff4400 76%," +
            "#ff0000 85%," +
            "#cc0000 100%)",
          boxShadow: "0 0 40px rgba(100,80,255,0.3)",
        }}
      />

      {/* Band breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BAND_INFO.map((band, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg border"
            style={{
              borderColor: `${band.color}60`,
              background:  `${band.color}12`,
            }}
            data-testid={`band-card-${i}`}
          >
            <div
              className="w-3 h-12 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: band.color }}
            />
            <div>
              <p className="font-mono text-sm text-slate-200">{band.range} nm</p>
              <p className="text-xs text-slate-300 font-medium">{band.role}</p>
              <p className="text-xs text-slate-500 mt-1">
                {i === 0 && "Highest authority — system-level kernel routes"}
                {i === 1 && "Identity verification, token validation, sessions"}
                {i === 2 && "Reactive streams, real-time pipelines, WebSockets"}
                {i === 3 && "Business logic, computation, transformations"}
                {i === 4 && "Rendering, layout, visual state management"}
                {i === 5 && "Async events, webhooks, interrupts, signals"}
                {i === 6 && "Databases, file systems, caches, wallets"}
              </p>
            </div>
            <span
              className="ml-auto font-mono text-xs px-2 py-0.5 rounded"
              style={{ background: `${band.color}30`, color: band.color }}
            >
              {["violet","blue","cyan","green","yellow","orange","red"][i]}
            </span>
          </div>
        ))}
      </div>

      {/* Compared to classical addressing */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">
            Classical Addressing vs Spectral Addressing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div>
              <p className="text-slate-500 mb-2">Classical (memory)</p>
              <div className="space-y-1 text-slate-400">
                <p>renderApp → 0x7fff5fbff4c0</p>
                <p>getUser   → 0x7fff5fbff5a8</p>
                <p>setState  → 0x7fff5fbff6b0</p>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Arbitrary. Collision-prone. No physical meaning.
              </p>
            </div>
            <div>
              <p className="text-violet-400 mb-2">Nexus (spectral)</p>
              <div className="space-y-1">
                <p className="text-cyan-300">renderApp → 543 nm · Ψ(87,12,H)</p>
                <p className="text-green-300">getUser   → 521 nm · Ψ(42,7,V)</p>
                <p className="text-yellow-300">setState  → 568 nm · Ψ(156,31,H)</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Deterministic. Orthogonal. Physics-grounded.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 4: SDK Spec ─────────────────────────────────────────────

function SdkSpecTab() {
  const { data } = useQuery({
    queryKey: ["/api/nexus/dev/spec"],
  });

  if (!data) return <p className="text-slate-400">Loading spec…</p>;

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-slate-100">{data.name}</h2>
        <Badge className="bg-violet-800">v{data.version}</Badge>
        <Badge className="bg-slate-700">AGPL-3.0</Badge>
      </div>
      <p className="text-slate-400 max-w-2xl">{data.description}</p>

      {/* Encoding pipeline */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-400">Encoding Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-1 items-start md:items-center">
            {data.encoding_pipeline?.map((step: string, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <div className="bg-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-300">
                  {step}
                </div>
                {i < data.encoding_pipeline.length - 1 && (
                  <span className="text-slate-600 text-xs hidden md:block">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Component types */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-400">Component Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.component_types && Object.entries(data.component_types).map(([type, desc]: [string, any]) => (
              <div key={type} className="flex gap-2 items-start p-2 bg-slate-800 rounded">
                <Badge className="bg-slate-700 text-xs flex-shrink-0">{type}</Badge>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Guarantees */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-400">Physics Guarantees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.guarantees?.map((g: string, i: number) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <p className="text-xs font-mono text-slate-300">{g}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Example app */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-slate-400">Example Nexus App Manifest</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-slate-300 bg-slate-800 p-3 rounded overflow-x-auto">
{`{
  "app_name": "MyNexusApp",
  "protocol": "WNSP-CE → WNSP-SE",
  "equation": "Λ = hf/c²",
  "components": [
    { "type": "route",    "label": "GET /",     "instruction": "function home() {}" },
    { "type": "route",    "label": "POST /auth", "instruction": "async function auth() {}" },
    { "type": "function", "label": "render",     "instruction": "function render() {}" },
    { "type": "variable", "label": "userState",  "instruction": "useState(null)" }
  ]
}`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────

export default function PhotonicDevPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#8b00ff,#00cfff)" }}>
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Nexus Photonic Development Environment
            </h1>
            <p className="text-slate-400 text-sm">
              Programming with the Spectrum — WNSP-CE → WNSP-SE as the language substrate
            </p>
          </div>
        </div>

        {/* Spectrum preview */}
        <div
          className="h-2 w-full rounded"
          style={{
            background:
              "linear-gradient(to right,#8b00ff,#0000ff,#00cfff,#00ff00,#ffff00,#ff8c00,#cc0000)",
          }}
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1 font-mono">
          <span>380 nm — System</span>
          <span>490 nm — Auth</span>
          <span>520 nm — Core</span>
          <span>580 nm — UI</span>
          <span>625 nm — Events</span>
          <span>780 nm — Storage</span>
        </div>
      </div>

      <Tabs defaultValue="encode">
        <TabsList className="bg-slate-900 border border-slate-700 mb-4">
          <TabsTrigger value="encode"   data-testid="tab-encode">
            <Zap className="w-3 h-3 mr-1" /> Encode
          </TabsTrigger>
          <TabsTrigger value="builder"  data-testid="tab-builder">
            <Layers className="w-3 h-3 mr-1" /> App Builder
          </TabsTrigger>
          <TabsTrigger value="spectrum" data-testid="tab-spectrum">
            <Code2 className="w-3 h-3 mr-1" /> Spectrum Map
          </TabsTrigger>
          <TabsTrigger value="sdk"      data-testid="tab-sdk">
            <BookOpen className="w-3 h-3 mr-1" /> SDK Spec
          </TabsTrigger>
        </TabsList>

        <TabsContent value="encode">
          <h2 className="text-sm font-semibold text-cyan-300 mb-3">
            Encode any code instruction → wavelength address
          </h2>
          <EncodeTab />
        </TabsContent>

        <TabsContent value="builder">
          <h2 className="text-sm font-semibold text-green-300 mb-3">
            Build a complete app — each component gets a Ψ channel in the spectrum
          </h2>
          <AppBuilderTab />
        </TabsContent>

        <TabsContent value="spectrum">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3">
            The visible spectrum as an application namespace
          </h2>
          <SpectrumMapTab />
        </TabsContent>

        <TabsContent value="sdk">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">
            Nexus Photonic SDK — formal specification
          </h2>
          <SdkSpecTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
