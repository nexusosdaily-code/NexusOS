import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Megaphone, RotateCcw, MessageCircle, Palette, CheckCircle2, ExternalLink, Coins } from "lucide-react";

const ROLES = [
  { id: "moderator", label: "Moderator", icon: Shield,        color: "text-blue-400",   bg: "border-blue-500/30 bg-blue-950/20",     desc: "Keep channels clean, welcoming, and on-topic",          pay: "500 NXT / month",    payNote: "Fixed monthly" },
  { id: "hype_crew", label: "Hype Crew", icon: Megaphone,     color: "text-yellow-400", bg: "border-yellow-500/30 bg-yellow-950/20", desc: "Spread NexusOS on X, Telegram, Discord, Reddit",        pay: "50 NXT / post",      payNote: "Per verified campaign" },
  { id: "raider",    label: "Raider",    icon: RotateCcw,     color: "text-orange-400", bg: "border-orange-500/30 bg-orange-950/20", desc: "Coordinate community raids and Twitter spaces",          pay: "100 NXT / raid",     payNote: "Per organised raid" },
  { id: "engager",   label: "Engager",   icon: MessageCircle, color: "text-green-400",  bg: "border-green-500/30 bg-green-950/20",   desc: "Answer questions, onboard new members, run AMAs",       pay: "200 NXT / week",     payNote: "Active presence" },
  { id: "creator",   label: "Creator",   icon: Palette,       color: "text-violet-400", bg: "border-violet-500/30 bg-violet-950/20", desc: "Memes, threads, explainer content, short videos",       pay: "500 NXT / piece",    payNote: "Content bounty" },
];

interface FormData {
  name: string;
  telegram: string;
  twitter: string;
  role: string;
  why: string;
  experience: string;
}

export default function JoinCommunityPage() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "", telegram: "", twitter: "", role: "", why: "", experience: "",
  });

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const selectRole = (id: string) => setForm(f => ({ ...f, role: id }));

  const isValid = form.name.trim() && form.role && form.why.trim().length >= 20 &&
    (form.telegram.trim() || form.twitter.trim());

  const submitMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/community/apply", form),
    onSuccess: async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setSubmitted(true);
    },
    onError: (e: any) => {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-violet-900/40 border border-violet-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Application received</h1>
          <p className="text-zinc-400">We'll reach out via Telegram or X to confirm your role and NXT wallet details for payment.</p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="https://t.me/NexusOSWNSP" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Telegram community
            </a>
            <a href="https://coinsniper.net/coin/91963" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> Vote on Coinsniper
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-xl bg-violet-900/40 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-violet-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Work with NexusOS</h1>
          <p className="text-zinc-400 max-w-sm mx-auto">Paid community roles — earn NXT for every contribution. No volunteers, everyone gets compensated.</p>
          <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
            <Coins className="w-3.5 h-3.5" /> Paid in NXT · sent to your wnsp.io wallet
          </div>
        </div>

        {/* Role selector */}
        <div className="space-y-3">
          <Label className="text-sm text-zinc-300">Pick your role *</Label>
          <div className="space-y-2">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                data-testid={`button-role-${r.id}`}
                className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-center gap-3 ${
                  form.role === r.id ? r.bg + " ring-1 ring-inset ring-white/10" : "border-zinc-700/50 bg-zinc-900/30 hover:bg-zinc-800/40"
                }`}
              >
                <r.icon className={`w-5 h-5 flex-shrink-0 ${form.role === r.id ? r.color : "text-zinc-500"}`} />
                <div className="min-w-0">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm ${form.role === r.id ? "text-white" : "text-zinc-300"}`}>{r.label}</span>
                      {form.role === r.id && <Badge className="bg-violet-700 text-white text-xs py-0">Selected</Badge>}
                    </div>
                    <span className={`text-xs font-mono font-semibold ${form.role === r.id ? "text-yellow-300" : "text-zinc-500"}`}>{r.pay}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
                    <p className="text-xs text-zinc-600 mt-0.5 flex-shrink-0">{r.payNote}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="bg-zinc-900 border-zinc-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-zinc-100">Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Name or handle *</Label>
              <Input
                placeholder="Jon / @jon_crypto"
                value={form.name} onChange={set("name")}
                className="bg-zinc-800 border-zinc-600 text-white"
                data-testid="input-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Telegram username</Label>
                <Input
                  placeholder="@yourhandle"
                  value={form.telegram} onChange={set("telegram")}
                  className="bg-zinc-800 border-zinc-600 text-white"
                  data-testid="input-telegram"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">X / Twitter</Label>
                <Input
                  placeholder="@yourhandle"
                  value={form.twitter} onChange={set("twitter")}
                  className="bg-zinc-800 border-zinc-600 text-white"
                  data-testid="input-twitter"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-600">At least one contact method required</p>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Why do you want to join? *</Label>
              <Textarea
                placeholder="Tell us why you're interested in NexusOS and what you'd bring to the team..."
                value={form.why} onChange={set("why")}
                rows={4}
                className="bg-zinc-800 border-zinc-600 text-white resize-none"
                data-testid="input-why"
              />
              <p className="text-xs text-zinc-600">{form.why.length} chars (min 20)</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Relevant experience (optional)</Label>
              <Textarea
                placeholder="Previous community roles, projects you've supported, social reach, content you've created..."
                value={form.experience} onChange={set("experience")}
                rows={3}
                className="bg-zinc-800 border-zinc-600 text-white resize-none"
                data-testid="input-experience"
              />
            </div>

            <Button
              className="w-full bg-violet-700 hover:bg-violet-600 text-white"
              onClick={() => submitMut.mutate()}
              disabled={!isValid || submitMut.isPending}
              data-testid="button-submit-application"
            >
              <Users className="w-4 h-4 mr-2" />
              {submitMut.isPending ? "Submitting…" : "Submit Application"}
            </Button>
          </CardContent>
        </Card>

        {/* Socials */}
        <div className="text-center text-xs text-zinc-600 space-y-1">
          <p>Already part of the community?</p>
          <div className="flex justify-center gap-4">
            <a href="https://t.me/NexusOSWNSP" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">Telegram</a>
            <a href="https://coinsniper.net/coin/91963" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">Coinsniper</a>
            <a href="https://wnsp.io" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Platform</a>
          </div>
        </div>

      </div>
    </div>
  );
}
