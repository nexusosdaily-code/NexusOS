import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Sparkles, Lock, User, ArrowLeft, Zap, RefreshCw, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

async function nostrSignIn(): Promise<{ signedEvent: any } | null> {
  const w = window as any;
  if (!w.nostr) return null;
  const pubkey = await w.nostr.getPublicKey();
  const event = {
    kind:       27235,
    created_at: Math.floor(Date.now() / 1000),
    tags:       [["u", "https://wnsp.io"], ["method", "POST"]],
    content:    "NexusOS Login",
    pubkey,
  };
  const signedEvent = await w.nostr.signEvent(event);
  return { signedEvent };
}

export default function AuthPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const redirectTo = sessionStorage.getItem("auth_redirect") || "/hub";
  const { toast } = useToast();
  const [isLoading, setIsLoading]       = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      sessionStorage.removeItem("auth_redirect");
      setLocation(redirectTo, { replace: true });
    }
  }, [authLoading, isAuthenticated, setLocation, redirectTo]);
  const [nostrLoading, setNostrLoading] = useState(false);
  const inFlight = useRef(false);
  const [loginData, setLoginData]         = useState({ username: "", password: "" });
  const [registerData, setRegisterData]   = useState({ username: "", password: "", email: "", btcAddress: "" });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRecovery, setShowRecovery]   = useState(false);
  const [recoveryData, setRecoveryData] = useState({ username: "Nexus", newPassword: "", recoveryKey: "" });
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showLoginPwd, setShowLoginPwd]     = useState(false);
  const [showNewPwd, setShowNewPwd]         = useState(false);
  const [showWif, setShowWif]               = useState(false);
  const [wifKey, setWifKey]                 = useState("");
  const [showWifLogin, setShowWifLogin]     = useState(false);
  const [wifLoginLoading, setWifLoginLoading] = useState(false);
  const [showWifInput, setShowWifInput]     = useState(false);
  const [nsecKey, setNsecKey]               = useState("");
  const [showNsecLogin, setShowNsecLogin]   = useState(false);
  const [nsecLoginLoading, setNsecLoginLoading] = useState(false);
  const [showNsecInput, setShowNsecInput]   = useState(false);

  const handleWifLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifKey.trim()) return;
    setWifLoginLoading(true);
    try {
      const res = await fetch("/api/auth/wif-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wifKey: wifKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // Cookie is set server-side (httpOnly) — no localStorage needed
      toast({ title: "Signed in as Nexus", description: "Welcome back." });
      sessionStorage.removeItem("auth_redirect");
      window.location.href = redirectTo;
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally { setWifLoginLoading(false); }
  };

  const handleNsecLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nsecKey.trim()) return;
    setNsecLoginLoading(true);
    try {
      const res = await fetch("/api/auth/nsec-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nsecKey: nsecKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      // Cookie is set server-side (httpOnly) — no localStorage needed
      toast({ title: "Signed in as Nexus", description: "Welcome back." });
      sessionStorage.removeItem("auth_redirect");
      window.location.href = redirectTo;
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally { setNsecLoginLoading(false); }
  };

  const handleNostrLogin = async () => {
    if (nostrLoading) return;
    const w = window as any;
    if (!w.nostr) {
      toast({
        title: "No Nostr extension found",
        description: "Install Alby (getalby.com) or nos2x to sign in with Nostr.",
        variant: "destructive",
      });
      return;
    }
    setNostrLoading(true);
    try {
      const payload = await nostrSignIn();
      if (!payload) throw new Error("Signing cancelled");

      const res  = await fetch("/api/auth/nostr", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nostr login failed");

      localStorage.setItem("auth_token", data.token);
      toast({ title: "⚡ Nostr login successful", description: data.message });
      sessionStorage.removeItem("auth_redirect");
      window.location.replace(redirectTo);
    } catch (e: any) {
      toast({ title: "Nostr login failed", description: e.message, variant: "destructive" });
    } finally {
      setNostrLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(loginData),
      });
      let data: any;
      try { data = await response.json(); }
      catch { throw new Error("Server is starting up — please wait a moment and try again."); }
      if (!response.ok) throw new Error(data.error || data.details?.[0]?.message || "Invalid credentials");
      localStorage.setItem("auth_token", data.token);
      toast({ title: "Login successful", description: `Welcome back, ${data.user.username}!` });
      sessionStorage.removeItem("auth_redirect");
      window.location.replace(redirectTo);
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerLoading) return;
    if (registerData.password.length < 8) {
      toast({ title: "Password too short", description: "Must be at least 8 characters.", variant: "destructive" }); return;
    }
    setRegisterLoading(true);
    try {
      const res  = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          username: registerData.username,
          password: registerData.password,
          ...(registerData.email ? { email: registerData.email } : {}),
          ...(registerData.btcAddress ? { btcAddress: registerData.btcAddress } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.[0]?.message || "Registration failed");
      localStorage.setItem("auth_token", data.token);
      toast({ title: "Welcome to NexusOS!", description: `Account created for ${data.user.username}. Your spectral wallet is ready.` });
      sessionStorage.removeItem("auth_redirect");
      window.location.replace(redirectTo);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryData.newPassword.length < 8) {
      toast({ title: "Password must be 8+ characters", variant: "destructive" }); return;
    }
    setRecoveryLoading(true);
    try {
      const res  = await fetch("/api/auth/recover", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: recoveryData.username, newPassword: recoveryData.newPassword, recoveryKey: recoveryData.recoveryKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recovery failed");
      toast({ title: "Password updated", description: "You can now log in with your new password." });
      setShowRecovery(false);
      setLoginData({ username: recoveryData.username, password: "" });
      setRecoveryData({ username: "Nexus", newPassword: "", recoveryKey: "" });
    } catch (err: any) {
      toast({ title: "Recovery failed", description: err.message, variant: "destructive" });
    } finally { setRecoveryLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" data-testid="page-auth">
      <main id="main-content" className="min-h-screen p-4 md:p-8 flex items-center justify-center" aria-label="NexusOS authentication">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to NexusOS</span>
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-white" data-testid="text-title">NexusOS</h1>
          </div>
          <p className="text-gray-400" data-testid="text-subtitle">Secure Authentication</p>
        </div>

        {/* Nostr sign-in — primary path */}
        <Card className="bg-purple-950/40 border-purple-500/30 p-5 mb-4">
          <div className="text-center mb-3">
            <div className="text-[11px] text-purple-300 uppercase tracking-widest font-semibold mb-1">Nostr Users</div>
            <div className="text-xs text-slate-400">Sign in instantly with your Nostr key — no password needed. New to NexusOS? Your wallet is created automatically.</div>
          </div>
          <Button
            onClick={handleNostrLogin}
            disabled={nostrLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm py-5"
            data-testid="button-nostr-login"
          >
            {nostrLoading
              ? <><RefreshCw className="w-4 h-4 animate-spin mr-2" /> Waiting for signature…</>
              : <><Zap className="w-4 h-4 mr-2" /> Sign in with Nostr (NIP-07)</>
            }
          </Button>
          <p className="text-center text-[10px] text-slate-600 mt-2">
            Requires <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Alby</a> or{" "}
            <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">nos2x</a> browser extension
          </p>
        </Card>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-slate-700" />
          <span className="text-slate-600 text-xs">or sign in with password</span>
          <div className="flex-1 h-px bg-slate-700" />
        </div>

        <Card className="bg-slate-900/80 border-indigo-500/30 p-6" data-testid="card-auth">
          <Tabs defaultValue="login" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-gray-300">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" aria-hidden="true" />
                    <Input id="login-username" type="text" placeholder="Enter username"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required data-testid="input-login-username" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" aria-hidden="true" />
                    <Input id="login-password" type={showLoginPwd ? "text" : "password"} placeholder="Enter password"
                      className="pl-10 pr-10 bg-slate-800/50 border-slate-700"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required autoComplete="current-password" autoCorrect="off"
                      autoCapitalize="none" spellCheck={false}
                      data-testid="input-login-password" />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowLoginPwd(v => !v)}
                      aria-label={showLoginPwd ? "Hide password" : "Show password"}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300">
                      {showLoginPwd ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading} data-testid="button-login">
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <button type="button" onClick={() => setShowRecovery(v => !v)}
                  className="w-full text-xs text-gray-500 hover:text-amber-400 transition-colors pt-1">
                  {showRecovery ? "▲ Hide recovery" : "Forgot password? Recover with wallet key"}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-orange-500/20 space-y-3">
                {/* WIF key login */}
                <button type="button" onClick={() => setShowWifLogin(v => !v)}
                  className="w-full text-xs text-orange-500/70 hover:text-orange-400 transition-colors flex items-center justify-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  {showWifLogin ? "▲ Hide wallet login" : "Sign in with Wallet Key (BTC WIF)"}
                </button>
                {showWifLogin && (
                  <form onSubmit={handleWifLogin} className="space-y-2">
                    <div className="relative">
                      <textarea
                        id="wif-key-textarea"
                        aria-label="Bitcoin WIF wallet key"
                        value={wifKey}
                        onChange={e => setWifKey(e.target.value)}
                        placeholder="Paste your BTC WIF key"
                        rows={2}
                        className={`w-full rounded-md bg-slate-800/50 border border-orange-500/30 text-sm font-mono p-2 pr-10 resize-none text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 ${showWifInput ? "blur-sm select-none" : ""}`}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        inputMode="url"
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowWifInput(v => !v)}
                        aria-label={showWifInput ? "Show key" : "Hide key"}
                        className="absolute right-2 top-2 text-gray-500 hover:text-gray-300">
                        {showWifInput ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                    <Button type="submit" disabled={wifLoginLoading || !wifKey.trim()}
                      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold">
                      {wifLoginLoading ? "Signing in…" : "Sign in as Nexus (BTC)"}
                    </Button>
                  </form>
                )}

                {/* Nostr nsec login */}
                <button type="button" onClick={() => setShowNsecLogin(v => !v)}
                  className="w-full text-xs text-purple-500/70 hover:text-purple-400 transition-colors flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {showNsecLogin ? "▲ Hide Nostr login" : "Sign in with Nostr Key (nsec)"}
                </button>
                {showNsecLogin && (
                  <form onSubmit={handleNsecLogin} className="space-y-2">
                    <div className="relative">
                      <textarea
                        id="nsec-key-textarea"
                        aria-label="Nostr nsec private key"
                        value={nsecKey}
                        onChange={e => setNsecKey(e.target.value)}
                        placeholder="Paste your nsec key"
                        rows={2}
                        className={`w-full rounded-md bg-slate-800/50 border border-purple-500/30 text-sm font-mono p-2 pr-10 resize-none text-white placeholder-gray-600 focus:outline-none focus:border-purple-400 ${showNsecInput ? "blur-sm select-none" : ""}`}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        inputMode="url"
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowNsecInput(v => !v)}
                        aria-label={showNsecInput ? "Show key" : "Hide key"}
                        className="absolute right-2 top-2 text-gray-500 hover:text-gray-300">
                        {showNsecInput ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                    <Button type="submit" disabled={nsecLoginLoading || !nsecKey.trim()}
                      className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold">
                      {nsecLoginLoading ? "Signing in…" : "Sign in as Nexus (Nostr)"}
                    </Button>
                  </form>
                )}
              </div>

              {showRecovery && (
                <form onSubmit={handleRecover} className="mt-4 pt-4 border-t border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="text-amber-400 text-xs">🔑</div>
                    <div>
                      <div className="text-xs font-semibold text-amber-400">Account Recovery</div>
                      <div className="text-[10px] text-gray-500">Prove wallet ownership to reset your password</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recovery-username" className="text-gray-400 text-xs">Username</Label>
                    <Input id="recovery-username" value={recoveryData.username}
                      onChange={e => setRecoveryData(d => ({ ...d, username: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm" placeholder="Nexus" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recovery-new-password" className="text-gray-400 text-xs">New Password</Label>
                    <div className="relative">
                      <Input id="recovery-new-password" type={showNewPwd ? "text" : "password"} value={recoveryData.newPassword}
                        onChange={e => setRecoveryData(d => ({ ...d, newPassword: e.target.value }))}
                        className="bg-slate-800/50 border-slate-700 text-sm pr-10" placeholder="8+ characters"
                        autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false} />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowNewPwd(v => !v)}
                        aria-label={showNewPwd ? "Hide new password" : "Show new password"}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                        {showNewPwd ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="recovery-wif-key" className="text-gray-400 text-xs">Wallet Recovery Key (WIF)</Label>
                    <div className="relative">
                      <Input id="recovery-wif-key" type={showWif ? "text" : "password"} value={recoveryData.recoveryKey}
                        onChange={e => setRecoveryData(d => ({ ...d, recoveryKey: e.target.value }))}
                        className="bg-slate-800/50 border-amber-500/30 text-sm font-mono pr-10"
                        placeholder="Your Bitcoin wallet WIF key"
                        autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowWif(v => !v)}
                        aria-label={showWif ? "Hide wallet key" : "Show wallet key"}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-300">
                        {showWif ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-600">Your BTC_INSCRIPTION_WALLET_WIF from Replit Secrets — only the wallet owner can reset the password.</p>
                  </div>
                  <Button type="submit"
                    disabled={recoveryLoading || !recoveryData.recoveryKey || !recoveryData.newPassword}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                    {recoveryLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 py-2">
                <div className="space-y-1">
                  <Label htmlFor="register-username" className="text-gray-400 text-xs">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                    <Input
                      id="register-username"
                      required minLength={3} maxLength={50}
                      value={registerData.username}
                      onChange={e => setRegisterData(d => ({ ...d, username: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 pl-10 text-sm"
                      placeholder="Choose a username"
                      autoComplete="username"
                      data-testid="input-register-username"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-email" className="text-gray-400 text-xs">Email <span className="text-slate-600">(optional)</span></Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={e => setRegisterData(d => ({ ...d, email: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-sm"
                    placeholder="you@example.com"
                    autoComplete="email"
                    data-testid="input-register-email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-btc-address" className="text-gray-400 text-xs">Bitcoin receiving address <span className="text-slate-600">(optional)</span></Label>
                  <Input
                    id="register-btc-address"
                    value={registerData.btcAddress}
                    onChange={e => setRegisterData(d => ({ ...d, btcAddress: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-sm font-mono"
                    placeholder="bc1p… or bc1q…"
                    autoComplete="off"
                    data-testid="input-register-btc-address"
                  />
                  <p className="text-[10px] text-slate-600">Save it once here and it'll auto-fill on future Rune swaps.</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="register-password" className="text-gray-400 text-xs">Password</Label>
                  <Input
                    id="register-password"
                    type="password" required minLength={8}
                    value={registerData.password}
                    onChange={e => setRegisterData(d => ({ ...d, password: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-sm"
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                    data-testid="input-register-password"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={registerLoading || !registerData.username || !registerData.password}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                  data-testid="button-register-submit"
                >
                  {registerLoading ? "Creating account…" : "Create Account"}
                </Button>
                <p className="text-center text-[10px] text-slate-600 leading-relaxed">
                  A spectral wallet (NXT) is created automatically.
                  Nostr users can skip registration — sign in above.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center text-gray-500 text-sm" data-testid="text-security-info">
          <Lock className="w-4 h-4 inline mr-1" aria-hidden="true" />
          Nostr signatures verified server-side · passwords hashed with bcrypt
        </div>
      </div>
      </main>
    </div>
  );
}
