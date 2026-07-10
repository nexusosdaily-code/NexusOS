import { Link } from "wouter";
import { Home, Hammer } from "lucide-react";

export function EcosystemNav() {
  return (
    <div className="grid grid-cols-2 gap-3 text-xs">
      <Link
        href="/hub"
        data-testid="link-back-to-hub"
        className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 font-medium text-slate-300 transition-all hover:border-slate-500 hover:text-white"
      >
        <Home className="w-3.5 h-3.5" /> Back to Hub
      </Link>
      <Link
        href="/joint-venture"
        data-testid="link-build-with-us"
        className="flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 font-medium text-cyan-300 transition-all hover:border-cyan-400 hover:text-cyan-200"
      >
        <Hammer className="w-3.5 h-3.5" /> Build This With Us
      </Link>
    </div>
  );
}
