import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense, Component, type ReactNode, type ErrorInfo, useEffect } from "react";
const GuideBot = lazy(() => import("@/components/GuideBot"));
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AuthLoading } from "@/hooks/use-auth";
import { UniSatProvider } from "@/hooks/use-unisat";
import { CUSTOM_DOMAIN_HOSTS } from "@/lib/domain-keys";
const DomainRouter = lazy(() => import("@/components/DomainRouter"));
import { useToast } from "@/hooks/use-toast";

const AuthPage = lazy(() => import("@/pages/auth"));

// All other pages lazy-loaded — browser only downloads the code when you visit that page
const HubPage = lazy(() => import("@/pages/hub"));
const LambdaPlaceholder = lazy(() => import("@/pages/lambda-placeholder"));
const WNSPv7Page = lazy(() => import("@/pages/wnsp-v7"));
const NexusV10Page = lazy(() => import("@/pages/nexus-v10"));
const NexusV6Page = lazy(() => import("@/pages/nexus-v6"));
const NexusV8Page = lazy(() => import("@/pages/nexus-v8"));
const NexusV9Page = lazy(() => import("@/pages/nexus-v9"));
const EncodingLab = lazy(() => import("@/pages/encoding-lab"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const TransmissionPage = lazy(() => import("@/pages/transmission"));
const ResearchPage = lazy(() => import("@/pages/research"));
const WavefieldPage = lazy(() => import("@/pages/wavefield"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const AnnouncementsPage = lazy(() => import("@/pages/announcements"));
const AnnouncementSubstrateV2Page = lazy(() => import("@/pages/announcement-substrate-v2"));
const ResonancePropulsionPage = lazy(() => import("@/pages/resonance-propulsion"));
const ResonanceCavityPage = lazy(() => import("@/pages/resonance-cavity"));
const FriendsPage = lazy(() => import("@/pages/friends"));
const InboxPage = lazy(() => import("@/pages/inbox"));
const K1InfrastructurePage = lazy(() => import("@/pages/k1-infrastructure"));
const K1OrchestrationPage = lazy(() => import("@/pages/k1-orchestration"));
const SecureDocxPage = lazy(() => import("@/pages/secure-docx"));
const ResearchPresentationPage = lazy(() => import("@/pages/research-presentation"));
const StreamingPage = lazy(() => import("@/pages/streaming"));
const DeveloperMatrixPage = lazy(() => import("@/pages/developer-matrix"));
const DeveloperKeysPage = lazy(() => import("@/pages/developer-keys"));
const DeveloperPage = lazy(() => import("@/pages/developer"));
const GovernancePage = lazy(() => import("@/pages/governance"));
const ConstitutionPage = lazy(() => import("@/pages/constitution"));
const DocsPage = lazy(() => import("@/pages/docs"));
const WNSPCoordinator = lazy(() => import("@/pages/wnsp-coordinator"));
const KernelPage = lazy(() => import("@/pages/kernel"));
const PhotonicDevPage = lazy(() => import("@/pages/photonic-dev"));
const QuantumThresholdPage = lazy(() => import("@/pages/quantum-threshold"));
const NexusHardwareOsPage = lazy(() => import("@/pages/nexus-hardware-os"));
const ComputingAlternativesPage = lazy(() => import("@/pages/computing-alternatives"));
const WavelengthOsManifestoPage = lazy(() => import("@/pages/wavelength-os-manifesto"));
const CeCodeWriterPage = lazy(() => import("@/pages/ce-code-writer"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const SpectralDbPage = lazy(() => import("@/pages/spectral-db"));
const BlockchainPage = lazy(() => import("@/pages/blockchain"));
const AgentBusPage = lazy(() => import("@/pages/agent-bus"));
const NexusCommandPage = lazy(() => import("@/pages/nexus-command"));
const NexusAnalyticsPage = lazy(() => import("@/pages/nexus-analytics"));
const KernelGenesisPage = lazy(() => import("@/pages/kernel-genesis"));
const SpectralWorkspacePage = lazy(() => import("@/pages/spectral-workspace"));
const ChroniclePage = lazy(() => import("@/pages/chronicle"));
const SpectralLibraryPage = lazy(() => import("@/pages/spectral-library"));
const SpectralAuditPage = lazy(() => import("@/pages/spectral-audit"));
const OrbitalTreasuryPage = lazy(() => import("@/pages/orbital-treasury"));
const FoundersCharityPage = lazy(() => import("@/pages/founders-charity"));
const HardwareTreasuryPage = lazy(() => import("@/pages/hardware-treasury"));
const EcosystemPage = lazy(() => import("@/pages/ecosystem"));
const OrdinalRegistryPage = lazy(() => import("@/pages/ordinal-registry"));
const CommunicationPage = lazy(() => import("@/pages/communication"));
const NetworkPage = lazy(() => import("@/pages/network"));
const WavelengthLangPage = lazy(() => import("@/pages/wavelength-lang"));
const EvidencePage = lazy(() => import("@/pages/evidence"));
const CrowdfundPage = lazy(() => import("@/pages/crowdfund"));
const SpectralVideoPage = lazy(() => import("@/pages/spectral-video"));
const VisualizerPage = lazy(() => import("@/pages/visualizer"));
const IndiegogoPage = lazy(() => import("@/pages/indiegogo"));
const SnicPage = lazy(() => import("@/pages/snic"));
const SpectralUriPage = lazy(() => import("@/pages/spectral-uri"));
const OpenPage = lazy(() => import("@/pages/open"));
const WnspBridgePage = lazy(() => import("@/pages/wnsp-bridge"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const DirectoryPage = lazy(() => import("@/pages/directory"));
const PhonebookPage = lazy(() => import("@/pages/phonebook"));
const LedgerPage = lazy(() => import("@/pages/ledger"));
const GitHubBridgePage = lazy(() => import("@/pages/github-bridge"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const MobileSDKPage = lazy(() => import("@/pages/mobile-sdk"));
const WnspVMPage = lazy(() => import("@/pages/wnsp-vm"));
const DivergenceTestPage = lazy(() => import("@/pages/divergence-test"));
const SpectralRouterPage = lazy(() => import("@/pages/spectral-router"));
const SpectralSearchPage = lazy(() => import("@/pages/spectral-search"));
const CompressionExplorerPage = lazy(() => import("@/pages/compression-explorer"));
const SpectralContractsPage = lazy(() => import("@/pages/spectral-contracts"));
const SOPPage = lazy(() => import("@/pages/sop"));
const HardwareLabPage = lazy(() => import("@/pages/hardware-lab"));
const OscillatingQuantaPage = lazy(() => import("@/pages/oscillating-quanta"));
const SiliconBridgePage     = lazy(() => import("@/pages/silicon-bridge"));
const LearnPage = lazy(() => import("@/pages/learn"));
const PipelinePage = lazy(() => import("@/pages/pipeline"));
const PlanckAlignmentPage = lazy(() => import("@/pages/planck-alignment"));
const SpectralMirrorPage = lazy(() => import("@/pages/spectral-mirror"));
const CommunityPage = lazy(() => import("@/pages/community"));
const MediaLibraryPage = lazy(() => import("@/pages/media-library"));
const QuoraPage = lazy(() => import("@/pages/quora"));
const RedditPage = lazy(() => import("@/pages/reddit"));
const TelegramHubPage = lazy(() => import("@/pages/telegram-hub"));
const WnspPaperPage = lazy(() => import("@/pages/wnsp-paper"));
const StartPage  = lazy(() => import("@/pages/start"));
const MarketPage = lazy(() => import("@/pages/market"));
const ReposedTheoryPage = lazy(() => import("@/pages/reposed-theory"));
const ProtocolPage = lazy(() => import("@/pages/protocol"));
const PhotonicLedgerPage = lazy(() => import("@/pages/photonic-ledger"));
const HardwareSpecPage = lazy(() => import("@/pages/hardware-spec"));
const P2PTerminalPage = lazy(() => import("@/pages/p2p-terminal"));
const CampaignPage = lazy(() => import("@/pages/campaign"));
const VideosPage = lazy(() => import("@/pages/videos"));
const SocialBroadcastPage = lazy(() => import("@/pages/social-broadcast"));
const NotFound = lazy(() => import("@/pages/not-found"));
const WnspLandingPage = lazy(() => import("@/pages/wnsp-landing"));
const WnspOrdinalsPage = lazy(() => import("@/pages/wnsp-ordinals"));
const NostrRelayPage = lazy(() => import("@/pages/nostr-relay"));
const NostrBridgePage = lazy(() => import("@/pages/nostr-bridge"));
const NxtCampaignPage = lazy(() => import("@/pages/nxt-campaign"));
const CommunityMintPage = lazy(() => import("@/pages/community-mint"));
const WnspStakingPage = lazy(() => import("@/pages/wnsp-staking"));
const MarketplacePage = lazy(() => import("@/pages/marketplace"));
const RuneEtchingPage = lazy(() => import("@/pages/rune-etching"));
const SpectralIDEPage = lazy(() => import("@/pages/spectral-ide"));
const NexusExplorerPage = lazy(() => import("@/pages/nexus-explorer"));
const ContractAppPage = lazy(() => import("@/pages/contract-app"));
const RuneMintPage = lazy(() => import("@/pages/rune-mint"));
const EtchRunePage = lazy(() => import("@/pages/etch-rune"));
const RuneStakingPage = lazy(() => import("@/pages/rune-staking"));
const StakeEarnPage   = lazy(() => import("@/pages/stake-earn"));
const FractalBtcBridgePage = lazy(() => import("@/pages/fractal-btc-bridge"));
const NxtFbSwapPage = lazy(() => import("@/pages/nxt-fb-swap"));
const LightningWalletPage = lazy(() => import("@/pages/lightning-wallet"));
const BtcSentinelPage = lazy(() => import("@/pages/btc-sentinel"));
const BtcAssetsSentinelPage = lazy(() => import("@/pages/btc-assets-sentinel"));
const StablecoinPage = lazy(() => import("@/pages/stablecoin"));
const MempoolMonitorPage = lazy(() => import("@/pages/mempool-monitor"));
const ReceivePage = lazy(() => import("@/pages/receive"));
const PortfolioPage = lazy(() => import("@/pages/portfolio"));
const LpPoolsPage = lazy(() => import("@/pages/lp-pools"));
const AirdropPage = lazy(() => import("@/pages/airdrop"));
const CoinsnierPage = lazy(() => import("@/pages/coinsniper"));
const QuestHubPage = lazy(() => import("@/pages/quest-hub"));
const RuneSwapPage     = lazy(() => import("@/pages/rune-swap"));
const RunePipelinePage = lazy(() => import("@/pages/rune-pipeline"));
const AdminOrdersPage      = lazy(() => import("@/pages/admin-orders"));
const SpectralBundlePage    = lazy(() => import("@/pages/spectral-bundle"));
const JoinCommunityPage     = lazy(() => import("@/pages/join-community"));
const BuildWithUsPage       = lazy(() => import("@/pages/build"));
const WSatsPage             = lazy(() => import("@/pages/wsats"));
const RoadmapPage           = lazy(() => import("@/pages/roadmap"));
const HowToPlugInPage       = lazy(() => import("@/pages/how-to-plug-in"));
const EncodePage            = lazy(() => import("@/pages/encode"));
const ReplitTemplatePage    = lazy(() => import("@/pages/replit-template"));
const ProofPage             = lazy(() => import("@/pages/proof"));
const ShareholdersPage      = lazy(() => import("@/pages/shareholders"));
const ContactPage           = lazy(() => import("@/pages/contact"));
const LabsPage              = lazy(() => import("@/pages/labs"));
const BuildCataloguePage    = lazy(() => import("@/pages/build-catalogue"));
const PsiBoardPage          = lazy(() => import("@/pages/psi-board"));
const PassportPage          = lazy(() => import("@/pages/passport"));
const StewardsPage          = lazy(() => import("@/pages/stewards"));
const PocPage               = lazy(() => import("@/pages/poc"));
const JointVenturePage      = lazy(() => import("@/pages/joint-venture"));
const FoundersPage          = lazy(() => import("@/pages/founders"));
const OctaveLayersPage      = lazy(() => import("@/pages/octave-layers"));
const PaperPage             = lazy(() => import("@/pages/paper"));
const HardwareResultsPage   = lazy(() => import("@/pages/hardware-results"));
const UnifiedCompressionTheoryPage = lazy(() => import("@/pages/unified-compression-theory"));
const UniversalOnePage              = lazy(() => import("@/pages/universal-one"));
const MatterProtocolPage            = lazy(() => import("@/pages/matter-protocol"));
const UniversalAddressPage          = lazy(() => import("@/pages/universal-address"));

// Loading spinner shown while a lazy page chunk is downloading
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm font-mono">Loading…</span>
      </div>
    </div>
  );
}

// Error boundary — catches React render crashes and shows a message instead of a black screen
interface EBState { hasError: boolean; message: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message || "Unknown error" };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[NexusOS ErrorBoundary]", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 text-center space-y-4">
            <div className="text-red-400 text-2xl">⚠️</div>
            <div className="text-white font-semibold">Something went wrong</div>
            <div className="text-gray-400 text-xs font-mono break-all">{this.state.message}</div>
            <button
              onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-2 text-sm transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Protected route registry (client-side)
//
// Used by ProtectedOrNotFound to decide whether to delegate to ProtectedRoutes
// (known app path → auth check) or render a public NotFound (unknown path).
//
// EXACT_PROTECTED_PATHS — must match exactly.
// DYNAMIC_PROTECTED_PREFIXES — paths with dynamic segments where ANY child is valid.
// ---------------------------------------------------------------------------
const EXACT_PROTECTED_PATHS = new Set<string>([
  "/", "/hub", "/apps",
  "/v10", "/v9", "/v8", "/v7", "/v6",
  "/encoding-lab",
  "/workspace/encoding", "/workspace/analytics", "/workspace/transmission",
  "/workspace/research", "/workspace/wavefield", "/workspace/k1",
  "/workspace/orchestration", "/workspace/coordinator", "/workspace/matrix",
  "/wallet",
  "/announcements", "/announcements/substrate-v2",
  "/resonance-propulsion",
  "/resonance-cavity",
  "/friends", "/inbox", "/messages", "/phonebook",
  "/k1", "/k1/orchestration",
  "/secure-docs",
  "/streaming",
  "/developer", "/developer-matrix", "/developer-matrix/docs", "/developer/keys",
  "/governance",
  "/wnsp/coordinator", "/wnsp/kernel",
  "/kernel", "/kernel-genesis",
  "/photonic-dev", "/nexus/dev",
  "/quantum-threshold", "/nexus-hardware-os", "/computing-alternatives",
  "/wavelength-os", "/ce-writer", "/pricing",
  "/spectral-db", "/blockchain", "/agent-bus", "/nexus-command", "/nexus-explorer",
  "/spectral-workspace", "/chronicle",
  "/spectral-library", "/spectral-audit", "/orbital-treasury",
  "/founders-charity", "/hardware-treasury", "/ecosystem", "/ordinal-registry",
  "/communication", "/comms", "/network", "/wavelength-lang",
  "/evidence", "/transmission", "/wnsp-bridge", "/wnsp/bridge",
  "/directory", "/ledger", "/github", "/settings",
  "/sop", "/protocol", "/photonic-ledger", "/p2p-terminal",
  "/learn", "/pipeline", "/spectral-mirror", "/community",
  "/media-library", "/quora", "/reddit", "/telegram-hub",
  "/wnsp-paper", "/start", "/social-broadcast",
  "/lightning-wallet", "/lightning", "/stablecoin",
  "/research-presentation", "/research-presentation/developer-matrix",
  "/oscillating-quanta",
  // pages also made public — still handled by ProtectedRoutes for auth'd users
  "/planck-alignment", "/reposed-theory", "/compression-explorer",
  "/ce-se-pipeline", "/ce-code-writer", "/wnsp-vm",
  "/spectral-router", "/spectral-search", "/spectral-contracts",
  "/divergence-test", "/hardware-spec", "/hardware-lab",
  "/campaign", "/constitution", "/mobile-sdk", "/shareholders",
  "/psi-board", "/unified-compression-theory", "/universal-one", "/matter-protocol", "/universal-address",
]);

// Only paths where ANY child segment is a valid protected route (dynamic).
const DYNAMIC_PROTECTED_PREFIXES: string[] = [
  "/docs/",        // /docs/:section
  "/streaming/",   // /streaming/:streamId
];

function isKnownProtectedPath(location: string): boolean {
  if (EXACT_PROTECTED_PATHS.has(location)) return true;
  return DYNAMIC_PROTECTED_PREFIXES.some((p) => location.startsWith(p));
}

// Renders ProtectedRoutes for known authenticated paths, otherwise shows a
// public 404 page so unauthenticated crawlers get a real "not found" signal.
function ProtectedOrNotFound() {
  const [location] = useLocation();
  if (!isKnownProtectedPath(location)) {
    return (
      <Suspense fallback={<PageLoader />}>
        <NotFound />
      </Suspense>
    );
  }
  return <ProtectedRoutes />;
}

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={HubPage} />
        <Route path="/hub" component={HubPage} />
        <Route path="/apps" component={LambdaPlaceholder} />
        <Route path="/v10" component={NexusV10Page} />
        <Route path="/v9" component={NexusV9Page} />
        <Route path="/v8" component={NexusV8Page} />
        <Route path="/v7" component={WNSPv7Page} />
        <Route path="/v6" component={NexusV6Page} />
        <Route path="/encoding-lab" component={EncodingLab} />
        <Route path="/workspace/encoding" component={EncodingLab} />
        <Route path="/workspace/analytics" component={AnalyticsPage} />
        <Route path="/workspace/transmission" component={TransmissionPage} />
        <Route path="/workspace/research" component={ResearchPage} />
        <Route path="/workspace/wavefield" component={WavefieldPage} />
        <Route path="/wallet" component={WalletPage} />
        <Route path="/announcements" component={AnnouncementsPage} />
        <Route path="/announcements/substrate-v2" component={AnnouncementSubstrateV2Page} />
        <Route path="/resonance-propulsion" component={ResonancePropulsionPage} />
        <Route path="/resonance-cavity" component={ResonanceCavityPage} />
        <Route path="/friends" component={FriendsPage} />
        <Route path="/inbox" component={InboxPage} />
        <Route path="/messages" component={InboxPage} />
        <Route path="/k1" component={K1InfrastructurePage} />
        <Route path="/workspace/k1" component={K1InfrastructurePage} />
        <Route path="/k1/orchestration" component={K1OrchestrationPage} />
        <Route path="/workspace/orchestration" component={K1OrchestrationPage} />
        <Route path="/secure-docs" component={SecureDocxPage} />
        <Route path="/research-presentation" component={ResearchPresentationPage} />
        <Route path="/research-presentation/developer-matrix" component={DeveloperMatrixPage} />
        <Route path="/streaming" component={StreamingPage} />
        <Route path="/streaming/:streamId" component={StreamingPage} />
        <Route path="/developer" component={DeveloperPage} />
        <Route path="/developer-matrix" component={DeveloperMatrixPage} />
        <Route path="/developer-matrix/docs" component={DocsPage} />
        <Route path="/developer/keys" component={DeveloperKeysPage} />
        <Route path="/governance" component={GovernancePage} />
        <Route path="/constitution" component={ConstitutionPage} />
        <Route path="/workspace/matrix" component={DeveloperMatrixPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/docs/:section" component={DocsPage} />
        <Route path="/wnsp/coordinator" component={WNSPCoordinator} />
        <Route path="/workspace/coordinator" component={WNSPCoordinator} />
        <Route path="/kernel" component={KernelPage} />
        <Route path="/wnsp/kernel" component={KernelPage} />
        <Route path="/photonic-dev" component={PhotonicDevPage} />
        <Route path="/nexus/dev" component={PhotonicDevPage} />
        <Route path="/quantum-threshold" component={QuantumThresholdPage} />
        <Route path="/nexus-hardware-os" component={NexusHardwareOsPage} />
        <Route path="/computing-alternatives" component={ComputingAlternativesPage} />
        <Route path="/wavelength-os" component={WavelengthOsManifestoPage} />
        <Route path="/ce-writer" component={CeCodeWriterPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/spectral-db" component={SpectralDbPage} />
        <Route path="/blockchain" component={BlockchainPage} />
        <Route path="/agent-bus" component={AgentBusPage} />
        <Route path="/nexus-command" component={NexusCommandPage} />
        <Route path="/nexus-analytics" component={NexusAnalyticsPage} />
        <Route path="/nexus-explorer" component={NexusExplorerPage} />
        <Route path="/kernel-genesis" component={KernelGenesisPage} />
        <Route path="/spectral-workspace" component={SpectralWorkspacePage} />
        <Route path="/chronicle" component={ChroniclePage} />
        <Route path="/spectral-library" component={SpectralLibraryPage} />
        <Route path="/spectral-audit" component={SpectralAuditPage} />
        <Route path="/orbital-treasury" component={OrbitalTreasuryPage} />
        <Route path="/founders-charity" component={FoundersCharityPage} />
        <Route path="/hardware-treasury" component={HardwareTreasuryPage} />
        <Route path="/ecosystem" component={EcosystemPage} />
        <Route path="/ordinal-registry" component={OrdinalRegistryPage} />
        <Route path="/communication" component={CommunicationPage} />
        <Route path="/comms" component={CommunicationPage} />
        <Route path="/network" component={NetworkPage} />
        <Route path="/wavelength-lang" component={WavelengthLangPage} />
        <Route path="/evidence" component={EvidencePage} />
        <Route path="/transmission" component={TransmissionPage} />
        <Route path="/wnsp-bridge" component={WnspBridgePage} />
        <Route path="/wnsp/bridge" component={WnspBridgePage} />
        <Route path="/directory" component={DirectoryPage} />
        <Route path="/phonebook" component={PhonebookPage} />
        <Route path="/ledger" component={LedgerPage} />
        <Route path="/github" component={GitHubBridgePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/mobile-sdk" component={MobileSDKPage} />
        <Route path="/wnsp-vm" component={WnspVMPage} />
        <Route path="/divergence-test" component={DivergenceTestPage} />
        <Route path="/spectral-router" component={SpectralRouterPage} />
        <Route path="/spectral-search" component={SpectralSearchPage} />
        <Route path="/compression-explorer" component={CompressionExplorerPage} />
        <Route path="/spectral-contracts" component={SpectralContractsPage} />
        <Route path="/sop" component={SOPPage} />
        <Route path="/hardware-lab" component={HardwareLabPage} />
        <Route path="/oscillating-quanta" component={OscillatingQuantaPage} />
        <Route path="/ce-se-pipeline" component={LearnPage} />
        <Route path="/protocol" component={ProtocolPage} />
        <Route path="/photonic-ledger" component={PhotonicLedgerPage} />
        <Route path="/hardware-spec" component={HardwareSpecPage} />
        <Route path="/p2p-terminal" component={P2PTerminalPage} />
        <Route path="/learn" component={LearnPage} />
        <Route path="/pipeline" component={PipelinePage} />
        <Route path="/planck-alignment" component={PlanckAlignmentPage} />
        <Route path="/spectral-mirror" component={SpectralMirrorPage} />
        <Route path="/community" component={CommunityPage} />
        <Route path="/media-library" component={MediaLibraryPage} />
        <Route path="/quora" component={QuoraPage} />
        <Route path="/reddit" component={RedditPage} />
        <Route path="/telegram-hub" component={TelegramHubPage} />
        <Route path="/wnsp-paper" component={WnspPaperPage} />
        <Route path="/start"  component={StartPage} />
        <Route path="/reposed-theory" component={ReposedTheoryPage} />
        <Route path="/ce-code-writer" component={CeCodeWriterPage} />
        <Route path="/campaign" component={CampaignPage} />
        <Route path="/social-broadcast" component={SocialBroadcastPage} />
        <Route path="/lightning-wallet" component={LightningWalletPage} />
        <Route path="/lightning" component={LightningWalletPage} />
        <Route path="/stablecoin" component={StablecoinPage} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Public routes - no login required */}
      <Route path="/crowdfund" component={CrowdfundPage} />
      <Route path="/fund" component={CrowdfundPage} />
      <Route path="/videos" component={VideosPage} />
      <Route path="/indiegogo" component={IndiegogoPage} />
      <Route path="/developer" component={DeveloperPage} />
      <Route path="/developer-matrix" component={DeveloperMatrixPage} />
      <Route path="/developer-matrix/docs" component={DocsPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/research-presentation" component={ResearchPresentationPage} />
      <Route path="/research-presentation/developer-matrix" component={DeveloperMatrixPage} />
      {/* ── Nexus Spectral Framework (unified) ── */}
      <Route path="/spectral-db" component={SpectralDbPage} />
      <Route path="/nexus-spectral" component={SpectralDbPage} />
      {/* Legacy redirects → unified framework */}
      <Route path="/spectral-video">{() => { window.location.replace("/wnsp"); return null; }}</Route>
      <Route path="/spectral-uri">{() => { window.location.replace("/wnsp"); return null; }}</Route>
      <Route path="/wnsp-uri">{() => { window.location.replace("/wnsp"); return null; }}</Route>
      <Route path="/visualizer">{() => { window.location.replace("/wnsp"); return null; }}</Route>
      {/* Public showcase & proof pages */}
      <Route path="/wnsp" component={WnspLandingPage} />
      <Route path="/wnsp/ordinals" component={WnspOrdinalsPage} />
      <Route path="/bitcoin-ordinals" component={WnspOrdinalsPage} />
      <Route path="/wnsp-ordinals" component={WnspOrdinalsPage} />
      <Route path="/nostr" component={NostrRelayPage} />
      <Route path="/nostr-relay" component={NostrRelayPage} />
      <Route path="/nostr-bridge" component={NostrBridgePage} />
      <Route path="/nxt-campaign" component={NxtCampaignPage} />
      <Route path="/community-mint" component={CommunityMintPage} />
      <Route path="/wnsp-staking" component={WnspStakingPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/market"     component={MarketPage} />
      <Route path="/rune-etching" component={RuneEtchingPage} />
      <Route path="/rune-mint" component={RuneMintPage} />
      <Route path="/etch-rune" component={EtchRunePage} />
      <Route path="/rune-staking" component={RuneStakingPage} />
      <Route path="/stake-earn"  component={StakeEarnPage} />
      <Route path="/fractal-btc" component={FractalBtcBridgePage} />
      <Route path="/fractal-bitcoin" component={FractalBtcBridgePage} />
      <Route path="/nxt-fb-swap" component={NxtFbSwapPage} />
      <Route path="/swap" component={NxtFbSwapPage} />
      <Route path="/btc-sentinel" component={BtcSentinelPage} />
      <Route path="/btc-assets-sentinel" component={BtcAssetsSentinelPage} />
      <Route path="/mempool" component={MempoolMonitorPage} />
      <Route path="/snic" component={SnicPage} />
      <Route path="/open" component={OpenPage} />
      <Route path="/charter" component={OpenPage} />
      <Route path="/evidence" component={EvidencePage} />
      <Route path="/blockchain" component={BlockchainPage} />
      <Route path="/ecosystem" component={EcosystemPage} />
      <Route path="/network" component={NetworkPage} />
      <Route path="/wavelength-lang" component={WavelengthLangPage} />
      <Route path="/nexus-command" component={NexusCommandPage} />
      <Route path="/nexus-analytics" component={NexusAnalyticsPage} />
      <Route path="/nexus-explorer" component={NexusExplorerPage} />
      <Route path="/wnsp-bridge" component={WnspBridgePage} />
      <Route path="/wnsp/bridge" component={WnspBridgePage} />
      <Route path="/profile/:username" component={ProfilePage} />
      <Route path="/oscillating-quanta" component={OscillatingQuantaPage} />
      <Route path="/silicon-bridge" component={SiliconBridgePage} />
      <Route path="/receive" component={ReceivePage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/lp-pools" component={LpPoolsPage} />
      <Route path="/airdrop" component={AirdropPage} />
      <Route path="/coinsniper" component={CoinsnierPage} />
      <Route path="/quest"          component={QuestHubPage} />
      <Route path="/rune-swap"      component={RuneSwapPage} />
      <Route path="/rune-pipeline"  component={RunePipelinePage} />
      <Route path="/admin/orders"        component={AdminOrdersPage} />
      <Route path="/spectral-bundle"     component={SpectralBundlePage} />
      <Route path="/join-community"      component={JoinCommunityPage} />
      <Route path="/build"              component={BuildWithUsPage} />
      <Route path="/wsats"               component={WSatsPage} />
      <Route path="/roadmap"             component={RoadmapPage} />
      <Route path="/how-to-plug-in"      component={HowToPlugInPage} />
      <Route path="/encode"              component={EncodePage} />
      <Route path="/replit-template"     component={ReplitTemplatePage} />
      <Route path="/proof"               component={ProofPage} />
      <Route path="/stewards"            component={StewardsPage} />
      <Route path="/poc"                 component={PocPage} />
      <Route path="/joint-venture"       component={JointVenturePage} />
      <Route path="/founders"            component={FoundersPage} />
      <Route path="/octave-layers"       component={OctaveLayersPage} />
      <Route path="/paper"               component={PaperPage} />
      <Route path="/hardware-results"    component={HardwareResultsPage} />
      <Route path="/unified-compression-theory" component={UnifiedCompressionTheoryPage} />
      <Route path="/universal-one"              component={UniversalOnePage} />
      <Route path="/matter-protocol"            component={MatterProtocolPage} />
      <Route path="/universal-address"          component={UniversalAddressPage} />
      {/* ── Science & Protocol pages — publicly crawlable ── */}
      <Route path="/resonance-cavity" component={ResonanceCavityPage} />
      <Route path="/planck-alignment" component={PlanckAlignmentPage} />
      <Route path="/reposed-theory" component={ReposedTheoryPage} />
      <Route path="/compression-explorer" component={CompressionExplorerPage} />
      <Route path="/ce-se-pipeline" component={LearnPage} />
      <Route path="/ce-code-writer" component={CeCodeWriterPage} />
      <Route path="/wnsp-vm" component={WnspVMPage} />
      <Route path="/spectral-router" component={SpectralRouterPage} />
      <Route path="/spectral-search" component={SpectralSearchPage} />
      <Route path="/spectral-contracts" component={SpectralContractsPage} />
      <Route path="/spectral-ide" component={SpectralIDEPage} />
      <Route path="/app/:slug" component={ContractAppPage} />
      <Route path="/divergence-test" component={DivergenceTestPage} />
      <Route path="/hardware-spec" component={HardwareSpecPage} />
      <Route path="/hardware-lab" component={HardwareLabPage} />
      <Route path="/hardware-treasury" component={HardwareTreasuryPage} />
      <Route path="/campaign" component={CampaignPage} />
      <Route path="/constitution" component={ConstitutionPage} />
      <Route path="/mobile-sdk" component={MobileSDKPage} />
      <Route path="/shareholders" component={ShareholdersPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/labs" component={LabsPage} />
      <Route path="/build-catalogue" component={BuildCataloguePage} />
      <Route path="/psi-board" component={PsiBoardPage} />
      <Route path="/passport" component={PassportPage} />
      {/* ── Public infrastructure / economy pages — crawlable ── */}
      <Route path="/nexus-hardware-os" component={NexusHardwareOsPage} />
      <Route path="/orbital-treasury" component={OrbitalTreasuryPage} />
      <Route path="/spectral-library" component={SpectralLibraryPage} />
      {/* Catch-all: shows 404 for unknown paths, auth guard for known protected ones */}
      <Route component={ProtectedOrNotFound} />
    </Switch>
  );
}

// ── Global friend-request alert — fires on any page ────────────────────────
function FriendRequestNotifier() {
  const { toast } = useToast();
  const qc = useQueryClient();
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${location.host}/ws/signaling?token=${token}`);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "friend_request") {
          qc.invalidateQueries({ queryKey: ["/api/friends"] });
          toast({
            title: "📡 Friend request received",
            description: `${msg.from?.username ?? "Someone"} wants to connect`,
            duration: 10000,
          });
        }
      } catch {}
    };
    return () => ws.close();
  }, [toast, qc]);
  return null;
}

function TelegramFloat() {
  return (
    <a
      href="https://t.me/troglodytememe"
      target="_blank"
      rel="noopener noreferrer"
      title="Join our Telegram"
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
      className="group flex items-center gap-2 rounded-full bg-[#229ED9] shadow-lg shadow-[#229ED9]/30 hover:shadow-[#229ED9]/50 hover:scale-105 transition-all duration-200 pr-4 pl-1 py-1"
    >
      <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </div>
      <span className="text-white font-semibold text-sm whitespace-nowrap">Join Telegram</span>
    </a>
  );
}

function App() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;
  // Custom domains: only "/"  renders the microsite landing; all other paths → 404.
  // domain-landings.tsx (1,300+ lines) is NOT in the initial bundle — lazy loaded only
  // when someone visits from an actual custom domain.
  if (CUSTOM_DOMAIN_HOSTS.has(hostname)) {
    if (pathname === "/" || pathname === "") {
      return (
        <Suspense fallback={<PageLoader />}>
          <DomainRouter hostname={hostname} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <NotFound />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <UniSatProvider>
            <AuthProvider>
              <Toaster />
              <FriendRequestNotifier />
              <AuthLoading>
                <Suspense fallback={<PageLoader />}>
                  <Router />
                </Suspense>
              </AuthLoading>
              <TelegramFloat />
              <Suspense fallback={null}><GuideBot /></Suspense>
            </AuthProvider>
          </UniSatProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
