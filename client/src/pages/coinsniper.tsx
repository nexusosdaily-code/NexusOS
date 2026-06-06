import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Copy, ExternalLink, CheckCircle2, Rocket, Users,
  TrendingUp, Share2, Twitter, Send, Globe, Zap, Bitcoin
} from "lucide-react";

const RUNE_ID        = "840000:8472";
const RUNE_NAME      = "NEXUS•WAVELENGTH";
const TICKER         = "NXWV";
const TOTAL_SUPPLY   = "21,000,000";
const PER_MINT       = "1,000";
const MAX_MINTS      = "21,000";
const ETCH_BLOCK     = "840,000";
const WEBSITE        = "https://wnsp.tech";
const TELEGRAM       = "https://t.me/NexusOSWNSP";
const NOSTR_NPUB     = "npub1pmwaavd9qvyjzgvetm3uy48clhyf6x76jqvu4gzd6pzu8gv9gmyq96gg9u";
const SERVICE_WALLET = "bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m";

const DESCRIPTION = `NEXUS•WAVELENGTH is a Bitcoin Rune etched at block 840,000 — the Bitcoin halving block — representing the WNSP (Wavelength Network Spectral Protocol) physics engine.\n\nSupply: 21,000,000 (21M total · 21,000 max mints · 1,000 per mint). Built on the Theory of Compression States — every transaction is a photon, every address is a spectral channel (Ψ). NexusOS is the physics-native operating system for a Kardashev Type I civilization. This is NOT an EVM token — it is a native Bitcoin Rune on the UTXO chain. Rune ID: 840000:8472.`;

const FIELDS = [
  { label: "Token Name",      value: RUNE_NAME,      tip: "Full Rune name with bullet separator" },
  { label: "Ticker / Symbol", value: TICKER,         tip: "Short symbol for the listing" },
  { label: "Chain",           value: "Bitcoin",      tip: "Select Bitcoin or Other — clarify it's a Rune in description" },
  { label: "Contract / ID",   value: RUNE_ID,        tip: "Use the Rune ID as the 'contract address' field" },
  { label: "Total Supply",    value: TOTAL_SUPPLY,   tip: "21 million — 21,000 mints × 1,000 per mint" },
  { label: "Per Mint",        value: PER_MINT,       tip: "1,000 NEXUS•WAVELENGTH per mint" },
  { label: "Max Mints",       value: MAX_MINTS,      tip: "21,000 total mint transactions possible" },
  { label: "Etch Block",      value: ETCH_BLOCK,     tip: "Bitcoin block where the Rune was etched" },
  { label: "Website",         value: WEBSITE,        tip: "Official NexusOS / WNSP website" },
  { label: "Telegram",        value: TELEGRAM,       tip: "Community Telegram channel" },
  { label: "Nostr (npub)",    value: NOSTR_NPUB,     tip: "Official Nostr profile" },
  { label: "Wallet (verify)", value: SERVICE_WALLET, tip: "Service wallet holding Rune supply" },
];

function CopyField({ label, value, tip }: { label: string; value: string; tip: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast({ title: `${label} copied` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/8 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm text-white font-mono break-all leading-relaxed">{value}</p>
          <p className="text-xs text-white/40 mt-1">{tip}</p>
        </div>
        <button
          onClick={copy}
          data-testid={`copy-${label.toLowerCase().replace(/\s/g, "-")}`}
          className="shrink-0 p-2 rounded-lg hover:bg-purple-500/20 transition-colors"
        >
          {copied
            ? <CheckCircle2 className="w-4 h-4 text-green-400" />
            : <Copy className="w-4 h-4 text-white/50" />
          }
        </button>
      </div>
    </div>
  );
}

export default function CoinsnierPage() {
  const [descCopied, setDescCopied] = useState(false);
  const { toast } = useToast();

  const copyDesc = () => {
    navigator.clipboard.writeText(DESCRIPTION);
    setDescCopied(true);
    toast({ title: "Description copied" });
    setTimeout(() => setDescCopied(false), 2000);
  };

  const shareText = encodeURIComponent(
    `💜 NEXUS•WAVELENGTH — Bitcoin Rune etched at block 840,000\n\n` +
    `Supply: 21M · 21,000 mints · 1,000 per mint · Rune ID: 840000:8472\n\n` +
    `The physics-native OS for a Kardashev Type I civilization.\n\n` +
    `Vote on Coinsniper → https://coinsniper.net/submit\n${WEBSITE}`
  );

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight">Coinsniper Listing</h1>
              <p className="text-white/50 text-sm">NEXUS•WAVELENGTH · Bitcoin Rune</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-xl mx-auto">
            Free listing on <span className="text-purple-300 font-semibold">coinsniper.net</span> — instant visibility, ranked by community votes.
            Fill the form at the link below using the pre-built dossier.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-orange-900/20 p-6 text-center space-y-4">
          <div className="flex justify-center gap-3 flex-wrap">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40">Bitcoin Rune</Badge>
            <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/40">Block 840,000</Badge>
            <Badge className="bg-green-500/20 text-green-300 border-green-500/40">Free Listing</Badge>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40">500 votes to go live</Badge>
          </div>
          <p className="text-white/70 text-sm">
            Copy all fields below → paste into the Coinsniper submit form → share the vote link with the community.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a
              href="https://coinsniper.net/submit"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-coinsniper-submit"
            >
              <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
                <Rocket className="w-4 h-4" />
                Open Submit Form
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
            <a
              href="https://coinsniper.net/new"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-coinsniper-new"
            >
              <Button variant="outline" className="border-white/20 text-white/70 hover:bg-white/10 gap-2">
                <TrendingUp className="w-4 h-4" />
                New Listings
              </Button>
            </a>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Supply",  value: "21M",          color: "text-purple-300" },
            { label: "Per Mint",      value: "1,000",        color: "text-orange-300" },
            { label: "Votes Needed",  value: "500",          color: "text-green-300"  },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Submission dossier */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Submission Dossier — copy each field into the form
          </h2>
          <div className="grid gap-3">
            {FIELDS.map(f => (
              <CopyField key={f.label} label={f.label} value={f.value} tip={f.tip} />
            ))}
          </div>
        </div>

        {/* Description block */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Project Description (paste as-is)
            </h2>
            <button
              onClick={copyDesc}
              data-testid="copy-description"
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 transition-colors"
            >
              {descCopied
                ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied!</>
                : <><Copy className="w-3.5 h-3.5" /> Copy all</>
              }
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-mono">{DESCRIPTION}</p>
          </div>
        </div>

        {/* Vote sharing */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share to Drive Votes — need 500 to go live
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-twitter"
            >
              <Button variant="outline" className="w-full border-sky-500/30 text-sky-300 hover:bg-sky-500/10 gap-2">
                <Twitter className="w-4 h-4" />
                Post on X / Twitter
              </Button>
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent("https://coinsniper.net")}&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-telegram"
            >
              <Button variant="outline" className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 gap-2">
                <Send className="w-4 h-4" />
                Share on Telegram
              </Button>
            </a>
            <a
              href={`https://nostr.com/?intent=post&text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="share-nostr"
            >
              <Button variant="outline" className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10 gap-2">
                <Zap className="w-4 h-4" />
                Post on Nostr
              </Button>
            </a>
          </div>
        </div>

        {/* After listing — live vote widget placeholder */}
        <div className="rounded-2xl border border-dashed border-white/20 p-6 text-center space-y-3">
          <Users className="w-8 h-8 text-white/30 mx-auto" />
          <p className="text-white/50 text-sm font-medium">Live Vote Counter</p>
          <p className="text-white/30 text-xs max-w-sm mx-auto">
            Once your Coinsniper listing is approved and you have the coin ID (e.g.{" "}
            <code className="text-purple-300">coinsniper.net/coin/XXXXX</code>), paste it below
            to enable the live vote counter.
          </p>
          <CoinsnierVoteWidget />
        </div>

        {/* Useful links */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Useful Links</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Submit Form",     href: "https://coinsniper.net/submit" },
              { label: "New Listings",    href: "https://coinsniper.net/new" },
              { label: "Rune on Unisat",  href: `https://unisat.io/runes/detail/${encodeURIComponent(RUNE_NAME)}` },
              { label: "Rune on ME",      href: `https://magiceden.io/runes/${RUNE_NAME}` },
              { label: "Rune Explorer",   href: `https://ordinals.com/rune/${RUNE_NAME}` },
              { label: "Service Wallet",  href: `https://mempool.space/address/${SERVICE_WALLET}` },
            ].map(l => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {l.label}
                <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
              </a>
            ))}
          </div>
        </div>

        {/* Boost tips */}
        <div className="rounded-2xl border border-orange-500/20 bg-orange-950/20 p-5 space-y-3">
          <h3 className="font-semibold text-orange-300 flex items-center gap-2">
            <Rocket className="w-4 h-4" />
            After Submission — How to Rank Higher
          </h3>
          <ul className="text-sm text-white/60 space-y-2">
            <li>• <span className="text-white/80">500 votes</span> required to officially appear on All Time rankings</li>
            <li>• Votes reset every 24h for the "Today" page — share the link daily</li>
            <li>• Paid <span className="text-orange-300">Boosts</span> push to the promoted section instantly</li>
            <li>• <span className="text-white/80">Quests</span> grow your community by rewarding task completions</li>
            <li>• Optional <span className="text-white/80">KYC</span> badge increases buyer trust significantly</li>
            <li>• Post to Telegram + Nostr + X every day until 500 votes hit</li>
          </ul>
        </div>

      </div>
    </div>
  );
}

function CoinsnierVoteWidget() {
  const [coinId, setCoinId] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <div className="flex gap-2 justify-center mt-2">
      <input
        type="text"
        placeholder="Coinsniper coin ID (e.g. 12345)"
        value={coinId}
        onChange={e => setCoinId(e.target.value)}
        data-testid="input-coinsniper-id"
        className="w-56 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500"
      />
      <Button
        size="sm"
        onClick={() => { setSaved(coinId); }}
        disabled={!coinId}
        data-testid="button-save-coin-id"
        className="bg-purple-600 hover:bg-purple-700"
      >
        Set
      </Button>
      {saved && (
        <a
          href={`https://coinsniper.net/coin/${saved}`}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-coinsniper-listing"
        >
          <Button size="sm" variant="outline" className="border-purple-500/40 text-purple-300 gap-1">
            <ExternalLink className="w-3 h-3" />
            View Listing
          </Button>
        </a>
      )}
    </div>
  );
}
