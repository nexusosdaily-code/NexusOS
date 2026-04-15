import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { getAuthHeaders } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft, Settings, User, Lock, Key, Shield, Atom,
  Eye, EyeOff, CheckCircle, XCircle, RefreshCw, ChevronRight,
  AlertTriangle, Camera, MapPin, Mail, FileText, Upload,
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

// ── Country list (abridged — top 80) ─────────────────────────────────────────
const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh",
  "Belgium","Bolivia","Brazil","Cambodia","Canada","Chile","China","Colombia",
  "Croatia","Cuba","Czech Republic","Denmark","Ecuador","Egypt","Ethiopia",
  "Finland","France","Germany","Ghana","Greece","Guatemala","Honduras","Hungary",
  "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan",
  "Jordan","Kenya","Malaysia","Mexico","Morocco","Mozambique","Myanmar","Nepal",
  "Netherlands","New Zealand","Nicaragua","Nigeria","Norway","Pakistan","Panama",
  "Paraguay","Peru","Philippines","Poland","Portugal","Romania","Russia","Rwanda",
  "Saudi Arabia","Senegal","Singapore","Somalia","South Africa","South Korea",
  "Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tanzania",
  "Thailand","Tunisia","Turkey","Uganda","Ukraine","United Kingdom","United States",
  "Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zimbabwe",
];

// US states (abbreviated)
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Washington D.C.",
];

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
        <div className="flex justify-center gap-3 my-5">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < digits.length ? "bg-cyan-400 border-cyan-400" : "border-slate-600"
            }`} />
          ))}
        </div>
        {error && (
          <div className="text-red-400 text-xs text-center mb-3 flex items-center justify-center gap-1">
            <XCircle className="w-3.5 h-3.5" />{error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k, i) => (
            k === "" ? <div key={i} /> :
            <button key={i} data-testid={k === "⌫" ? "pin-backspace" : `pin-key-${k}`}
              onClick={() => k === "⌫" ? pop() : push(String(k))}
              className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xl font-medium transition-colors"
            >{k}</button>
          ))}
        </div>
        <Button data-testid="pin-submit"
          onClick={() => digits.length === 4 && onSubmit(digits)}
          disabled={digits.length < 4 || loading}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white mb-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
          {loading ? "Checking…" : "Confirm"}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full text-slate-400 hover:text-white">Cancel</Button>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
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

// ── Text input field ──────────────────────────────────────────────────────────
function Field({ label, value, onChange, testId, type = "text", placeholder = "", textarea = false }: {
  label: string; value: string; onChange: (v: string) => void;
  testId: string; type?: string; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {textarea ? (
        <textarea
          data-testid={testId}
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
        />
      ) : (
        <input
          data-testid={testId}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-slate-500 placeholder:text-slate-600"
        />
      )}
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
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300">
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

// ── Avatar upload component ───────────────────────────────────────────────────
function AvatarUpload({ current, onChange }: { current: string; onChange: (b64: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(current);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) return; // 2MB max
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
      onChange(result);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  return (
    <div className="flex items-center gap-5 mb-5">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        <div
          className="w-20 h-20 rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center"
          style={{ background: preview ? "transparent" : "rgba(99,102,241,0.15)" }}
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" data-testid="img-avatar-preview" />
          ) : (
            <User className="w-8 h-8 text-slate-600" />
          )}
        </div>
        <button
          data-testid="button-avatar-upload-trigger"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-600 hover:bg-cyan-500 border-2 border-slate-900 flex items-center justify-center transition-colors"
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Drop zone */}
      <div
        data-testid="dropzone-avatar"
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`flex-1 rounded-xl border-2 border-dashed py-4 px-3 text-center cursor-pointer transition-all ${
          dragging ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
        }`}
      >
        <Upload className="w-4 h-4 mx-auto mb-1 text-slate-500" />
        <p className="text-xs text-slate-500">Drop image or <span className="text-cyan-400">browse</span></p>
        <p className="text-xs text-slate-700 mt-0.5">JPG, PNG, WebP · max 2 MB</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFileInput} className="hidden" data-testid="input-avatar-file" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type PinStep = "current" | "new" | "confirm" | null;

export default function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Profile form state
  const [email, setEmail]             = useState("");
  const [bio, setBio]                 = useState("");
  const [country, setCountry]         = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [avatarUrl, setAvatarUrl]     = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // PIN flow
  const [pinStep, setPinStep]             = useState<PinStep>(null);
  const [collectedCurrent, setCollectedCurrent] = useState("");
  const [collectedNew, setCollectedNew]   = useState("");
  const [pinLoading, setPinLoading]       = useState(false);
  const [pinError, setPinError]           = useState("");

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

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["/api/settings/profile"],
    queryFn: () => apiFetch("/api/settings/profile"),
    onSuccess: (d: any) => {
      if (!profileLoaded && d?.profile) {
        setEmail(d.profile.email ?? "");
        setBio(d.profile.bio ?? "");
        setCountry(d.profile.country ?? "");
        setStateRegion(d.profile.stateRegion ?? "");
        setAvatarUrl(d.profile.avatarUrl ?? "");
        setProfileLoaded(true);
      }
    },
  } as any);

  const profile = (profileData as any)?.profile;
  const wdm  = profile?.spectralWdm  ?? user?.spectralWdm  ?? 128;
  const oam  = profile?.spectralOam  ?? user?.spectralOam  ?? 0;
  const pol  = profile?.spectralPol  ?? user?.spectralPol  ?? "H";
  const nm   = profile?.spectralNm   ?? user?.spectralNm   ?? 550;
  const band = profile?.spectralBand ?? user?.spectralBand ?? "USER";
  const color = nmToColor(nm);
  const bandColor = BAND_COLORS[band] ?? "#94a3b8";
  const username = profile?.username ?? user?.username ?? "—";

  const isUS = country === "United States";

  // ── Save profile ──
  async function saveProfile() {
    setProfileSaving(true);
    try {
      await apiFetch("/api/settings/profile", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || null, bio: bio || null, country: country || null, stateRegion: stateRegion || null, avatarUrl: avatarUrl || null }),
      });
      showToast("Profile saved");
      refetchProfile();
    } catch (e: any) { showToast(e.message, false); }
    setProfileSaving(false);
  }

  // ── PIN handlers ──
  function startPinChange() {
    setPinError(""); setPinStep(pinStatus?.pinSet ? "current" : "new");
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
        setCollectedCurrent(pin); setPinStep("new");
      } catch (e: any) { setPinError(e.message); }
      setPinLoading(false);
    } else if (pinStep === "new") {
      setCollectedNew(pin); setPinStep("confirm");
    } else if (pinStep === "confirm") {
      if (pin !== collectedNew) { setPinError("PINs don't match — try again"); return; }
      setPinLoading(true);
      try {
        await apiFetch("/api/wallet/pin/set", {
          method: "POST", headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ pin: collectedNew, currentPin: collectedCurrent || undefined }),
        });
        showToast(pinStatus?.pinSet ? "PIN changed successfully" : "PIN set successfully");
        refetchPin(); setPinStep(null); setCollectedCurrent(""); setCollectedNew("");
      } catch (e: any) { setPinError(e.message); }
      setPinLoading(false);
    }
  }

  function cancelPin() { setPinStep(null); setCollectedCurrent(""); setCollectedNew(""); setPinError(""); }

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

  const pinStepMeta: Record<NonNullable<PinStep>, { title: string; subtitle?: string }> = {
    current: { title: "Enter Current PIN",  subtitle: "Verify your existing 4-digit wallet PIN" },
    new:     { title: "Enter New PIN",       subtitle: "Choose a new 4-digit wallet PIN" },
    confirm: { title: "Confirm New PIN",     subtitle: "Re-enter your new PIN to confirm" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-6">
      {pinStep && (
        <PinPad {...pinStepMeta[pinStep]} onSubmit={handlePinStep} onCancel={cancelPin}
          loading={pinLoading} error={pinError} />
      )}
      {toast && <Toast msg={toast.msg} ok={toast.ok} onDone={() => setToast(null)} />}

      <div className="max-w-xl mx-auto">
        {/* back */}
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
            <p className="text-slate-400 text-sm">Profile, identity, security and spectral channel</p>
          </div>
        </div>

        {/* ── Profile & Avatar ── */}
        <SectionCard title="Profile" icon={User}>
          <AvatarUpload current={avatarUrl} onChange={url => setAvatarUrl(url)} />

          <div className="mb-3">
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <div className="bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2 text-slate-500 text-sm" data-testid="text-username-display">
              {username}
            </div>
          </div>

          <Field label="Email Address" value={email} onChange={setEmail}
            testId="input-email" type="email" placeholder="nexusosdaily@gmail.com" />

          <Field label="Bio" value={bio} onChange={setBio}
            testId="input-bio" placeholder="Describe yourself…" textarea />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Country</label>
              <select
                data-testid="select-country"
                value={country}
                onChange={e => { setCountry(e.target.value); setStateRegion(""); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-slate-500"
              >
                <option value="">— Select country —</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {isUS ? "State" : "State / Region"}
              </label>
              {isUS ? (
                <select
                  data-testid="select-state"
                  value={stateRegion}
                  onChange={e => setStateRegion(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-slate-500"
                >
                  <option value="">— Select state —</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input
                  data-testid="input-state-region"
                  type="text"
                  value={stateRegion}
                  onChange={e => setStateRegion(e.target.value)}
                  placeholder="Province, region…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              )}
            </div>
          </div>

          <Button
            data-testid="button-save-profile"
            onClick={saveProfile}
            disabled={profileSaving}
            className="w-full bg-cyan-700 hover:bg-cyan-600 text-white"
          >
            {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {profileSaving ? "Saving…" : "Save Profile"}
          </Button>
        </SectionCard>

        {/* ── Spectral identity (read-only) ── */}
        <SectionCard title="Spectral Identity" icon={Atom}>
          <div className="rounded-xl p-3 mb-3" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
            <div className="flex items-center gap-2 mb-2">
              <Atom className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
              <span className="font-mono text-sm font-bold" style={{ color }}>Ψ({wdm},{oam},{pol}) · {nm.toFixed(2)} nm</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
              <span className="px-2 py-0.5 rounded font-bold" style={{ background: `${bandColor}20`, color: bandColor }}>{band}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{country && stateRegion ? `${stateRegion}, ${country}` : country || "No location set"}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email || "No email set"}</span>
            </div>
            <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-600 via-blue-500 via-green-500 via-yellow-400 to-red-500 relative mt-3">
              <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-lg"
                style={{ left: `${(wdm / 255) * 100}%`, background: color, transform: "translate(-50%,-50%)" }} />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>SYSTEM · 380nm</span><span>GUEST · 780nm</span>
            </div>
          </div>
          <p className="text-slate-600 text-xs text-center">
            Spectral channel is deterministic — derived from your username hash. Cannot be changed.
          </p>
        </SectionCard>

        {/* ── Wallet PIN ── */}
        <SectionCard title="Wallet PIN" icon={Key}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white text-sm font-medium">4-Digit Wallet PIN</p>
              <p className="text-slate-400 text-xs mt-0.5">Required for every NXT transfer</p>
            </div>
            <span data-testid="badge-pin-status"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                pinStatus?.pinSet
                  ? "bg-emerald-900/50 border border-emerald-600/40 text-emerald-400"
                  : "bg-amber-900/50 border border-amber-600/40 text-amber-400"
              }`}>
              {pinStatus?.pinSet ? <><CheckCircle className="w-3 h-3" /> SET</> : <><AlertTriangle className="w-3 h-3" /> NOT SET</>}
            </span>
          </div>
          <Button data-testid="button-change-pin" onClick={startPinChange}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 justify-between">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              {pinStatus?.pinSet ? "Change PIN" : "Set PIN"}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </Button>
          {pinStatus?.pinSet && (
            <p className="text-slate-600 text-xs text-center mt-2">You will be asked for your current PIN first.</p>
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
              <AlertTriangle className="w-3.5 h-3.5" /> Must be at least 8 characters
            </p>
          )}
          <Button data-testid="button-change-password" onClick={handlePasswordChange}
            disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm || pwNew !== pwConfirm || pwNew.length < 8}
            className="w-full bg-indigo-700 hover:bg-indigo-600 text-white">
            {pwLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            {pwLoading ? "Updating…" : "Update Password"}
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
