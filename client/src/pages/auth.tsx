import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { Sparkles, Lock, User, Mail, Phone, Wallet, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("auth_token", data.token);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.username}!`,
      });

      // Replace the /auth history entry so back-button doesn't loop back to login.
      setLocation("/", { replace: true });
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

      setLocation("/", { replace: true });
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
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-gray-300">Username *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="reg-username"
                      type="text"
                      placeholder="Choose username"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      required
                      minLength={3}
                      data-testid="input-register-username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-gray-300">Email (optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="Enter email"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      data-testid="input-register-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="text-gray-300">Phone (optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="reg-phone"
                      type="tel"
                      placeholder="Enter phone number"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={registerData.phoneNumber}
                      onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                      data-testid="input-register-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-gray-300">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Create password (8+ chars)"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      minLength={8}
                      data-testid="input-register-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm" className="text-gray-300">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="Confirm password"
                      className="pl-10 bg-slate-800/50 border-slate-700"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                      data-testid="input-register-confirm"
                    />
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 text-sm font-semibold">Welcome Bonus</p>
                    <p className="text-green-300 text-xs">New accounts receive 5 NXT tokens</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
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
