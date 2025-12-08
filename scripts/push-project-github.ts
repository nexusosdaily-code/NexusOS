import { getGitHubClient } from '../server/github';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'nexusosdaily-code';
const REPO = 'WNSP-P2P-Hub';
const BRANCH = 'main';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.replit',
  '.cache',
  '.config',
  '.local',
  '.upm',
  'dist',
  '.breakpoints',
  'package-lock.json',
  '.nix',
  'replit.nix',
  'scripts/push',
  '.prettierrc',
  '.eslintrc'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (shouldIgnore(fullPath)) return;
    if (file.startsWith('.')) return;

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createBlobWithRetry(octokit: any, filePath: string, maxRetries = 3): Promise<string | null> {
  const content = fs.readFileSync(filePath);
  const contentBase64 = content.toString('base64');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data: blobData } = await octokit.git.createBlob({
        owner: OWNER,
        repo: REPO,
        content: contentBase64,
        encoding: 'base64'
      });
      return blobData.sha;
    } catch (error: any) {
      if (error.status === 403 && error.message.includes('rate limit')) {
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`   Rate limited on ${filePath}, waiting ${waitTime/1000}s...`);
        await sleep(waitTime);
      } else if (attempt === maxRetries) {
        console.error(`   ✗ Failed: ${filePath} - ${error.message}`);
        return null;
      }
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Starting full project push to GitHub (with rate limiting)...\n');

  const octokit = await getGitHubClient();
  console.log('✓ GitHub client authenticated\n');

  let baseTreeSha: string;
  let parentSha: string;
  
  try {
    const { data: refData } = await octokit.git.getRef({
      owner: OWNER,
      repo: REPO,
      ref: `heads/${BRANCH}`
    });
    parentSha = refData.object.sha;
    
    const { data: commitData } = await octokit.git.getCommit({
      owner: OWNER,
      repo: REPO,
      commit_sha: parentSha
    });
    baseTreeSha = commitData.tree.sha;
    console.log(`✓ Found existing branch: ${BRANCH} (${parentSha.slice(0, 7)})\n`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log('Creating new branch...');
      baseTreeSha = '';
      parentSha = '';
    } else {
      throw error;
    }
  }

  const allFiles = getAllFiles('.').map(f => f.replace(/^\.\//, ''));
  console.log(`📦 Found ${allFiles.length} files to push\n`);

  console.log('📝 Creating file blobs (with rate limiting)...');
  const treeItems: any[] = [];
  let blobCount = 0;
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 2000;

  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE);
    
    for (const filePath of batch) {
      const sha = await createBlobWithRetry(octokit, filePath);
      if (sha) {
        treeItems.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: sha
        });
        blobCount++;
      }
    }
    
    console.log(`   Created ${blobCount}/${allFiles.length} blobs...`);
    
    if (i + BATCH_SIZE < allFiles.length) {
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  console.log(`\n✓ Created ${treeItems.length} blobs\n`);

  if (treeItems.length === 0) {
    console.error('❌ No blobs created, cannot proceed');
    process.exit(1);
  }

  console.log('🌳 Creating tree...');
  const { data: treeData } = await octokit.git.createTree({
    owner: OWNER,
    repo: REPO,
    tree: treeItems,
    base_tree: baseTreeSha || undefined
  });
  console.log(`✓ Tree created: ${treeData.sha.slice(0, 7)}\n`);

  console.log('📌 Creating commit...');
  const commitMessage = `Full project sync - WNSP P2P Hub v1.1.0

Includes:
- All source files (${treeItems.length} files)
- Wavefield Quantum Simulation module
- Updated documentation and changelog
- Complete NexusOS v10.0 codebase`;

  const { data: commitData } = await octokit.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: commitMessage,
    tree: treeData.sha,
    parents: parentSha ? [parentSha] : []
  });
  console.log(`✓ Commit created: ${commitData.sha.slice(0, 7)}\n`);

  console.log('🔗 Updating branch reference...');
  await octokit.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: `heads/${BRANCH}`,
    sha: commitData.sha,
    force: true
  });

  console.log(`\n✅ Push complete!`);
  console.log(`   Files pushed: ${treeItems.length}`);
  console.log(`   Commit: ${commitData.sha}`);
  console.log(`📍 Repository: https://github.com/${OWNER}/${REPO}`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  console.error(error);
  process.exit(1);
});
