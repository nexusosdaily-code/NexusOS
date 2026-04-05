import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AuthLoading } from "@/hooks/use-auth";
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
import DocsPage from "@/pages/docs";
import WNSPCoordinator from "@/pages/wnsp-coordinator";
import KernelPage from "@/pages/kernel";
import PhotonicDevPage from "@/pages/photonic-dev";
import QuantumThresholdPage from "@/pages/quantum-threshold";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={LambdaPlaceholder} />
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
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      {/* Public developer routes - no login required */}
      <Route path="/developer-matrix" component={DeveloperMatrixPage} />
      <Route path="/developer-matrix/docs" component={DocsPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/docs/:section" component={DocsPage} />
      <Route path="/research-presentation" component={ResearchPresentationPage} />
      <Route path="/research-presentation/developer-matrix" component={DeveloperMatrixPage} />
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
