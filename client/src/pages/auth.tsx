import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Sparkles, Lock, User, Mail, Phone, Wallet, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const inFlight = useRef(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryData, setRecoveryData] = useState({ username: "Nexus", newPassword: "", confirmPassword: "", recoveryKey: "" });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      let data: any;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server is starting up — please wait a moment and try again.");
      }

      if (!response.ok) {
        throw new Error(data.error || data.details?.[0]?.message || "Invalid credentials");
      }

      localStorage.setItem("auth_token", data.token);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.username}!`,
      });

      // Full reload so the auth context re-initialises with the new token.
      window.location.replace("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      inFlight.current = false;
      setIsLoading(false);
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
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: recoveryData.username, newPassword: recoveryData.newPassword, recoveryKey: recoveryData.recoveryKey }),
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email || undefined,
          phoneNumber: registerData.phoneNumber || undefined,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("auth_token", data.token);
      toast({
        title: "Registration successful",
        description: `Welcome to NexusOS! You've received ${Number(data.wallet?.balance || 0) / 100000000} NXT.`,
      });

      window.location.replace("/");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      inFlight.current = false;
      setIsLoading(false);
    }
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
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter username"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      required
                      data-testid="input-login-username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter password"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      autoComplete="current-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-testid="input-login-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowRecovery(v => !v)}
                  className="w-full text-xs text-gray-500 hover:text-amber-400 transition-colors pt-1"
                >
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
                    <Input
                      value={recoveryData.username}
                      onChange={e => setRecoveryData(d => ({ ...d, username: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm"
                      placeholder="Nexus"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">New Password</Label>
                    <Input
                      type="password"
                      value={recoveryData.newPassword}
                      onChange={e => setRecoveryData(d => ({ ...d, newPassword: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm"
                      placeholder="8+ characters"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Confirm Password</Label>
                    <Input
                      type="password"
                      value={recoveryData.confirmPassword}
                      onChange={e => setRecoveryData(d => ({ ...d, confirmPassword: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-sm"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-gray-400 text-xs">Wallet Recovery Key (WIF)</Label>
                    <Input
                      type="password"
                      value={recoveryData.recoveryKey}
                      onChange={e => setRecoveryData(d => ({ ...d, recoveryKey: e.target.value }))}
                      className="bg-slate-800/50 border-amber-500/30 text-sm font-mono"
                      placeholder="Your Bitcoin wallet WIF key"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-[10px] text-gray-600">Your BTC_INSCRIPTION_WALLET_WIF from Replit Secrets — only the wallet owner can reset the password.</p>
                  </div>

                  <Button
                    type="submit"
                    disabled={recoveryLoading || !recoveryData.recoveryKey || !recoveryData.newPassword}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {recoveryLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <div className="space-y-4 py-2">
                <div className="bg-amber-900/20 border border-amber-500/40 rounded-lg p-5 text-center space-y-3">
                  <div className="text-3xl">🔒</div>
                  <div className="text-amber-300 font-semibold text-sm">Genesis Phase — Closed Network</div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    NexusOS is currently in closed genesis phase. Only members who have already received
                    their <span className="text-yellow-400 font-mono">500M NXT</span> allocation may access the network.
                  </p>
                  <p className="text-gray-500 text-xs">
                    If you are an existing member, use the <span className="text-white">Login</span> tab.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 text-center text-gray-500 text-sm" data-testid="text-security-info">
          <Lock className="w-4 h-4 inline mr-1" />
          Passwords are securely hashed with bcrypt
        </div>
      </div>
    </div>
  );
}
