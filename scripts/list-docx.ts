import { getGitHubClient } from '../server/github';

const OWNER = 'nexusosdaily-code';
const REPO = 'WNSP-P2P-Hub';

async function searchDir(octokit: any, path: string, docxFiles: string[] = []): Promise<string[]> {
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: path
    });
    
    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item.type === 'file' && item.name.endsWith('.docx')) {
          docxFiles.push(item.path);
        }
      }
    }
  } catch (e) {
    // ignore errors
  }
  return docxFiles;
}

async function main() {
  const octokit = await getGitHubClient();
  
  console.log('Searching for .docx files in WNSP-P2P-Hub repository...\n');
  
  // Check common directories
  const dirsToCheck = ['', 'docs', 'community', 'governance', 'info', 'research', 'wiki'];
  const docxFiles: string[] = [];
  
  for (const dir of dirsToCheck) {
    await searchDir(octokit, dir, docxFiles);
  }
  
  if (docxFiles.length === 0) {
    console.log('No .docx files found in common directories.');
  } else {
    console.log('Found .docx files:');
    docxFiles.forEach(f => console.log(`  ${f}`));
  }
}

main();
