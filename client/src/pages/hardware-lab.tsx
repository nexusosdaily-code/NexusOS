import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Cpu, FlaskConical, Download, Copy, Check, Search, ArrowLeft,
  Zap, Radio, AlertCircle, CheckCircle2, Package,
  Microscope, Server, Shield, Star, GitFork, Eye, TrendingUp, RefreshCw, GitBranch
} from "lucide-react";

// ── API response types ──────────────────────────────────────────────────────
interface SEFrame {
  ce_symbols: string[];
  cycles: number;
  energy_joules: number;
  frequency_end_hz: number;
  frequency_start_hz: number;
  intensity: number;
  lambda_mass_kg: number;
  protocol: string;
  scheme: string;
  version: string;
  wascii_defined: boolean[];
  wavelength_end_nm: number;
  wavelength_start_nm: number;
}

interface EncodeResponse {
  ce_token_count: number;
  energy_joules: number;
  frame_count: number;
  frames: SEFrame[];
  wavelength_mid_nm: number;
  psi_channel: string;
}

interface WasciiEntry {
  char: string;
  wavelength_nm: number;
  frequency_hz: number;
  energy_joules: number;
}

interface WasciiTableResponse {
  table: WasciiEntry[];
  date: string;
  protocol: string;
  range_nm: { min: number; max: number };
  standard: string;
}

// ── Wavelength → RGB colour ─────────────────────────────────────────────────
function wlToRgb(nm: number): string {
  let r = 0, g = 0, b = 0;
  if (nm >= 350 && nm < 380) { r = 0.4; g = 0; b = 0.8; }
  else if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm >= 440 && nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm >= 490 && nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm >= 645 && nm <= 780) { r = 1; }
  else if (nm > 780) { r = 0.6; g = 0; b = 0; }
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}

function bandOf(nm: number): { label: string; color: string } {
  if (nm < 380)  return { label: "UV",          color: "#7c3aed" };
  if (nm < 450)  return { label: "Violet",       color: "#8b00ff" };
  if (nm < 490)  return { label: "Blue",         color: "#2563eb" };
  if (nm < 520)  return { label: "Cyan",         color: "#06b6d4" };
  if (nm < 565)  return { label: "Green",        color: "#16a34a" };
  if (nm < 590)  return { label: "Yellow",       color: "#ca8a04" };
  if (nm < 625)  return { label: "Orange",       color: "#ea580c" };
  if (nm <= 780) return { label: "Red",          color: "#dc2626" };
  return               { label: "Near-IR",       color: "#7f1d1d" };
}

function Swatch({ nm }: { nm: number }) {
  const c = wlToRgb(nm);
  const b = bandOf(nm);
  return (
    <div
      className="w-8 h-5 rounded border border-white/10 flex-shrink-0"
      style={{ background: c, boxShadow: `0 0 6px ${b.color}60` }}
      title={`${nm}nm`}
    />
  );
}

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`flex items-center gap-1 transition-colors ${small ? "text-xs text-slate-500 hover:text-slate-300" : "text-sm text-slate-400 hover:text-slate-200"}`}
      data-testid="copy-btn"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {!small && (copied ? "Copied" : "Copy")}
    </button>
  );
}

// ── Wavelength → GPIO PWM values for 3-LED RGB laser ──────────────────────
function wlToGPIO(nm: number): { r: number; g: number; b: number } {
  // Map wavelength to PWM duty-cycle (0-255) for Red/Green/Blue laser channels
  // Red diode: 635-660nm, Green: 520-532nm, Blue: 445-450nm
  let r = 0, g = 0, b = 0;
  if (nm < 450) { b = 255; r = 0; g = 0; }
  else if (nm < 490) { b = Math.round(255 * (490 - nm) / 40); g = Math.round(80 * (nm - 450) / 40); }
  else if (nm < 520) { b = 0; g = 255; }
  else if (nm < 565) { g = 255; r = Math.round(100 * (nm - 520) / 45); }
  else if (nm < 590) { g = Math.round(255 * (590 - nm) / 25); r = 255; }
  else if (nm < 625) { g = 0; r = 255; }
  else { r = 255; g = 0; b = 0; }
  return { r, g, b };
}

function gpioScript(nm: number): string {
  const { r, g, b } = wlToGPIO(nm);
  return `GPIO.output(PIN_RED, ${r > 0});  # PWM=${r}\nGPIO.output(PIN_GREEN, ${g > 0});  # PWM=${g}\nGPIO.output(PIN_BLUE, ${b > 0});  # PWM=${b}`;
}

// ── Pi Python script generator ─────────────────────────────────────────────
function generatePiScript(table: { char: string; wavelength_nm: number; frequency_hz: number; energy_joules: number }[]): string {
  const lookup = table.map(e => `  "${e.char.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}": ${e.wavelength_nm.toFixed(1)}`).join(",\n");
  return `#!/usr/bin/env python3
"""
NexusOS Hardware Lab — Raspberry Pi CE Encoder Bridge
Generated by NexusOS WNSP Hardware Lab · AGPL-3.0
https://github.com/nexusosdaily-code/NexusOS

Wiring (BCM numbering):
  Red   laser → GPIO 17  (PWM-capable)
  Green laser → GPIO 27  (PWM-capable)
  Blue  laser → GPIO 22  (PWM-capable)

Requirements: pip install RPi.GPIO
"""

import RPi.GPIO as GPIO
import time
import sys

# ── GPIO Setup ─────────────────────────────────────────────────────────────
PIN_RED   = 17
PIN_GREEN = 27
PIN_BLUE  = 22
PWM_FREQ  = 1000  # Hz

GPIO.setmode(GPIO.BCM)
GPIO.setup([PIN_RED, PIN_GREEN, PIN_BLUE], GPIO.OUT)

pwm_r = GPIO.PWM(PIN_RED,   PWM_FREQ)
pwm_g = GPIO.PWM(PIN_GREEN, PWM_FREQ)
pwm_b = GPIO.PWM(PIN_BLUE,  PWM_FREQ)
pwm_r.start(0); pwm_g.start(0); pwm_b.start(0)

# ── WASCII v7 Character → Wavelength (nm) ──────────────────────────────────
# Source: WNSP-CE v1.0 / NexusOS CE Encoder
# Physics: E = hf, λ = c/f, Λ = hf/c²
WASCII_TABLE = {
${lookup}
}

# ── Wavelength → RGB PWM duty-cycle (0-100) ────────────────────────────────
def wl_to_pwm(nm: float) -> tuple[float, float, float]:
    """Map wavelength in nm to (R%, G%, B%) PWM duty cycles."""
    r, g, b = 0.0, 0.0, 0.0
    if nm < 450:
        b = 100.0
    elif nm < 490:
        b = (490 - nm) / 40 * 100
        g = (nm - 450) / 40 * 30
    elif nm < 520:
        g = 100.0
    elif nm < 565:
        g = 100.0
        r = (nm - 520) / 45 * 40
    elif nm < 590:
        g = (590 - nm) / 25 * 100
        r = 100.0
    elif nm < 625:
        r = 100.0
    else:
        r = 100.0
    return round(r, 1), round(g, 1), round(b, 1)

def emit(nm: float, duration: float = 0.5):
    """Drive lasers to target wavelength for duration seconds."""
    r, g, b = wl_to_pwm(nm)
    pwm_r.ChangeDutyCycle(r)
    pwm_g.ChangeDutyCycle(g)
    pwm_b.ChangeDutyCycle(b)
    print(f"  λ={nm:.1f}nm  R={r}%  G={g}%  B={b}%")
    time.sleep(duration)
    pwm_r.ChangeDutyCycle(0)
    pwm_g.ChangeDutyCycle(0)
    pwm_b.ChangeDutyCycle(0)

def ce_encode_char(char: str) -> float:
    """Look up a character's CE-assigned wavelength."""
    return WASCII_TABLE.get(char, WASCII_TABLE.get(char.lower(), 560.0))

def calculate_calibrated_wavelength(ordinal: int, measured_drift: float = 0.0) -> float:
    """
    Return the expected CE wavelength for a given ordinal (charCode % 128),
    with an optional systematic drift offset discovered during spectrometer calibration.

    Formula: BASE_LAMBDA + (ordinal % 128) / 128 × 400 + measured_drift
    The % 128 keeps any ordinal within the visible 380–780 nm band.

    Usage:
        # During calibration you observed the spectrometer always reads +1.2 nm high.
        # Pass measured_drift=-1.2 to compensate.
        target = calculate_calibrated_wavelength(ord('A') % 128, measured_drift=-1.2)
    """
    BASE_LAMBDA = 380.0
    BAND_WIDTH  = 400.0  # visible range covered by 128 CE bands
    theoretical = BASE_LAMBDA + (ordinal % 128) / 128.0 * BAND_WIDTH
    return round(theoretical + measured_drift, 3)

# ── Main loop ──────────────────────────────────────────────────────────────
print("NexusOS Pi CE Bridge · WNSP-CE v1.0")
print("Type text to encode each character as a wavelength of light.")
print("Press Ctrl+C to exit.\\n")

try:
    while True:
        text = input("Enter text > ")
        print(f"Encoding '{text}':")
        for ch in text:
            nm = ce_encode_char(ch)
            band = "UV" if nm < 380 else "Violet" if nm < 450 else "Blue" if nm < 490 else \\
                   "Cyan" if nm < 520 else "Green" if nm < 565 else "Yellow" if nm < 590 else \\
                   "Orange" if nm < 625 else "Red" if nm <= 780 else "Near-IR"
            print(f"  '{ch}' → {nm:.1f}nm ({band})", end="")
            emit(nm, duration=0.4)
        print()
except KeyboardInterrupt:
    print("\\nShutting down.")
finally:
    pwm_r.stop(); pwm_g.stop(); pwm_b.stop()
    GPIO.cleanup()
`;
}

// ── WASCII Reference Table tab ─────────────────────────────────────────────
function WasciiTable() {
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState("all");

  const { data, isLoading, error, refetch } = useQuery<WasciiTableResponse>({
    queryKey: ["/api/wnsp/wascii/table"],
    staleTime: Infinity,
    retry: 3,
    retryDelay: 2000,
  });

  const bands = ["all", "UV", "Violet", "Blue", "Cyan", "Green", "Yellow", "Orange", "Red", "Near-IR"];

  const filtered = (data?.table ?? []).filter(row => {
    const b = bandOf(row.wavelength_nm).label;
    const matchBand = bandFilter === "all" || b === bandFilter;
    const matchSearch = !search || row.char.includes(search) ||
      row.wavelength_nm.toFixed(1).includes(search);
    return matchBand && matchSearch;
  });

  function exportCSV() {
    const rows = ["char,wavelength_nm,frequency_THz,energy_J,band,oam_mode,polarisation,psi_channel"];
    (data?.table ?? []).forEach(r => {
      const b = bandOf(r.wavelength_nm);
      const oam = Math.round((r.wavelength_nm - 350) / (1033 - 350) * 49);
      rows.push(`"${r.char}",${r.wavelength_nm.toFixed(1)},${(r.frequency_hz / 1e12).toFixed(4)},${r.energy_joules.toExponential(4)},${b.label},${oam},H,Ψ(${Math.round((r.wavelength_nm - 350) / (1033 - 350) * 255)};${oam};H)`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "wascii_v7_reference.csv"; a.click();
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      Loading WASCII table…
    </div>
  );
  if (error) return (
    <div className="flex flex-col gap-3 p-4 bg-red-950/20 border border-red-800/40 rounded-xl">
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">Spectral API unreachable — the physics engine may still be booting (takes ~5s after restart)</span>
      </div>
      <Button onClick={() => refetch()} size="sm" variant="outline" className="w-fit border-red-700 text-red-400 hover:bg-red-950" data-testid="btn-retry-wascii">
        <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search character or λ…"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
            data-testid="input-wascii-search"
          />
        </div>
        <select
          value={bandFilter}
          onChange={e => setBandFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          data-testid="select-band-filter"
        >
          {bands.map(b => <option key={b} value={b}>{b === "all" ? "All bands" : b}</option>)}
        </select>
        <Button onClick={exportCSV} variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <Download className="w-3 h-3 mr-1" /> Export CSV
        </Button>
        <span className="text-xs text-slate-500">{filtered.length} entries</span>
      </div>

      <div className="overflow-auto max-h-[540px] rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="text-left px-4 py-3 text-slate-400 font-medium w-12">Char</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">λ (nm)</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium hidden sm:table-cell">Freq (THz)</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium hidden md:table-cell">Energy (J)</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">OAM ℓ</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium hidden lg:table-cell">Pol</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Band</th>
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Ψ channel</th>
              <th className="px-4 py-3 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const b = bandOf(row.wavelength_nm);
              const wdm = Math.round((row.wavelength_nm - 350) / (1033 - 350) * 255);
              const oam = Math.round((row.wavelength_nm - 350) / (1033 - 350) * 49);
              const psi = `Ψ(${wdm},${oam},H)`;
              return (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-900/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Swatch nm={row.wavelength_nm} />
                      <span className="font-mono text-base text-white">{row.char}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-violet-300">{row.wavelength_nm.toFixed(1)}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400 hidden sm:table-cell">{(row.frequency_hz / 1e12).toFixed(3)}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-500 hidden md:table-cell text-xs">{row.energy_joules.toExponential(3)}</td>
                  <td className="px-4 py-2.5 font-mono text-amber-400 hidden lg:table-cell text-xs">{oam}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-400 hidden lg:table-cell text-xs">H</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: b.color + "22", color: b.color }}>{b.label}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{psi}</td>
                  <td className="px-4 py-2.5"><CopyBtn text={`${row.char},${row.wavelength_nm},${psi}`} small /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">WASCII v7 · WNSP-CE v1.0 · Physics: E=hf, Λ=hf/c² · AGPL-3.0</p>
    </div>
  );
}

// ── Character Trace tab ────────────────────────────────────────────────────
function CharTrace() {
  const [input, setInput] = useState("");

  const { mutate, data, isPending, error } = useMutation<EncodeResponse, Error, string>({
    mutationFn: async (text: string) => {
      const r = await apiRequest("POST", "/api/nexus/dev/encode", { instruction: text, label: `hw_lab_${Date.now()}` });
      return r.json() as Promise<EncodeResponse>;
    },
  });

  const go = useCallback(() => { if (input.trim()) mutate(input.trim()); }, [input, mutate]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-400">
        Type any text to trace the full CE→SE encoding path — each step from raw character through to the GPIO command the Pi sends to the laser.
      </p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="e.g. Nexus"
          className="bg-slate-900 border-slate-700 text-slate-200"
          data-testid="input-char-trace"
        />
        <Button onClick={go} disabled={isPending || !input.trim()} className="bg-violet-600 hover:bg-violet-700" data-testid="btn-trace-encode">
          {isPending ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Zap className="w-4 h-4" />}
          Trace
        </Button>
      </div>

      {error && <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-900/20 rounded-lg"><AlertCircle className="w-4 h-4" /> Encoding failed — spectral API unreachable</div>}

      {data && (
        <div className="space-y-4">
          {/* Summary banner */}
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 flex flex-wrap gap-6 items-center">
            <div style={{ width: 56, height: 56, borderRadius: 12, background: wlToRgb(data.wavelength_mid_nm), boxShadow: `0 0 24px ${wlToRgb(data.wavelength_mid_nm)}` }} />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Spectral Address</div>
              <div className="font-mono text-lg text-violet-300">{data.psi_channel}</div>
              <div className="text-xs text-slate-400">λ = {data.wavelength_mid_nm.toFixed(1)} nm · E = {data.energy_joules.toExponential(3)} J · {data.ce_token_count} CE tokens</div>
            </div>
            <CopyBtn text={`${input} → ${data.psi_channel} λ=${data.wavelength_mid_nm.toFixed(1)}nm`} />
          </div>

          {/* Step-by-step trace */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">CE → SE Trace</div>

            {/* Step 0: raw text → CE ordinal tokens */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs font-mono space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold flex-shrink-0">0</div>
                <span className="text-slate-300">Raw input → CE ordinal tokens</span>
              </div>
              <div className="pl-8 text-slate-500 space-y-0.5">
                <div>
                  {input.split("").map((ch, j) => (
                    <span key={j} className="mr-3">
                      <span className="text-white">'{ch}'</span>
                      <span className="text-slate-600"> → </span>
                      <span className="text-amber-400">ord={ch.charCodeAt(0)}</span>
                    </span>
                  ))}
                </div>
                <div className="text-slate-600">Protocol: WNSP-CE v1.0 · Standard: WASCII v7</div>
              </div>
            </div>

            {data.frames.map((f: SEFrame, i: number) => {
              const midNm = (f.wavelength_start_nm + f.wavelength_end_nm) / 2;
              const gpio = wlToGPIO(midNm);
              return (
                <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-violet-900 text-violet-300 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <span className="text-slate-300">Frame {i + 1} · CE tokens: [{f.ce_symbols.join(", ")}]</span>
                    <Swatch nm={midNm} />
                  </div>
                  <div className="pl-8 text-slate-500 space-y-0.5">
                    <div>λ: {f.wavelength_start_nm.toFixed(1)}–{f.wavelength_end_nm.toFixed(1)} nm · f: {(f.frequency_start_hz / 1e12).toFixed(3)}–{(f.frequency_end_hz / 1e12).toFixed(3)} THz</div>
                    <div>E: {f.energy_joules.toExponential(3)} J · Λ-mass: {f.lambda_mass_kg.toExponential(3)} kg</div>
                    <div className="text-amber-500">GPIO → R:{gpio.r} G:{gpio.g} B:{gpio.b}  {gpioScript(midNm)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pi Script Generator tab ────────────────────────────────────────────────
function PiScript() {
  const { data, isLoading } = useQuery<WasciiTableResponse>({
    queryKey: ["/api/wnsp/wascii/table"],
    staleTime: Infinity,
  });

  const script = data?.table ? generatePiScript(data.table) : "";

  function download() {
    const blob = new Blob([script], { type: "text/x-python" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "hardware_lab_pi.py"; a.click();
  }

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Cpu className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-slate-200">Raspberry Pi CE Encoder Bridge</div>
            <div className="text-xs text-slate-400 mt-1">
              This script embeds the full WASCII v7 table and runs on any Raspberry Pi.
              It reads keyboard input, CE-encodes each character, and drives Red/Green/Blue laser diodes
              to the computed wavelength via GPIO PWM. No server required — physics runs on-device.
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-500 bg-slate-950 rounded-lg p-3 font-mono space-y-0.5">
          <div><span className="text-violet-400">Wiring:</span> Red laser → GPIO 17 · Green → GPIO 27 · Blue → GPIO 22</div>
          <div><span className="text-violet-400">Install:</span> pip install RPi.GPIO</div>
          <div><span className="text-violet-400">Run:</span> python3 hardware_lab_pi.py</div>
          <div><span className="text-violet-400">License:</span> AGPL-3.0 · Free to use, share, and modify</div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={download} disabled={isLoading || !script} className="bg-amber-600 hover:bg-amber-700" data-testid="btn-download-pi-script">
          <Download className="w-4 h-4 mr-2" /> Download hardware_lab_pi.py
        </Button>
        {script && <CopyBtn text={script} />}
      </div>

      {isLoading ? (
        <div className="text-slate-500 text-sm animate-pulse">Loading WASCII table to generate script…</div>
      ) : (
        <pre className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-auto max-h-96 text-slate-400 leading-relaxed whitespace-pre">
          {script.slice(0, 3000)}{script.length > 3000 ? "\n\n… (download to see full script)" : ""}
        </pre>
      )}
    </div>
  );
}

// ── Spectrometer readback response type ────────────────────────────────────
interface SpectrometerReading {
  wavelength_nm: number;
  device: string;
  hardware: boolean;
  timestamp: number;
  warning?: string;
}

// ── CE wavelength helper ───────────────────────────────────────────────────
function nmFromChar(ch: string): number {
  const BASE = 380, BW = 400, BANDS = 128;
  return BASE + (ch.charCodeAt(0) % BANDS) / BANDS * BW;
}

// ── Calibration Verifier tab ───────────────────────────────────────────────
function Calibration() {
  const [char, setChar] = useState("N");
  const [measured, setMeasured] = useState("");
  const [livePolling, setLivePolling] = useState(false);
  const TOLERANCE = 2.0;

  // Expected λ is computed entirely in-browser — no network call needed.
  // Formula: BASE_LAMBDA + (charCode % 128) / 128 × 400 nm
  // The % 128 keeps Unicode/extended-ASCII chars within the visible 380–780 nm band.
  const expected = useMemo(() => char ? nmFromChar(char) : null, [char]);
  const ordinal   = useMemo(() => char ? char.charCodeAt(0) % 128 : null, [char]);

  // Live spectrometer polling — 1 Hz while livePolling is active
  const { data: spectroData, error: spectroError } = useQuery<SpectrometerReading>({
    queryKey: ["/api/hardware/spectrometer/read"],
    enabled: livePolling,
    refetchInterval: livePolling ? 1000 : false,
    staleTime: 0,
  });

  // Auto-fill measured field only when actual hardware is present.
  // When the endpoint returns simulated data the field stays editable so the
  // user can still type their own reading — the simulated value is shown as a
  // non-blocking hint in the label row instead.
  const isHardware = spectroData?.hardware === true;
  const deviceLabel = spectroData?.device ?? null;
  const inputLocked = livePolling && isHardware;

  useEffect(() => {
    if (inputLocked && spectroData?.wavelength_nm !== undefined) {
      setMeasured(String(spectroData.wavelength_nm));
    }
  }, [inputLocked, spectroData]);

  // Signed deviation: positive means laser reads high, negative means low.
  const measNm   = parseFloat(measured);
  const drift    = expected !== null && !isNaN(measNm) ? parseFloat((measNm - expected).toFixed(3)) : null;
  const absDrift = drift !== null ? Math.abs(drift) : null;
  const pass     = absDrift !== null && absDrift <= TOLERANCE;

  return (
    <div className="space-y-5 max-w-xl">
      <p className="text-sm text-slate-400">
        Verify hardware accuracy against the deterministic WNSP stack. Type a character — the
        expected wavelength is computed locally from the CE formula. Enable live readback to
        stream directly from your spectrometer, or enter a reading manually.
        Tolerance is ±{TOLERANCE} nm.
      </p>

      {/* Live polling toggle */}
      <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${livePolling ? (isHardware ? "bg-green-400 animate-pulse" : "bg-amber-400 animate-pulse") : "bg-slate-600"}`} />
          <span className="text-sm text-slate-300">
            {livePolling
              ? deviceLabel ? `Live · ${deviceLabel}` : "Connecting…"
              : "Live spectrometer readback"}
          </span>
          {spectroData?.warning && (
            <span className="text-xs text-amber-400 ml-1">⚠ fallback</span>
          )}
        </div>
        <button
          onClick={() => setLivePolling(p => !p)}
          data-testid="button-calib-live-toggle"
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            livePolling
              ? "border-red-500/50 text-red-300 hover:bg-red-950/30"
              : "border-violet-500/50 text-violet-300 hover:bg-violet-950/30"
          }`}
        >
          {livePolling ? "Stop" : "Start"}
        </button>
      </div>

      {livePolling && spectroError && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/30 rounded-lg px-4 py-2" data-testid="status-calib-spectro-error">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Spectrometer endpoint unreachable — enter wavelength manually below
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: inputs */}
        <div className="space-y-4 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase tracking-wider">Target character symbol</label>
            <Input
              value={char}
              onChange={e => { setChar(e.target.value.slice(-1)); setMeasured(""); }}
              maxLength={1}
              className="bg-slate-950 border-slate-700 text-slate-200 w-full text-center text-2xl font-mono"
              data-testid="input-calib-char"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500 uppercase tracking-wider">Spectrometer reading (nm)</label>
              {livePolling && spectroData && (
                <span className="text-xs text-slate-500" data-testid="text-calib-live-source">
                  {isHardware
                    ? "live hardware — auto-filled"
                    : `hint: ${spectroData.wavelength_nm} nm (sim)`}
                </span>
              )}
            </div>
            <Input
              value={measured}
              onChange={e => { if (!inputLocked) setMeasured(e.target.value); }}
              readOnly={inputLocked}
              placeholder={inputLocked ? "Waiting for hardware reading…" : "e.g. 584.125"}
              type="number"
              step="0.001"
              className={`bg-slate-950 border-slate-700 text-slate-200 font-mono ${inputLocked ? "cursor-not-allowed opacity-70" : ""}`}
              data-testid="input-calib-measured"
            />
            {livePolling && !isHardware && (
              <p className="text-xs text-amber-400/80" data-testid="status-calib-no-device">
                No spectrometer detected — enter your reading manually above.
              </p>
            )}
          </div>
        </div>

        {/* Right: live status engine */}
        <div className="flex flex-col justify-between bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Ordinal (n mod 128)</span>
              <span className="font-mono text-slate-200" data-testid="text-calib-ordinal">
                {ordinal !== null ? ordinal : "—"}
              </span>
            </div>
            {expected !== null && (
              <>
                <div className="flex justify-between border-b border-slate-800 pb-2 items-center">
                  <span className="text-slate-400">Expected λ</span>
                  <div className="flex items-center gap-2">
                    <Swatch nm={expected} />
                    <span className="font-mono text-indigo-400 font-bold" data-testid="text-calib-expected">
                      {expected.toFixed(3)} nm
                    </span>
                  </div>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Band</span>
                  <span className="font-mono text-slate-300">{bandOf(expected).label}</span>
                </div>
              </>
            )}
            <div className="flex justify-between pb-1">
              <span className="text-slate-400">Tolerance</span>
              <span className="font-mono text-slate-400">±{TOLERANCE.toFixed(1)} nm</span>
            </div>
          </div>

          {/* Validation result */}
          {drift !== null && (
            <div
              className={`mt-4 p-3 rounded-lg border flex flex-col items-center transition-colors ${
                pass
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-400"
                  : "bg-rose-950/40 border-rose-500/50 text-rose-400"
              }`}
              data-testid="status-calib-result"
            >
              <span className="text-xs uppercase font-bold tracking-widest">
                Hardware Status: {pass ? "PASS" : "FAIL"}
              </span>
              <span className="text-xl font-mono font-bold mt-1" data-testid="text-calib-verdict">
                {drift > 0 ? `+${drift}` : drift} nm drift
              </span>
              <span className="text-[10px] text-slate-300 mt-1 text-center">
                {pass
                  ? "Within threshold — optical stream is coherent."
                  : "Outside threshold — recalibrate laser diode mirrors."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component Procurement Guide tab ───────────────────────────────────────
const TIERS = [
  {
    label: "Tier 1", name: "Wave Channel Addressing", cost: "~$250–300",
    desc: "Proves a typed word produces a deterministic colour of light. Film this. It is the core claim.",
    color: "#16a34a",
    items: [
      { name: "Raspberry Pi 4 (8GB) + PSU + case", spec: "Official or approved reseller", source: "raspberrypi.com", cost: "$75–90" },
      { name: "RGB Laser Module (3-diode)", spec: "Red 650nm / Green 532nm / Blue 450nm, 5mW each", source: "eBay / Amazon", cost: "$50–80" },
      { name: "Polariser film sheets (×2)", spec: "Linear, broadband visible", source: "Amazon / camera store", cost: "$15–20" },
      { name: "Diffraction grating + webcam", spec: "1000 lines/mm grating + USB webcam — DIY spectrometer", source: "Amazon / eBay", cost: "$30–50" },
      { name: "Basic optics + post mounts", spec: "Beam direction, holders, tape-mount for test", source: "eBay / local hardware", cost: "$30–60" },
    ],
  },
  {
    label: "Tier 2", name: "Full 2D Channel (WDM + Polarisation)", cost: "~$800–1,200",
    desc: "Adds continuous wavelength tuning and precise measurement. Two dimensions of Ψ proven simultaneously.",
    color: "#2563eb",
    items: [
      { name: "Everything in Tier 1", spec: "", source: "", cost: "~$300" },
      { name: "Tunable diode laser", spec: "Continuous 400–700nm, 5–50mW, FC/PC output", source: "eBay (used research-grade)", cost: "$150–350" },
      { name: "USB Spectrometer", spec: "350–1000nm, <1nm resolution — Ocean Optics USB2000+", source: "eBay (used)", cost: "$200–400" },
      { name: "Wave plates λ/2 and λ/4", spec: "Broadband visible, SM1 threaded", source: "Edmund Optics / Thorlabs", cost: "$80–150" },
      { name: "Aluminium optical plate", spec: "300×450mm, M6 tapped, 10mm thick", source: "Thorlabs / local fab", cost: "$50–80" },
    ],
  },
  {
    label: "Tier 3", name: "Full Ψ(wdm, oam, pol) — 3D Channel", cost: "~$2,000–3,000",
    desc: "All three Hilbert-space dimensions encoded simultaneously in a single beam. Physics-native addressing fully demonstrated.",
    color: "#7c3aed",
    items: [
      { name: "Everything in Tier 2", spec: "", source: "", cost: "~$1,200" },
      { name: "Spatial Light Modulator (SLM)", spec: "1080p reflective, HDMI input — Holoeye or Meadowlark", source: "eBay (used)", cost: "$800–1,500" },
      { name: "Beam expander", spec: "5x–10x, compatible with laser aperture", source: "Thorlabs / eBay", cost: "$100–200" },
      { name: "Scientific CCD camera (mono)", spec: "USB3, global shutter — Basler or IDS", source: "eBay (used)", cost: "$200–400" },
      { name: "Laser safety enclosure", spec: "Black anodised aluminium panels + door interlock", source: "Local fab / laser safety supplier", cost: "$400–800" },
      { name: "Laser safety goggles (×2)", spec: "OD 4+ for visible wavelengths", source: "Kentek / Thorlabs", cost: "$80–150" },
    ],
  },
];

function BuildGuide() {
  const [copied, setCopied] = useState(false);

  const allItems = TIERS.flatMap(t => t.items.filter(i => !i.name.startsWith("Everything")));
  const partsList = TIERS.map(t =>
    `=== ${t.label}: ${t.name} (${t.cost}) ===\n` +
    t.items.map(i => `  • ${i.name}${i.spec ? ` [${i.spec}]` : ""}${i.cost ? ` — ${i.cost}` : ""} | ${i.source}`).join("\n")
  ).join("\n\n") + "\n\nSource: NexusOS Hardware Lab · AGPL-3.0 · github.com/nexusosdaily-code/NexusOS";

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-300">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-green-300 font-medium">AGPL-3.0 Open Build</span>
            <span className="text-slate-400"> — This hardware design is free infrastructure. Anyone who builds it and deploys it as a service must publish their modifications under the same license. The physics is the standard. No entity can proprietize it.</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => { navigator.clipboard.writeText(partsList); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 transition-colors"
          data-testid="btn-copy-parts-list"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy full parts list"}
        </button>
      </div>

      {TIERS.map(tier => (
        <div key={tier.label} className="rounded-xl border overflow-hidden" style={{ borderColor: tier.color + "44" }}>
          <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ background: tier.color + "11" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: tier.color + "33", color: tier.color }}>{tier.label}</span>
                <span className="font-medium text-slate-200">{tier.name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{tier.desc}</p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-lg" style={{ color: tier.color }}>{tier.cost}</div>
            </div>
          </div>

          <div className="divide-y divide-slate-800/50">
            {tier.items.map((item, j) => (
              <div key={j} className={`px-5 py-3 flex flex-wrap gap-x-4 gap-y-0.5 ${item.name.startsWith("Everything") ? "bg-slate-900/30 text-slate-500 italic" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200">{item.name}</div>
                  {item.spec && <div className="text-xs text-slate-500">{item.spec}</div>}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {item.source && <div className="text-xs text-slate-500">{item.source}</div>}
                  {item.cost && <div className="text-xs font-mono text-slate-300">{item.cost}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Server className="w-4 h-4 text-slate-400" />
          Lab Infrastructure (all tiers)
        </div>
        {[
          ["Optical breadboard", "600×900mm, M6 tapped, 12mm thick", "Thorlabs / eBay", "$400–700"],
          ["Anti-vibration feet (×4)", "Passive isolators for breadboard", "Thorlabs", "$200–400"],
          ["UPS power supply", "1500VA — protects lab gear", "APC / CyberPower", "$150–250"],
          ["Warning signage + door interlock", "Laser hazard signs + interlock switch", "Thorlabs / safety supplier", "$50–100"],
        ].map(([name, spec, src, cost], i) => (
          <div key={i} className="flex flex-wrap gap-x-4 text-sm">
            <div className="flex-1 min-w-0">
              <div className="text-slate-300">{name}</div>
              <div className="text-xs text-slate-500">{spec}</div>
            </div>
            <div className="flex items-center gap-4 text-xs flex-shrink-0">
              <span className="text-slate-500">{src}</span>
              <span className="font-mono text-slate-300">{cost}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-600 space-y-1">
        <div>SLM (Tier 3) is the most expensive single component. Watch eBay for decommissioned Holoeye or Meadowlark units from university labs — they appear in the $600–900 range and are functionally identical to new units.</div>
        <div>Budget 25–30% contingency for first builds. First prototypes always require component swaps and iteration.</div>
      </div>
    </div>
  );
}

// ── Protocol Adoption Panel ────────────────────────────────────────────────
interface AdoptionRepo {
  repo: string;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  clones_14d: number | null;
  unique_cloners_14d: number | null;
  views_14d: number | null;
  unique_visitors_14d: number | null;
  updated_at: string | null;
}

interface AdoptionResponse {
  repos: AdoptionRepo[];
  fetched_at: string;
}

const REPO_COLORS: Record<string, string> = {
  NexusOS: "#7c3aed",
  SpectrumEncoder: "#16a34a",
  "NexusOS-Blockchain-Hub": "#2563eb",
  "WNSP-P2P-Hub": "#ca8a04",
};

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string | number | null; icon: React.ElementType; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-800 bg-slate-900/40 min-w-[90px]">
      <Icon className="w-4 h-4" style={{ color }} />
      <div className="text-lg font-mono font-bold text-white">{value ?? "—"}</div>
      <div className="text-xs text-slate-500 text-center leading-tight">{label}</div>
    </div>
  );
}

function AdoptionPanel() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<AdoptionResponse>({
    queryKey: ["/api/github/adoption"],
    staleTime: 1000 * 60 * 5, // 5-minute cache
  });

  const total = data?.repos.reduce(
    (acc, r) => ({
      stars: acc.stars + r.stars,
      forks: acc.forks + r.forks,
      clones: acc.clones + (r.clones_14d ?? 0),
      cloners: acc.cloners + (r.unique_cloners_14d ?? 0),
    }),
    { stars: 0, forks: 0, clones: 0, cloners: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            Live protocol adoption across all NexusOS repositories. Data pulled directly from GitHub — no caching layer.
          </p>
          {data?.fetched_at && (
            <p className="text-xs text-slate-600 mt-1">
              Last fetched: {new Date(data.fetched_at).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button
          onClick={() => refetch()}
          disabled={isFetching}
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-400 hover:bg-slate-800 flex-shrink-0"
          data-testid="btn-refresh-adoption"
        >
          <RefreshCw className={`w-3 h-3 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
          <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          Fetching GitHub data…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 p-4 bg-red-950/20 rounded-xl border border-red-800/40">
          <AlertCircle className="w-4 h-4" /> Failed to fetch GitHub stats — check GitHub integration
        </div>
      )}

      {data && total && (
        <>
          {/* Totals banner */}
          <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-violet-300">Protocol Totals — All Repos</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatBox label="Stars" value={total.stars} icon={Star} color="#f59e0b" />
              <StatBox label="Forks" value={total.forks} icon={GitFork} color="#7c3aed" />
              <StatBox label="Clones (14d)" value={total.clones || "—"} icon={GitBranch} color="#16a34a" />
              <StatBox label="Unique cloners" value={total.cloners || "—"} icon={Eye} color="#2563eb" />
            </div>
          </div>

          {/* Per-repo cards */}
          <div className="space-y-3">
            {data.repos.map((r) => {
              const color = REPO_COLORS[r.repo] ?? "#64748b";
              const ghUrl = `https://github.com/nexusosdaily-code/${r.repo}`;
              return (
                <div key={r.repo} className="rounded-xl border overflow-hidden" style={{ borderColor: color + "44" }}>
                  <div className="px-5 py-3 flex items-center justify-between gap-3" style={{ background: color + "11" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <a
                        href={ghUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm font-medium hover:underline truncate"
                        style={{ color }}
                        data-testid={`link-repo-${r.repo}`}
                      >
                        nexusosdaily-code/{r.repo}
                      </a>
                    </div>
                    {r.updated_at && (
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        updated {new Date(r.updated_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="px-5 py-4 flex flex-wrap gap-3">
                    <StatBox label="Stars" value={r.stars} icon={Star} color="#f59e0b" />
                    <StatBox label="Forks" value={r.forks} icon={GitFork} color="#7c3aed" />
                    <StatBox label="Watchers" value={r.watchers} icon={Eye} color="#64748b" />
                    <StatBox label="Clones (14d)" value={r.clones_14d ?? "—"} icon={GitBranch} color="#16a34a" />
                    <StatBox label="Unique cloners" value={r.unique_cloners_14d ?? "—"} icon={Eye} color="#2563eb" />
                    <StatBox label="Views (14d)" value={r.views_14d ?? "—"} icon={Eye} color="#ca8a04" />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-600">
            Traffic data (clones, views) requires push-level access. Stars and forks are always public.
            Clone data reflects the last 14 days as reported by the GitHub API.
          </p>
        </>
      )}
    </div>
  );
}

// ── Page root ──────────────────────────────────────────────────────────────
export default function HardwareLabPage() {
  usePageMeta({
    title: "NexusOS Hardware Lab — Physics Calibration & Live Spectrometer",
    description: "Interactive physics calibration verifier and live spectrometer for NexusOS hardware. Test CE encoding, verify wavelength calculations, and calibrate SNIC channel mappings.",
    canonical: "https://wnsp.io/hardware-lab",
    ogTitle: "NexusOS Hardware Lab — Live Spectrometer",
    ogDescription: "Physics calibration verifier and live spectrometer. Test CE encoding accuracy, verify wavelength→Ψ channel mappings, and validate SNIC hardware integration.",
    twitterTitle: "NexusOS Hardware Lab",
    twitterDescription: "Live physics calibration. CE encoding verifier. SNIC channel mapping tester. Spectrometer interface.",
  });
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Hub
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Hardware Lab</h1>
              <p className="text-slate-400 text-sm mt-1">
                Pi Bridge &amp; Photonic Proof-of-Concept — software side ready before hardware arrives.
                CE→SE encoding proven in software. Connect hardware and the physics runs in light.
              </p>
            </div>
          </div>

          {/* Status banner */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: "CE Encoder", status: "Live", color: "#16a34a" },
              { label: "WASCII Table", status: "25,600 channels", color: "#2563eb" },
              { label: "Pi Script", status: "Ready to download", color: "#ca8a04" },
              { label: "Hardware", status: "Tier 1 in 3–4 months", color: "#7c3aed" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border" style={{ borderColor: s.color + "44", background: s.color + "11" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-slate-400">{s.label}</span>
                <span style={{ color: s.color }}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="table">
          <TabsList className="bg-slate-900 border border-slate-800 w-full overflow-x-auto flex-nowrap justify-start h-auto">
            <TabsTrigger value="table" className="data-[state=active]:bg-slate-800" data-testid="tab-wascii-table">
              <Microscope className="w-3 h-3 mr-1.5" /> WASCII Table
            </TabsTrigger>
            <TabsTrigger value="trace" className="data-[state=active]:bg-slate-800" data-testid="tab-char-trace">
              <Zap className="w-3 h-3 mr-1.5" /> Character Trace
            </TabsTrigger>
            <TabsTrigger value="script" className="data-[state=active]:bg-slate-800" data-testid="tab-pi-script">
              <Cpu className="w-3 h-3 mr-1.5" /> Pi Script
            </TabsTrigger>
            <TabsTrigger value="calib" className="data-[state=active]:bg-slate-800" data-testid="tab-calibration">
              <Radio className="w-3 h-3 mr-1.5" /> Calibration
            </TabsTrigger>
            <TabsTrigger value="build" className="data-[state=active]:bg-slate-800" data-testid="tab-build-guide">
              <Package className="w-3 h-3 mr-1.5" /> Build Guide
            </TabsTrigger>
            <TabsTrigger value="adoption" className="data-[state=active]:bg-slate-800" data-testid="tab-adoption">
              <TrendingUp className="w-3 h-3 mr-1.5" /> Adoption
            </TabsTrigger>
          </TabsList>

          <TabsContent value="table" className="mt-6"><WasciiTable /></TabsContent>
          <TabsContent value="trace" className="mt-6"><CharTrace /></TabsContent>
          <TabsContent value="script" className="mt-6"><PiScript /></TabsContent>
          <TabsContent value="calib" className="mt-6"><Calibration /></TabsContent>
          <TabsContent value="build" className="mt-6"><BuildGuide /></TabsContent>
          <TabsContent value="adoption" className="mt-6"><AdoptionPanel /></TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-slate-900/60">
          <p className="text-xs text-slate-600 mb-3 font-semibold uppercase tracking-wider">Related resources</p>
          <div className="flex flex-wrap gap-3 mb-4">
            <Link href="/labs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/5 text-cyan-600 text-xs hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer">
                <Microscope className="w-3 h-3" /> NexusOS Labs
              </span>
            </Link>
            <Link href="/hardware-spec">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 text-violet-600 text-xs hover:bg-violet-500/10 hover:border-violet-500/30 transition-all cursor-pointer">
                <Server className="w-3 h-3" /> Hardware Spec (AGPL-3.0)
              </span>
            </Link>
          </div>
        </div>

        <div className="text-xs text-slate-700 border-t border-slate-900 pt-4 flex flex-wrap gap-4">
          <span>NexusOS Hardware Lab v1.0</span>
          <span>WNSP-CE v1.0 / WASCII v7</span>
          <span>AGPL-3.0</span>
          <span>Genesis Ψ(228,45,H) · λ≈737.6nm</span>
        </div>
      </div>
    </div>
  );
}
