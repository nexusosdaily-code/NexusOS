import { Switch, Route } from "wouter";
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
import NotFound from "@/pages/not-found";

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
      <Route>
        <ProtectedRoutes />
      </Route>
    </Switch>
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
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
