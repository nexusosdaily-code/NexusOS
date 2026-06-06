import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Sparkles, Lock, User, ArrowLeft, Zap, RefreshCw } from "lucide-react";

async function nostrSignIn(): Promise<{ signedEvent: any } | null> {
  const w = window as any;
  if (!w.nostr) return null;
  const pubkey = await w.nostr.getPublicKey();
  const event = {
    kind:       27235,
    created_at: Math.floor(Date.now() / 1000),
    tags:       [["u", "https://wnsp.tech"], ["method", "POST"]],
    content:    "NexusOS Login",
    pubkey,
  };
  const signedEvent = await w.nostr.signEvent(event);
  return { signedEvent };
}

export default function AuthPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading]       = useState(false);
  const [nostrLoading, setNostrLoading] = useState(false);
  const inFlight = useRef(false);
  const [loginData, setLoginData]         = useState({ username: "", password: "" });
  const [registerData, setRegisterData]   = useState({ username: "", password: "", email: "" });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRecovery, setShowRecovery]   = useState(false);
  const [recoveryData, setRecoveryData] = useState({ username: "Nexus", newPassword: "", confirmPassword: "", recoveryKey: "" });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
      window.location.replace("/");
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
      window.location.replace("/");
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details?.[0]?.message || "Registration failed");
      localStorage.setItem("auth_token", data.token);
      toast({ title: "Welcome to NexusOS!", description: `Account created for ${data.user.username}. Your spectral wallet is ready.` });
      window.location.replace("/");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryData.newPassword !== recoveryData.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
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
      setRecoveryData({ username: "Nexus", newPassword: "", confirmPassword: "", recoveryKey: "" });
    } catch (err: any) {
      toast({ title: "Recovery failed", description: err.message, variant: "destructive" });
    } finally { setRecoveryLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4 md:p-8 flex items-center justify-center" data-testid="page-auth">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6" data-testid="link-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to NexusOS</span>
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-amber-400" />
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
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
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
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input id="login-password" type="password" placeholder="Enter password"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required autoComplete="current-password" autoCorrect="off"
                      autoCapitalize="none" spellCheck={false}
                      data-testid="input-login-password" />
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
                    <Label className="text-gray-400 text-xs">Username</Label>
                    <Input value={recoveryData.username}
                      onChange={e => setRecoveryData(d => ({ ...d, username: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm" placeholder="Nexus" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">New Password</Label>
                    <Input type="password" value={recoveryData.newPassword}
                      onChange={e => setRecoveryData(d => ({ ...d, newPassword: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm" placeholder="8+ characters"
                      autoComplete="new-password" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Confirm Password</Label>
                    <Input type="password" value={recoveryData.confirmPassword}
                      onChange={e => setRecoveryData(d => ({ ...d, confirmPassword: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm" placeholder="Repeat password"
                      autoComplete="new-password" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Wallet Recovery Key (WIF)</Label>
                    <Input type="password" value={recoveryData.recoveryKey}
                      onChange={e => setRecoveryData(d => ({ ...d, recoveryKey: e.target.value }))}
                      className="bg-slate-800/50 border-amber-500/30 text-sm font-mono"
                      placeholder="Your Bitcoin wallet WIF key"
                      autoComplete="off" autoCorrect="off" spellCheck={false} />
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
                  <Label className="text-gray-400 text-xs">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
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
                  <Label className="text-gray-400 text-xs">Email <span className="text-slate-600">(optional)</span></Label>
                  <Input
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
                  <Label className="text-gray-400 text-xs">Password</Label>
                  <Input
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
          <Lock className="w-4 h-4 inline mr-1" />
          Nostr signatures verified server-side · passwords hashed with bcrypt
        </div>
      </div>
    </div>
  );
}
