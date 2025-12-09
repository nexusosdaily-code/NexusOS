import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, Shield, Wallet, Radio, Zap, 
  Users, FlaskConical, Activity, Waves, Rocket, LogOut, Presentation, Atom, Mail 
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const features = [
  {
    title: "Secure Documents",
    description: "Lambda-signed DOCX vault",
    href: "/secure-docs",
    icon: Shield,
    color: "text-purple-400",
    bgColor: "bg-purple-600/20",
  },
  {
    title: "Wallet",
    description: "NXT token management",
    href: "/wallet",
    icon: Wallet,
    color: "text-green-400",
    bgColor: "bg-green-600/20",
  },
  {
    title: "Nexus v10",
    description: "Latest protocol interface",
    href: "/v10",
    icon: Zap,
    color: "text-yellow-400",
    bgColor: "bg-yellow-600/20",
  },
  {
    title: "Transmission",
    description: "P2P media sharing",
    href: "/workspace/transmission",
    icon: Radio,
    color: "text-blue-400",
    bgColor: "bg-blue-600/20",
  },
  {
    title: "Research",
    description: "Lambda Boson theory",
    href: "/workspace/research",
    icon: FlaskConical,
    color: "text-pink-400",
    bgColor: "bg-pink-600/20",
  },
  {
    title: "Wavefield",
    description: "Quantum simulation",
    href: "/workspace/wavefield",
    icon: Waves,
    color: "text-cyan-400",
    bgColor: "bg-cyan-600/20",
  },
  {
    title: "K1 Infrastructure",
    description: "Civilization energy roadmap",
    href: "/k1",
    icon: Rocket,
    color: "text-orange-400",
    bgColor: "bg-orange-600/20",
  },
  {
    title: "Inbox",
    description: "Lambda-encoded messages",
    href: "/inbox",
    icon: Mail,
    color: "text-rose-400",
    bgColor: "bg-rose-600/20",
  },
  {
    title: "Friends",
    description: "Community & connections",
    href: "/friends",
    icon: Users,
    color: "text-indigo-400",
    bgColor: "bg-indigo-600/20",
  },
  {
    title: "Research Presentation",
    description: "Physics bridges & tooltips",
    href: "/research-presentation",
    icon: Presentation,
    color: "text-amber-400",
    bgColor: "bg-amber-600/20",
  },
  {
    title: "Encoding Lab",
    description: "Lambda Boson encoder",
    href: "/encoding-lab",
    icon: Atom,
    color: "text-teal-400",
    bgColor: "bg-teal-600/20",
  },
];

export default function LambdaPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-gray-400 text-sm" data-testid="text-user-phone">
                {user.phone}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-red-500/30 text-red-300 hover:bg-red-600/20"
              data-testid="btn-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="text-6xl md:text-8xl font-light text-white tracking-widest mb-4" data-testid="text-lambda">
            Λ
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2" data-testid="text-title">
            WNSP P2P Hub
          </h1>
          <p className="text-gray-400 text-lg" data-testid="text-subtitle">
            Wavelength Network Signaling Protocol
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card 
                className="bg-slate-800/50 border-slate-700 hover:border-slate-500 transition-all cursor-pointer hover:scale-105"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center mb-2`}>
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-white text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Physics-based blockchain • Lambda Boson cryptography • E=hf economics</p>
        </div>
      </div>
    </div>
  );
}
