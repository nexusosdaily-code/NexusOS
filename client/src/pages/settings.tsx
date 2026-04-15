import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, Settings, User, Lock, Key, Shield, Atom,
  Eye, EyeOff, CheckCircle, XCircle, RefreshCw, ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── helpers ───────────────────────────────────────────────────────────────────
function nmToColor(nm: number): string {
  if (nm < 450) return "#6600cc";
  if (nm < 495) return "#0044ff";
  if (nm < 520) return "#00aaff";
  if (nm < 565) return "#00cc44";
  if (nm < 590) return "#ddcc00";
  if (nm < 625) return "#ffaa00";
  return "#ff3300";
}
const BAND_COLORS: Record<string, string> = {
  SYSTEM: "#ef4444", KERNEL: "#f97316", USER: "#22d3ee", GUEST: "#94a3b8",
};

function apiFetch(path: string, opts?: RequestInit) {
  return fetch(path, { credentials: "include", headers: getAuthHeaders(), ...opts }).then(async r => {
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Request failed");
    return j;
  });
}

// ── PIN numpad modal ──────────────────────────────────────────────────────────
function PinPad({
  title, subtitle, onSubmit, onCancel, loading, error,
}: {
  title: string; subtitle?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  loading?: boolean; error?: string;
}) {
  const [digits, setDigits] = useState("");
  const push = (d: string) => setDigits(p => p.length < 4 ? p + d : p);
  const pop  = ()           => setDigits(p => p.slice(0, -1));
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-80 p-6 shadow-2xl">
        <h3 className="text-white font-bold text-center mb-1">{title}</h3>
        {subtitle && <p className="text-slate-400 text-xs text-center mb-4">{subtitle}</p>}
        {/* dots */}
        <div className="flex justify-center gap-3 my-5">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < digits.length
                ? "bg-cyan-400 border-cyan-400"
                : "border-slate-600"
            }`} />
          ))}
        </div>
        {error && (
          <div className="text-red-400 text-xs text-center mb-3 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5" />{error}
          </div>
        )}
        {/* numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            k === "" ? <div key={i} /> :
            <button
              key={i}
              data-testid={k === "⌫" ? "pin-backspace" : `pin-key-${k}`}
              onClick={() => k === "⌫" ? pop() : push(String(k))}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xl font-medium transition-colors"
            >
              {k}
            </button>
          ))}
        </div>
        <Button
          data-testid="pin-submit"
          onClick={() => digits.length === 4 && onSubmit(digits)}
          disabled={digits.length < 4 || loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mb-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
          {loading ? "Checking…" : "Confirm"}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-slate-400 hover:text-white">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4 text-cyan-400" />
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Password field ────────────────────────────────────────────────────────────
function PwField({ label, value, onChange, testId }: { label: string; value: string; onChange: (v: string) => void; testId: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <input
          data-testid={testId}
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm pr-9 outline-none focus:border-slate-500 placeholder:text-slate-600"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, ok, onDone }: { msg: string; ok: boolean; onDone: () => void }) {
  setTimeout(onDone, 3500);
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium
      ${ok ? "bg-emerald-900/90 border border-emerald-600/50 text-emerald-300" : "bg-red-900/90 border border-red-600/50 text-red-300"}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type PinStep = "current" | "new" | "confirm" | null;

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // PIN flow
  const [pinStep, setPinStep] = useState<PinStep>(null);
  const [collectedCurrent, setCollectedCurrent] = useState("");
  const [collectedNew, setCollectedNew] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  // Password form
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew]         = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => setToast({ msg, ok });

  const { data: pinStatus, refetch: refetchPin } = useQuery<{ pinSet: boolean }>({
    queryKey: ["/api/wallet/pin/status"],
    queryFn: () => apiFetch("/api/wallet/pin/status"),
  });

  const { data: me } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: () => apiFetch("/api/auth/me"),
  });

  const u = me?.user ?? user;
  const wdm  = u?.spectralWdm  ?? 128;
  const oam  = u?.spectralOam  ?? 0;
  const pol  = u?.spectralPol  ?? "H";
  const nm   = u?.spectralNm   ?? 550;
  const band = u?.spectralBand ?? "USER";
  const color = nmToColor(nm);
  const bandColor = BAND_COLORS[band] ?? "#94a3b8";

  // ── PIN handlers ──
  function startPinChange() {
    setPinError("");
    setPinStep(pinStatus?.pinSet ? "current" : "new");
  }

  async function handlePinStep(pin: string) {
    setPinError("");
    if (pinStep === "current") {
      setPinLoading(true);
      try {
        const r = await apiFetch("/api/wallet/pin/verify", {
          method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (!r.valid) { setPinError("Incorrect PIN"); setPinLoading(false); return; }
        setCollectedCurrent(pin);
        setPinStep("new");
      } catch (e: any) { setPinError(e.message); }
      setPinLoading(false);
    } else if (pinStep === "new") {
      setCollectedNew(pin);
      setPinStep("confirm");
    } else if (pinStep === "confirm") {
      if (pin !== collectedNew) { setPinError("PINs don't match — try again"); return; }
      setPinLoading(true);
      try {
        await apiFetch("/api/wallet/pin/set", {
          method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ pin: collectedNew, currentPin: collectedCurrent || undefined }),
        });
        showToast(pinStatus?.pinSet ? "PIN changed successfully" : "PIN set successfully");
        refetchPin();
        setPinStep(null); setCollectedCurrent(""); setCollectedNew("");
      } catch (e: any) { setPinError(e.message); }
      setPinLoading(false);
    }
  }

  function cancelPin() {
    setPinStep(null); setCollectedCurrent(""); setCollectedNew(""); setPinError("");
  }

  // ── Password handler ──
  async function handlePasswordChange() {
    if (!pwCurrent || !pwNew || !pwConfirm) { showToast("All password fields required", false); return; }
    if (pwNew !== pwConfirm) { showToast("New passwords don't match", false); return; }
    if (pwNew.length < 8)    { showToast("Password must be ≥8 characters", false); return; }
    setPwLoading(true);
    try {
      const r = await apiFetch("/api/settings/password", {
        method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      showToast(r.message ?? "Password updated");
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (e: any) { showToast(e.message, false); }
    setPwLoading(false);
  }

  // ── PIN step labels ──
  const pinStepMeta: Record<NonNullable<PinStep>, { title: string; subtitle?: string }> = {
    current: { title: "Enter Current PIN",   subtitle: "Verify your existing 4-digit wallet PIN" },
    new:     { title: "Enter New PIN",        subtitle: "Choose a new 4-digit wallet PIN" },
    confirm: { title: "Confirm New PIN",      subtitle: "Re-enter your new PIN to confirm" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      {pinStep && (
        <PinPad
          {...pinStepMeta[pinStep]}
          onSubmit={handlePinStep}
          onCancel={cancelPin}
          loading={pinLoading}
          error={pinError}
        />
      )}
      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}

      <div className="max-w-xl mx-auto">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Account Settings</h1>
            <p className="text-slate-400 text-sm">Identity, security, and spectral channel</p>
          </div>
        </div>

        {/* ── Identity card ── */}
        <SectionCard title="Spectral Identity" icon={User}>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: `${color}18`, border: `2px solid ${color}50`, color }}
            >
              {u?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p data-testid="text-username" className="text-white font-bold text-lg">{u?.username ?? "—"}</p>
              <p data-testid="text-phone" className="text-slate-400 text-sm">{u?.phoneNumber ?? "No phone set"}</p>
            </div>
          </div>

          {/* Spectral channel */}
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Atom className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
              <span data-testid="text-psi" className="font-mono text-sm font-bold" style={{ color }}>
                Ψ({wdm},{oam},{pol}) · {nm.toFixed(2)} nm
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span
                data-testid="text-band"
                className="px-2 py-0.5 rounded font-bold"
                style={{ background: `${bandColor}20`, color: bandColor }}
              >
                {band}
              </span>
              <span>WDM channel {wdm}</span>
              <span>OAM mode {oam}</span>
              <span>Pol: {pol}</span>
            </div>
            <div className="mt-2 text-xs font-mono text-slate-500 truncate">
              wnsp://Ψ({wdm},{oam},{pol})/
            </div>
          </div>

          {/* WDM bar */}
          <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-600 via-blue-500 via-green-500 via-yellow-400 to-red-500 relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ left: `${(wdm / 255) * 100}%`, background: color, transform: "translate(-50%,-50%)" }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>SYSTEM · 380nm</span>
            <span>GUEST · 780nm</span>
          </div>
        </SectionCard>

        {/* ── Wallet PIN ── */}
        <SectionCard title="Wallet PIN" icon={Key}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white text-sm font-medium">4-Digit Wallet PIN</p>
              <p className="text-slate-400 text-xs mt-0.5">Required for every NXT transfer</p>
            </div>
            <span
              data-testid="badge-pin-status"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                pinStatus?.pinSet
                  ? "bg-emerald-900/50 border border-emerald-600/40 text-emerald-400"
                  : "bg-amber-900/50 border border-amber-600/40 text-amber-400"
              }`}
            >
              {pinStatus?.pinSet ? <><CheckCircle className="w-3 h-3" /> SET</> : <><AlertTriangle className="w-3 h-3" /> NOT SET</>}
            </span>
          </div>
          <Button
            data-testid="button-change-pin"
            onClick={startPinChange}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 justify-between"
          >
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              {pinStatus?.pinSet ? "Change PIN" : "Set PIN"}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </Button>
          {pinStatus?.pinSet && (
            <p className="text-slate-600 text-xs text-center mt-2">
              You will be asked for your current PIN before setting a new one.
            </p>
          )}
        </SectionCard>

        {/* ── Change password ── */}
        <SectionCard title="Change Password" icon={Shield}>
          <PwField label="Current Password" value={pwCurrent} onChange={setPwCurrent} testId="input-current-password" />
          <PwField label="New Password"     value={pwNew}     onChange={setPwNew}     testId="input-new-password" />
          <PwField label="Confirm New Password" value={pwConfirm} onChange={setPwConfirm} testId="input-confirm-password" />
          {pwNew && pwConfirm && pwNew !== pwConfirm && (
            <p className="text-red-400 text-xs flex items-center gap-1 mb-3">
              <XCircle className="w-3.5 h-3.5" /> Passwords don't match
            </p>
          )}
          {pwNew.length > 0 && pwNew.length < 8 && (
            <p className="text-amber-400 text-xs flex items-center gap-1 mb-3">
              <AlertTriangle className="w-3.5 h-3.5" /> Password must be at least 8 characters
            </p>
          )}
          <Button
            data-testid="button-change-password"
            onClick={handlePasswordChange}
            disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm || pwNew !== pwConfirm || pwNew.length < 8}
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white"
          >
            {pwLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            {pwLoading ? "Updating…" : "Update Password"}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
