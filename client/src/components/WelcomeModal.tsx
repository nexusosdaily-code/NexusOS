import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { X, Zap, Bitcoin, ArrowRight, Wallet, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "nexusos_welcome_seen_v1";

interface Props {
  username: string;
}

export default function WelcomeModal({ username }: Props) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  function finish() {
    dismiss();
    navigate("/rune-pipeline");
  }

  if (!open) return null;

  const steps = [
    {
      icon: <Wallet className="w-8 h-8 text-purple-400" />,
      title: "Your NXT wallet is live",
      body: "We created a WNSP-addressed wallet for you. It holds NXT tokens — the infrastructure crowdfund token that lets you access every NexusOS service.",
      action: "Next →",
      color: "purple",
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: "Fund it with sats via Lightning",
      body: "Go to your wallet and click Receive. Generate a Lightning invoice and pay from any Bitcoin wallet (Strike, Wallet of Satoshi, Muun, Phoenix…). Sats land in seconds.",
      action: "Next →",
      color: "yellow",
    },
    {
      icon: <Bitcoin className="w-8 h-8 text-orange-400" />,
      title: "Swap sats → NEXUS•WAVELENGTH",
      body: "Head to the Rune Pipeline. Enter your Bitcoin address and how many NXWV you want. Pay the sats invoice — Runes arrive on-chain within minutes. 21 trillion exist. Supply is permanently sealed.",
      action: "Open Rune Pipeline",
      color: "orange",
    },
  ];

  const current = steps[step];
  const colors: Record<string, string> = {
    purple: "border-purple-500/40 bg-purple-500/10",
    yellow: "border-yellow-500/40 bg-yellow-500/10",
    orange: "border-orange-500/40 bg-orange-500/10",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] shadow-2xl overflow-hidden">

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

        <button
          onClick={dismiss}
          data-testid="welcome-modal-close"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <p className="text-xs font-mono uppercase tracking-widest text-purple-400/70 mb-1">
              Welcome to NexusOS
            </p>
            <h2 className="text-xl font-bold text-white">
              Hey{username ? ` ${username}` : ""}! You're in. 🎉
            </h2>
            <p className="text-sm text-white/50 mt-1">Here's how to get started in 3 steps.</p>
          </div>

          <div className={`rounded-xl border p-5 mb-6 ${colors[current.color]}`}>
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-0.5">{current.icon}</div>
              <div>
                <h3 className="font-semibold text-white mb-1">{current.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{current.body}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i <= step ? "bg-purple-500" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              data-testid="welcome-modal-next"
              onClick={step < steps.length - 1 ? () => setStep(s => s + 1) : finish}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
            >
              {step < steps.length - 1 ? (
                <>{current.action}</>
              ) : (
                <><ArrowRight className="w-4 h-4" /> {current.action}</>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-white/30 mt-4">
            This appears once. You can always find help via Ask NexusOS.
          </p>
        </div>

        <div className="px-8 pb-5 border-t border-white/5 pt-4">
          <div className="flex items-center justify-center gap-6 text-xs text-white/30">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
              NXT Wallet Created
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
              WNSP Address Assigned
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
              Registration Open
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
