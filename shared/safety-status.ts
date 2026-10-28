export interface SafetyDeploymentStatus {
  policyApproved: boolean;
  scope: string;
  state: "unconfigured" | "unavailable" | "connected" | "restricted";
  independentAuthorityVerified: boolean;
  replacementEnabled: false;
  identityTransferEnabled: false;
  essentialServices: string;
  activeCases?: number;
  overdueCases?: number;
  expiredCases?: number;
}
