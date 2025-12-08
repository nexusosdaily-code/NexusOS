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
  'generated-icon.png',
  '.nix-*',
  'replit.nix'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (shouldIgnore(fullPath)) return;

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
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
  content: Buffer,
  message: string
): Promise<boolean> {
  try {
    const sha = await getFileSha(octokit, filePath);
    const contentBase64 = content.toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path: filePath,
      message,
      content: contentBase64,
      sha: sha || undefined,
      branch: BRANCH
    });

    return true;
  } catch (error: any) {
    console.error(`  ✗ Failed: ${filePath} - ${error.message}`);
    return false;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 Starting full GitHub push for WNSP P2P Hub...\n');

  const octokit = await getGitHubClient();
  console.log('✓ GitHub client authenticated\n');

  const allFiles = getAllFiles('.').map(f => f.replace(/^\.\//, ''));
  console.log(`📦 Found ${allFiles.length} files to push\n`);

  let successCount = 0;
  let failCount = 0;
  const batchSize = 5;

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    
    console.log(`\n📁 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allFiles.length/batchSize)}...`);
    
    for (const filePath of batch) {
      try {
        const content = fs.readFileSync(filePath);
        const success = await commitFile(
          octokit,
          filePath,
          content,
          `Add ${filePath} - Full project sync`
        );
        
        if (success) {
          console.log(`  ✓ ${filePath}`);
          successCount++;
        } else {
          failCount++;
        }
      } catch (error: any) {
        console.error(`  ✗ ${filePath}: ${error.message}`);
        failCount++;
      }
    }

    // Rate limiting - wait between batches
    if (i + batchSize < allFiles.length) {
      await sleep(1000);
    }
  }

  console.log(`\n\n✅ Push complete!`);
  console.log(`   Success: ${successCount} files`);
  console.log(`   Failed: ${failCount} files`);
  console.log(`📍 Repository: https://github.com/${OWNER}/${REPO}`);
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
