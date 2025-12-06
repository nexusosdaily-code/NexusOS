import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

export async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.replit',
  '.upm',
  '.config',
  '.cache',
  '.local',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  '.gitignore',
  'package-lock.json',
  'uv.lock',
  '__pycache__',
  '.pyc',
  'logs/',
  'archive/',
  'extracted/',
  'attached_assets/',
  'wiki_git/',
  'wiki_push/',
  'refs/',
  'hooks/',
  'state/',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot'
];

const MAX_FILE_SIZE = 500000;

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (shouldIgnore(fullPath)) return;
    
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

export async function pushToGitHub(owner: string, repo: string, branch: string = 'main', commitMessage: string = 'Update from NexusOS') {
  const octokit = await getGitHubClient();
  
  let baseSha: string | null = null;
  let baseTreeSha: string | null = null;
  
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    baseSha = refData.object.sha;
    
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseSha
    });
    baseTreeSha = commitData.tree.sha;
  } catch (error: any) {
    if (error.status !== 404) {
      throw error;
    }
  }

  const projectRoot = process.cwd();
  const files = getAllFiles(projectRoot);
  
  const treeItems: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    content: string;
  }> = [];

  for (const filePath of files) {
    const relativePath = path.relative(projectRoot, filePath);
    try {
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        console.log(`Skipping large file (${Math.round(stats.size/1024)}KB): ${relativePath}`);
        continue;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      treeItems.push({
        path: relativePath,
        mode: '100644',
        type: 'blob',
        content
      });
    } catch (err) {
      console.log(`Skipping binary file: ${relativePath}`);
    }
  }

  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseTreeSha || undefined
  });

  const commitParams: any = {
    owner,
    repo,
    message: commitMessage,
    tree: tree.sha
  };
  
  if (baseSha) {
    commitParams.parents = [baseSha];
  }

  const { data: commit } = await octokit.git.createCommit(commitParams);

  if (baseSha) {
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha
    });
  } else {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: commit.sha
    });
  }

  return {
    success: true,
    commitSha: commit.sha,
    filesCount: treeItems.length,
    message: `Successfully pushed ${treeItems.length} files to ${owner}/${repo}@${branch}`
  };
}
