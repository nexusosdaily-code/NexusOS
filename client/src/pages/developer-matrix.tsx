import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  ArrowLeft,
  BookOpen,
  Award,
  Layers,
  CheckCircle,
  Circle,
  Lock,
  Zap,
  Globe,
  Building2,
  Users,
  User,
  Cpu,
  Radio,
  Scale,
  Sparkles,
  GraduationCap,
  Code,
  Shield,
  Network
} from "lucide-react";

const KNOWLEDGE_DOMAINS = [
  { id: "wave_physics", name: "Wave Physics", level: 1, description: "Wave equation c=fλ, electromagnetic spectrum, photon energy E=hf", icon: Radio, color: "from-violet-500 to-purple-600" },
  { id: "lambda_boson", name: "Lambda Boson", level: 1, description: "Lambda mass Λ=hf/c², mass-equivalent of oscillation", icon: Sparkles, color: "from-purple-500 to-pink-600" },
  { id: "wascii_encoding", name: "W-ASCII Encoding", level: 2, description: "170+ character wavelength mapping, spectral bands", icon: Code, color: "from-blue-500 to-cyan-600" },
  { id: "spectral_routing", name: "Spectral Routing", level: 2, description: "Wavelength-based message routing, band allocation", icon: Network, color: "from-cyan-500 to-teal-600" },
  { id: "lambda_gates", name: "Lambda Gates", level: 3, description: "8 photonic gates: Phase-Shift, Gain, Mode-Mixer, OAM-Rotor, etc.", icon: Cpu, color: "from-green-500 to-emerald-600" },
  { id: "ce1_protocol", name: "CE-1 Protocol", level: 3, description: "Coherence Engineering: energy pools, coherence margin, non-dominance", icon: Zap, color: "from-emerald-500 to-green-600" },
  { id: "constitutional", name: "Constitutional Law", level: 4, description: "C-0001 Non-Dominance, C-0002 Immutable Rights, C-0003 Energy-Backed", icon: Scale, color: "from-yellow-500 to-orange-600" },
  { id: "bhls_economics", name: "BHLS Economics", level: 4, description: "Basic Human Living Standards: 1,150 NXT floor, 7 categories", icon: Shield, color: "from-orange-500 to-red-600" },
  { id: "authority_bands", name: "Authority Bands", level: 5, description: "7-tier spectral hierarchy: Individual to Planetary", icon: Layers, color: "from-red-500 to-pink-600" },
  { id: "sigma_voting", name: "Sigma Voting", level: 5, description: "Coherence-weighted voting, interference tallying", icon: Users, color: "from-pink-500 to-rose-600" },
  { id: "photonic_computing", name: "Photonic Computing", level: 6, description: "Photonic logic gates, wavelength-division computing", icon: Cpu, color: "from-indigo-500 to-violet-600" },
  { id: "planetary_comms", name: "Planetary Communications", level: 6, description: "Spectral relay mesh, OAM channels, interplanetary links", icon: Globe, color: "from-violet-500 to-purple-600" },
  { id: "resource_orchestration", name: "Resource Orchestration", level: 6, description: "Wavelength ledger, lambda valuation, logistics", icon: Building2, color: "from-purple-500 to-indigo-600" },
  { id: "k1_energy", name: "K1 Energy", level: 6, description: "Resonance harvesting, orbital solar, fusion photonics", icon: Zap, color: "from-amber-500 to-yellow-600" }
];

const CERTIFICATION_TRACKS = [
  {
    id: "protocol_dev",
    name: "Protocol Developer",
    description: "Build messaging, encoding, and communication systems",
    domains: ["wave_physics", "lambda_boson", "wascii_encoding", "spectral_routing"],
    icon: Code,
    color: "from-blue-600 to-cyan-500"
  },
  {
    id: "substrate_eng",
    name: "Substrate Engineer",
    description: "Build core substrate operations and gate programs",
    domains: ["wave_physics", "lambda_boson", "lambda_gates", "ce1_protocol"],
    icon: Cpu,
    color: "from-green-600 to-emerald-500"
  },
  {
    id: "governance_arch",
    name: "Governance Architect",
    description: "Build governance, voting, and constitutional systems",
    domains: ["constitutional", "bhls_economics", "authority_bands", "sigma_voting"],
    icon: Scale,
    color: "from-orange-600 to-yellow-500"
  },
  {
    id: "infra_builder",
    name: "Infrastructure Builder",
    description: "Build K1 civilization infrastructure: energy, comms, computing",
    domains: ["lambda_gates", "photonic_computing", "planetary_comms", "resource_orchestration"],
    icon: Building2,
    color: "from-purple-600 to-pink-500"
  },
  {
    id: "full_stack",
    name: "Full Stack Architect",
    description: "Complete mastery of all domains",
    domains: KNOWLEDGE_DOMAINS.map(d => d.id),
    icon: Sparkles,
    color: "from-amber-500 to-red-500"
  }
];

const INFRASTRUCTURE_TIERS = [
  { id: "sandbox", level: 0, authority: "INDIVIDUAL", wavelength: 1000, icon: User, capabilities: ["Personal wallets", "Test message encoding", "Learning exercises", "Prototype apps"] },
  { id: "community", level: 1, authority: "LOCAL", wavelength: 900, icon: Users, capabilities: ["Community messaging apps", "Local mesh networks", "Neighborhood resource sharing", "Education platforms"] },
  { id: "municipal", level: 2, authority: "MUNICIPAL", wavelength: 800, icon: Building2, capabilities: ["City-scale mesh networks", "Municipal resource tracking", "Local governance tools", "Urban energy grids"] },
  { id: "regional", level: 3, authority: "REGIONAL", wavelength: 700, icon: Network, capabilities: ["Regional communication networks", "Multi-city resource orchestration", "Regional voting systems", "Interstate energy trading"] },
  { id: "national", level: 4, authority: "NATIONAL", wavelength: 600, icon: Shield, capabilities: ["National spectrum allocation", "Country-wide energy grids", "National governance platforms", "Large-scale manufacturing"] },
  { id: "continental", level: 5, authority: "CONTINENTAL", wavelength: 500, icon: Globe, capabilities: ["Continental relay networks", "Multi-nation resource coordination", "Continental governance", "Cross-border infrastructure"] },
  { id: "planetary", level: 6, authority: "PLANETARY", wavelength: 400, icon: Sparkles, capabilities: ["Global communication backbone", "Planetary energy harvesting", "World governance systems", "Interplanetary links"] }
];

function wavelengthToColor(wavelengthNm: number): string {
  let r = 0, g = 0, b = 0;
  if (wavelengthNm >= 380 && wavelengthNm < 440) {
    r = -(wavelengthNm - 440) / (440 - 380);
    b = 1;
  } else if (wavelengthNm >= 440 && wavelengthNm < 490) {
    g = (wavelengthNm - 440) / (490 - 440);
    b = 1;
  } else if (wavelengthNm >= 490 && wavelengthNm < 510) {
    g = 1;
    b = -(wavelengthNm - 510) / (510 - 490);
  } else if (wavelengthNm >= 510 && wavelengthNm < 580) {
    r = (wavelengthNm - 510) / (580 - 510);
    g = 1;
  } else if (wavelengthNm >= 580 && wavelengthNm < 645) {
    r = 1;
    g = -(wavelengthNm - 645) / (645 - 580);
  } else if (wavelengthNm >= 645 && wavelengthNm <= 780) {
    r = 1;
  } else if (wavelengthNm > 780) {
    r = 0.5;
  }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

export default function DeveloperMatrixPage() {
  const [completedDomains, setCompletedDomains] = useState<string[]>([]);
  const [earnedCertifications, setEarnedCertifications] = useState<string[]>([]);
  const [currentTier, setCurrentTier] = useState("sandbox");
  const [activeTab, setActiveTab] = useState("overview");

  const knowledgeLevel = completedDomains.length > 0 
    ? Math.max(...completedDomains.map(id => KNOWLEDGE_DOMAINS.find(d => d.id === id)?.level || 0))
    : 0;

  const credibilityScore = (
    (completedDomains.length / KNOWLEDGE_DOMAINS.length) * 0.4 +
    (earnedCertifications.length / CERTIFICATION_TRACKS.length) * 0.3 +
    0.3 * 0
  );

  const toggleDomain = (domainId: string) => {
    const domain = KNOWLEDGE_DOMAINS.find(d => d.id === domainId);
    if (!domain) return;

    const prerequisitesMet = KNOWLEDGE_DOMAINS
      .filter(d => d.level < domain.level)
      .every(d => completedDomains.includes(d.id));

    if (!completedDomains.includes(domainId)) {
      if (!prerequisitesMet) return;
      setCompletedDomains([...completedDomains, domainId]);
    } else {
      setCompletedDomains(completedDomains.filter(id => id !== domainId));
    }
  };

  const canEarnCertification = (track: typeof CERTIFICATION_TRACKS[0]) => {
    return track.domains.every(d => completedDomains.includes(d));
  };

  const earnCertification = (trackId: string) => {
    const track = CERTIFICATION_TRACKS.find(t => t.id === trackId);
    if (!track || !canEarnCertification(track)) return;
    if (!earnedCertifications.includes(trackId)) {
      setEarnedCertifications([...earnedCertifications, trackId]);
    }
  };

  const canAccessTier = (tier: typeof INFRASTRUCTURE_TIERS[0]) => {
    return knowledgeLevel >= tier.level && credibilityScore >= tier.level * 0.15;
  };

  return (
    <div className="min-h-screen bg-black text-white" data-testid="page-developer-matrix">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-title">Developer Matrix</h1>
            <p className="text-gray-400 text-sm">Learn. Certify. Build. Advance.</p>
          </div>
          <div className="ml-auto flex gap-4">
            <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-purple-300 px-3 py-1">
              <GraduationCap className="w-4 h-4 mr-2" />
              Level {knowledgeLevel}
            </Badge>
            <Badge variant="outline" className="bg-cyan-500/20 border-cyan-500/50 text-cyan-300 px-3 py-1">
              <Award className="w-4 h-4 mr-2" />
              {Math.round(credibilityScore * 100)}% Credibility
            </Badge>
          </div>
        </div>

        <Card className="bg-gray-900/50 border-gray-800 p-6 mb-6">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-4xl font-bold text-purple-400" data-testid="text-domains-completed">{completedDomains.length}</div>
              <div className="text-gray-400 text-sm">Domains Completed</div>
              <div className="text-gray-600 text-xs">of {KNOWLEDGE_DOMAINS.length}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400" data-testid="text-certifications">{earnedCertifications.length}</div>
              <div className="text-gray-400 text-sm">Certifications</div>
              <div className="text-gray-600 text-xs">of {CERTIFICATION_TRACKS.length}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400" data-testid="text-current-tier">{currentTier.toUpperCase()}</div>
              <div className="text-gray-400 text-sm">Current Tier</div>
              <div className="text-gray-600 text-xs">{INFRASTRUCTURE_TIERS.find(t => t.id === currentTier)?.authority}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-amber-400" data-testid="text-level">{knowledgeLevel}</div>
              <div className="text-gray-400 text-sm">Knowledge Level</div>
              <div className="text-gray-600 text-xs">of 6</div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border border-gray-800 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600" data-testid="tab-overview">
              <BookOpen className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-purple-600" data-testid="tab-domains">
              <Layers className="w-4 h-4 mr-2" />
              Knowledge Domains
            </TabsTrigger>
            <TabsTrigger value="certifications" className="data-[state=active]:bg-purple-600" data-testid="tab-certifications">
              <Award className="w-4 h-4 mr-2" />
              Certifications
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="data-[state=active]:bg-purple-600" data-testid="tab-infrastructure">
              <Building2 className="w-4 h-4 mr-2" />
              Infrastructure
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-800 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  The Developer Journey
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="font-bold">1</span>
                    </div>
                    <div>
                      <div className="font-medium">LEARN</div>
                      <div className="text-gray-400 text-sm">Complete knowledge domains</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-600 flex items-center justify-center">
                      <span className="font-bold">2</span>
                    </div>
                    <div>
                      <div className="font-medium">CERTIFY</div>
                      <div className="text-gray-400 text-sm">Earn certification tracks</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                      <span className="font-bold">3</span>
                    </div>
                    <div>
                      <div className="font-medium">BUILD</div>
                      <div className="text-gray-400 text-sm">Create infrastructure at your tier</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center">
                      <span className="font-bold">4</span>
                    </div>
                    <div>
                      <div className="font-medium">ADVANCE</div>
                      <div className="text-gray-400 text-sm">Unlock higher authority bands</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Why Physics-Based Credibility?
                </h3>
                <div className="space-y-3 text-gray-300 text-sm">
                  <p>Traditional credentials can be faked. Degrees can be bought. Certificates can be forged.</p>
                  <p className="text-amber-400 font-medium">WNSP credentials are anchored to physics.</p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span>Every attestation has a spectral signature</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span>Wavelength calculations must balance (E=hf)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span>Substrate validates all claims automatically</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                      <span>Fake credentials fail Maxwell validation</span>
                    </li>
                  </ul>
                  <p className="text-purple-400 font-medium pt-2">You can't fake resonance. You can't forge wavelengths.</p>
                </div>
              </Card>
            </div>

            <Card className="bg-gray-900/50 border-gray-800 p-6">
              <h3 className="text-lg font-semibold mb-4">Knowledge Level Progression</h3>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map(level => {
                  const domainsAtLevel = KNOWLEDGE_DOMAINS.filter(d => d.level === level);
                  const completedAtLevel = domainsAtLevel.filter(d => completedDomains.includes(d.id));
                  const progress = (completedAtLevel.length / domainsAtLevel.length) * 100;
                  
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Level {level}: {domainsAtLevel.map(d => d.name).join(", ")}</span>
                        <span className={progress === 100 ? "text-green-400" : "text-gray-500"}>{completedAtLevel.length}/{domainsAtLevel.length}</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-gray-800" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="domains" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4, 5, 6].map(level => (
                <div key={level} className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-400 border-b border-gray-800 pb-2">
                    Level {level}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {KNOWLEDGE_DOMAINS.filter(d => d.level === level).map(domain => {
                      const isCompleted = completedDomains.includes(domain.id);
                      const prerequisitesMet = KNOWLEDGE_DOMAINS
                        .filter(d => d.level < domain.level)
                        .every(d => completedDomains.includes(d.id));
                      const IconComponent = domain.icon;
                      
                      return (
                        <Card 
                          key={domain.id}
                          className={`p-4 cursor-pointer transition-all ${
                            isCompleted 
                              ? 'bg-green-900/30 border-green-500/50' 
                              : prerequisitesMet
                                ? 'bg-gray-900/50 border-gray-700 hover:border-purple-500/50'
                                : 'bg-gray-900/30 border-gray-800 opacity-50'
                          }`}
                          onClick={() => toggleDomain(domain.id)}
                          data-testid={`domain-${domain.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${domain.color} flex items-center justify-center shrink-0`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{domain.name}</span>
                                {isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                ) : !prerequisitesMet ? (
                                  <Lock className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-600" />
                                )}
                              </div>
                              <p className="text-gray-400 text-sm mt-1">{domain.description}</p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="certifications" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {CERTIFICATION_TRACKS.map(track => {
                const isEarned = earnedCertifications.includes(track.id);
                const canEarn = canEarnCertification(track);
                const completedCount = track.domains.filter(d => completedDomains.includes(d)).length;
                const IconComponent = track.icon;
                
                return (
                  <Card 
                    key={track.id}
                    className={`p-6 ${isEarned ? 'bg-amber-900/30 border-amber-500/50' : 'bg-gray-900/50 border-gray-800'}`}
                    data-testid={`certification-${track.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${track.color} flex items-center justify-center shrink-0`}>
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold">{track.name}</h3>
                          {isEarned && <Badge className="bg-amber-500 text-black">CERTIFIED</Badge>}
                        </div>
                        <p className="text-gray-400 mt-1">{track.description}</p>
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">Required Domains</span>
                            <span className={completedCount === track.domains.length ? 'text-green-400' : 'text-gray-400'}>
                              {completedCount}/{track.domains.length}
                            </span>
                          </div>
                          <Progress value={(completedCount / track.domains.length) * 100} className="h-2 bg-gray-800" />
                          <div className="flex flex-wrap gap-2 mt-3">
                            {track.domains.map(domainId => {
                              const domain = KNOWLEDGE_DOMAINS.find(d => d.id === domainId);
                              const isComplete = completedDomains.includes(domainId);
                              return (
                                <Badge 
                                  key={domainId} 
                                  variant="outline" 
                                  className={isComplete ? 'border-green-500/50 text-green-400' : 'border-gray-700 text-gray-500'}
                                >
                                  {isComplete && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {domain?.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button 
                          onClick={() => earnCertification(track.id)}
                          disabled={!canEarn || isEarned}
                          className={canEarn && !isEarned ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}
                          data-testid={`button-certify-${track.id}`}
                        >
                          {isEarned ? 'Earned' : canEarn ? 'Claim' : 'Locked'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-6">
            <div className="space-y-4">
              {INFRASTRUCTURE_TIERS.map(tier => {
                const canAccess = canAccessTier(tier);
                const isCurrent = currentTier === tier.id;
                const IconComponent = tier.icon;
                
                return (
                  <Card 
                    key={tier.id}
                    className={`p-6 ${isCurrent ? 'bg-green-900/30 border-green-500/50' : canAccess ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}
                    data-testid={`tier-${tier.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0"
                        style={{ 
                          backgroundColor: tier.wavelength <= 780 
                            ? wavelengthToColor(tier.wavelength) 
                            : 'rgb(100, 50, 50)',
                          opacity: canAccess ? 1 : 0.5
                        }}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold capitalize">{tier.id}</h3>
                          <Badge variant="outline" className="border-purple-500/50 text-purple-300">
                            {tier.authority}
                          </Badge>
                          <Badge variant="outline" className="border-cyan-500/50 text-cyan-300">
                            {tier.wavelength}nm
                          </Badge>
                          {isCurrent && <Badge className="bg-green-500 text-black">CURRENT</Badge>}
                          {!canAccess && <Lock className="w-4 h-4 text-gray-500" />}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">Level {tier.level} • Requires {Math.round(tier.level * 15)}% credibility</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {tier.capabilities.map((cap, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                              <CheckCircle className={`w-3 h-3 ${canAccess ? 'text-green-400' : 'text-gray-600'}`} />
                              {cap}
                            </div>
                          ))}
                        </div>
                      </div>
                      {canAccess && !isCurrent && (
                        <Button 
                          onClick={() => setCurrentTier(tier.id)}
                          className="bg-purple-600 hover:bg-purple-700"
                          data-testid={`button-select-tier-${tier.id}`}
                        >
                          Select Tier
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30 p-6 mt-8">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">All Credibility Anchored to Substrate</h3>
            <p className="text-gray-400">Physics validates knowledge. Attestations are permanent. Resonance cannot be faked.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
