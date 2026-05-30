import { Switch, Route } from "wouter";
import GuideBot from "@/components/GuideBot";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AuthLoading } from "@/hooks/use-auth";
import HubPage from "@/pages/hub";
import LambdaPlaceholder from "@/pages/lambda-placeholder";
import WNSPv7Page from "@/pages/wnsp-v7";
import NexusV10Page from "@/pages/nexus-v10";
import NexusV6Page from "@/pages/nexus-v6";
import NexusV8Page from "@/pages/nexus-v8";
import NexusV9Page from "@/pages/nexus-v9";
import EncodingLab from "@/pages/encoding-lab";
import AnalyticsPage from "@/pages/analytics";
import TransmissionPage from "@/pages/transmission";
import ResearchPage from "@/pages/research";
import WavefieldPage from "@/pages/wavefield";
import WalletPage from "@/pages/wallet";
import AnnouncementsPage from "@/pages/announcements";
import AnnouncementSubstrateV2Page from "@/pages/announcement-substrate-v2";
import ResonancePropulsionPage from "@/pages/resonance-propulsion";
import AuthPage from "@/pages/auth";
import FriendsPage from "@/pages/friends";
import InboxPage from "@/pages/inbox";
import K1InfrastructurePage from "@/pages/k1-infrastructure";
import K1OrchestrationPage from "@/pages/k1-orchestration";
import SecureDocxPage from "@/pages/secure-docx";
import ResearchPresentationPage from "@/pages/research-presentation";
import StreamingPage from "@/pages/streaming";
import DeveloperMatrixPage from "@/pages/developer-matrix";
import DeveloperKeysPage from "@/pages/developer-keys";
import GovernancePage from "@/pages/governance";
import ConstitutionPage from "@/pages/constitution";
import DocsPage from "@/pages/docs";
import WNSPCoordinator from "@/pages/wnsp-coordinator";
import KernelPage from "@/pages/kernel";
import PhotonicDevPage from "@/pages/photonic-dev";
import QuantumThresholdPage from "@/pages/quantum-threshold";
import NexusHardwareOsPage from "@/pages/nexus-hardware-os";
import ComputingAlternativesPage from "@/pages/computing-alternatives";
import WavelengthOsManifestoPage from "@/pages/wavelength-os-manifesto";
import CeCodeWriterPage from "@/pages/ce-code-writer";
import PricingPage from "@/pages/pricing";
import SpectralDbPage from "@/pages/spectral-db";
import BlockchainPage from "@/pages/blockchain";
import AgentBusPage from "@/pages/agent-bus";
import NexusCommandPage from "@/pages/nexus-command";
import KernelGenesisPage from "@/pages/kernel-genesis";
import SpectralWorkspacePage from "@/pages/spectral-workspace";
import ChroniclePage from "@/pages/chronicle";
import SpectralLibraryPage from "@/pages/spectral-library";
import SpectralAuditPage from "@/pages/spectral-audit";
import OrbitalTreasuryPage from "@/pages/orbital-treasury";
import FoundersCharityPage from "@/pages/founders-charity";
import EcosystemPage from "@/pages/ecosystem";
import OrdinalRegistryPage from "@/pages/ordinal-registry";
import CommunicationPage from "@/pages/communication";
import NetworkPage from "@/pages/network";
import WavelengthLangPage from "@/pages/wavelength-lang";
import EvidencePage from "@/pages/evidence";
import CrowdfundPage from "@/pages/crowdfund";
import SpectralVideoPage from "@/pages/spectral-video";
import VisualizerPage from "@/pages/visualizer";
import IndiegogoPage from "@/pages/indiegogo";
import SnicPage from "@/pages/snic";
import SpectralUriPage from "@/pages/spectral-uri";
import OpenPage from "@/pages/open";
import WnspBridgePage from "@/pages/wnsp-bridge";
import ProfilePage from "@/pages/profile";
import DirectoryPage from "@/pages/directory";
import LedgerPage from "@/pages/ledger";
import GitHubBridgePage from "@/pages/github-bridge";
import SettingsPage from "@/pages/settings";
import MobileSDKPage from "@/pages/mobile-sdk";
import WnspVMPage from "@/pages/wnsp-vm";
import DivergenceTestPage from "@/pages/divergence-test";
import SpectralRouterPage from "@/pages/spectral-router";
import SpectralSearchPage from "@/pages/spectral-search";
import CompressionExplorerPage from "@/pages/compression-explorer";
import SpectralContractsPage from "@/pages/spectral-contracts";
import SOPPage from "@/pages/sop";
import HardwareLabPage from "@/pages/hardware-lab";
import OscillatingQuantaPage from "@/pages/oscillating-quanta";
import LearnPage from "@/pages/learn";
import PipelinePage from "@/pages/pipeline";
import PlanckAlignmentPage from "@/pages/planck-alignment";
import SpectralMirrorPage from "@/pages/spectral-mirror";
import CommunityPage from "@/pages/community";
import MediaLibraryPage from "@/pages/media-library";
import QuoraPage from "@/pages/quora";
import RedditPage from "@/pages/reddit";
import TelegramHubPage from "@/pages/telegram-hub";
import WnspPaperPage from "@/pages/wnsp-paper";
import StartPage from "@/pages/start";
import ReposedTheoryPage from "@/pages/reposed-theory";
import ProtocolPage from "@/pages/protocol";
import PhotonicLedgerPage from "@/pages/photonic-ledger";
import HardwareSpecPage from "@/pages/hardware-spec";
import P2PTerminalPage from "@/pages/p2p-terminal";
import CampaignPage from "@/pages/campaign";
import VideosPage from "@/pages/videos";
import SocialBroadcastPage from "@/pages/social-broadcast";
import NotFound from "@/pages/not-found";
import WnspLandingPage from "@/pages/wnsp-landing";
import WnspOrdinalsPage from "@/pages/wnsp-ordinals";
import CommunityMintPage from "@/pages/community-mint";
import WnspStakingPage from "@/pages/wnsp-staking";
import MarketplacePage from "@/pages/marketplace";
import FractalBtcBridgePage from "@/pages/fractal-btc-bridge";
import NxtFbSwapPage from "@/pages/nxt-fb-swap";
import LightningWalletPage from "@/pages/lightning-wallet";

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={HubPage} />
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
        <Route path="/kernel-genesis" component={KernelGenesisPage} />
        <Route path="/spectral-workspace" component={SpectralWorkspacePage} />
        <Route path="/chronicle" component={ChroniclePage} />
        <Route path="/spectral-library" component={SpectralLibraryPage} />
        <Route path="/spectral-audit" component={SpectralAuditPage} />
        <Route path="/orbital-treasury" component={OrbitalTreasuryPage} />
        <Route path="/founders-charity" component={FoundersCharityPage} />
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
        <Route path="/start" component={StartPage} />
        <Route path="/reposed-theory" component={ReposedTheoryPage} />
        <Route path="/ce-code-writer" component={CeCodeWriterPage} />
        <Route path="/campaign" component={CampaignPage} />
        <Route path="/social-broadcast" component={SocialBroadcastPage} />
        <Route path="/lightning-wallet" component={LightningWalletPage} />
        <Route path="/lightning" component={LightningWalletPage} />
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
      <Route path="/developer-matrix" component={DeveloperMatrixPage} />
      <Route path="/developer-matrix/docs" component={DocsPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:section" component={DocsPage} />
      <Route path="/research-presentation" component={ResearchPresentationPage} />
      <Route path="/research-presentation/developer-matrix" component={DeveloperMatrixPage} />
      {/* ── Nexus Spectral Framework (unified) ── */}
      <Route path="/spectral-db" component={SpectralDbPage} />
      <Route path="/nexus-spectral" component={SpectralDbPage} />
      {/* Legacy redirects → unified framework */}
      <Route path="/spectral-video">{() => { window.location.replace("/spectral-db?tab=media"); return null; }}</Route>
      <Route path="/spectral-uri">{() => { window.location.replace("/spectral-db?tab=write"); return null; }}</Route>
      <Route path="/wnsp-uri">{() => { window.location.replace("/spectral-db?tab=write"); return null; }}</Route>
      <Route path="/visualizer">{() => { window.location.replace("/spectral-db?tab=map"); return null; }}</Route>
      {/* Public showcase & proof pages */}
      <Route path="/wnsp" component={WnspLandingPage} />
      <Route path="/wnsp/ordinals" component={WnspOrdinalsPage} />
      <Route path="/bitcoin-ordinals" component={WnspOrdinalsPage} />
      <Route path="/btc-bridge">{() => { window.location.replace("/wnsp/ordinals"); return null; }}</Route>
      <Route path="/community-mint" component={CommunityMintPage} />
      <Route path="/wnsp-staking" component={WnspStakingPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/fractal-btc" component={FractalBtcBridgePage} />
      <Route path="/fractal-bitcoin" component={FractalBtcBridgePage} />
      <Route path="/nxt-fb-swap" component={NxtFbSwapPage} />
      <Route path="/swap" component={NxtFbSwapPage} />
      <Route path="/snic" component={SnicPage} />
      <Route path="/open" component={OpenPage} />
      <Route path="/charter" component={OpenPage} />
      <Route path="/evidence" component={EvidencePage} />
      <Route path="/blockchain" component={BlockchainPage} />
      <Route path="/ecosystem" component={EcosystemPage} />
      <Route path="/network" component={NetworkPage} />
      <Route path="/wavelength-lang" component={WavelengthLangPage} />
      <Route path="/nexus-command" component={NexusCommandPage} />
      <Route path="/wnsp-bridge" component={WnspBridgePage} />
      <Route path="/wnsp/bridge" component={WnspBridgePage} />
      <Route path="/profile/:username" component={ProfilePage} />
      <Route path="/oscillating-quanta" component={OscillatingQuantaPage} />
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
  );
}

function TelegramFloat() {
  return (
    <a
      href="https://t.me/NexusOSWNSP"
      target="_blank"
      rel="noopener noreferrer"
      title="Join our Telegram"
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
      className="group flex items-center gap-2 rounded-full bg-[#229ED9] shadow-lg shadow-[#229ED9]/30 hover:shadow-[#229ED9]/50 hover:scale-105 transition-all duration-200 pr-4 pl-1 py-1"
    >
      {/* Telegram icon */}
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthLoading>
            <Router />
          </AuthLoading>
          <TelegramFloat />
          <GuideBot />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
