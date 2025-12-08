import { getGitHubClient } from '../server/github';

const OWNER = 'nexusosdaily-code';
const REPO = 'WNSP-P2P-Hub';

const FILES_TO_CHECK = [
  'client/src/pages/wavefield.tsx',
  'client/src/App.tsx',
  'client/src/pages/nexus-v10.tsx',
  'docs/CHANGELOG.md',
  'replit.md'
];

async function main() {
  const octokit = await getGitHubClient();
  
  console.log('Verifying files in WNSP-P2P-Hub repository...\n');
  
  for (const filePath of FILES_TO_CHECK) {
    try {
      const { data } = await octokit.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: filePath
      });
      
      const file = data as any;
      const sizeKB = (file.size / 1024).toFixed(2);
      console.log(`✓ ${filePath} (${sizeKB} KB)`);
    } catch (e: any) {
      console.log(`✗ ${filePath} - NOT FOUND`);
    }
  }
  
  // Check client/src/pages directory
  console.log('\nFiles in client/src/pages:');
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: 'client/src/pages'
    });
    if (Array.isArray(contents)) {
      contents.forEach((item: any) => {
        console.log(`  ${item.name}`);
      });
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

main();
