import { getGitHubClient } from '../server/github';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'nexusosdaily-code';
const REPO = 'WNSP-P2P-Hub';
const BRANCH = 'main';

interface FileToCommit {
  path: string;
  content: string;
}

async function readFileContent(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

async function getFileSha(octokit: any, filePath: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      ref: BRANCH
    });
    return (data as any).sha;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function commitFile(
  octokit: any,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  const sha = await getFileSha(octokit, filePath);
  const contentBase64 = Buffer.from(content).toString('base64');

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path: filePath,
    message,
    content: contentBase64,
    sha: sha || undefined,
    branch: BRANCH
  });

  console.log(`✓ Committed: ${filePath}`);
}

async function main() {
  console.log('🚀 Starting GitHub push for WNSP P2P Hub v1.1.0...\n');

  const octokit = await getGitHubClient();
  console.log('✓ GitHub client authenticated\n');

  const filesToCommit: FileToCommit[] = [
    {
      path: 'docs/CHANGELOG.md',
      content: await readFileContent('docs/CHANGELOG.md')
    },
    {
      path: 'replit.md',
      content: await readFileContent('replit.md')
    },
    {
      path: 'client/src/pages/wavefield.tsx',
      content: await readFileContent('client/src/pages/wavefield.tsx')
    },
    {
      path: 'client/src/App.tsx',
      content: await readFileContent('client/src/App.tsx')
    },
    {
      path: 'client/src/pages/nexus-v10.tsx',
      content: await readFileContent('client/src/pages/nexus-v10.tsx')
    }
  ];

  console.log(`📦 Committing ${filesToCommit.length} files...\n`);

  for (const file of filesToCommit) {
    const isNew = (await getFileSha(octokit, file.path)) === null;
    const action = isNew ? 'Add' : 'Update';
    const message = `${action} ${file.path} - v1.1.0 Wavefield Quantum Simulation`;
    
    await commitFile(octokit, file.path, file.content, message);
  }

  console.log('\n✅ All files committed successfully!');
  console.log(`📍 Repository: https://github.com/${OWNER}/${REPO}`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
