import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getOAuthToken(): Promise<string | null> {
  try {
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY
      ? 'repl ' + process.env.REPL_IDENTITY
      : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

    if (!xReplitToken || !hostname) return null;

    if (connectionSettings?.settings?.access_token &&
        connectionSettings?.settings?.expires_at &&
        new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
      return connectionSettings.settings.access_token;
    }

    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      { headers: { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken } }
    ).then(r => r.json()).then((d: any) => d.items?.[0]);

    return connectionSettings?.settings?.access_token
      ?? connectionSettings?.settings?.oauth?.credentials?.access_token
      ?? null;
  } catch {
    return null;
  }
}

export async function getGitHubClient(): Promise<Octokit> {
  const oauthToken = await getOAuthToken();
  const token = oauthToken ?? process.env.GITHUB_PAT;
  if (!token) throw new Error('No GitHub token available — set GITHUB_PAT or connect the GitHub integration');
  return new Octokit({ auth: token });
}
