import { DOMAIN_LANDINGS } from "@/pages/domain-landings";

export default function DomainRouter({ hostname }: { hostname: string }) {
  const Landing = DOMAIN_LANDINGS[hostname];
  if (!Landing) return null;
  return <Landing />;
}
