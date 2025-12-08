import { getGitHubClient } from '../server/github';

const OWNER = 'nexusosdaily-code';
const REPO = 'WNSP-P2P-Hub';

async function main() {
  const octokit = await getGitHubClient();
  
  console.log('Checking repository...\n');
  
  try {
    const { data: repo } = await octokit.repos.get({
      owner: OWNER,
      repo: REPO
    });
    console.log(`Repository: ${repo.full_name}`);
    console.log(`Default branch: ${repo.default_branch}`);
    console.log(`URL: ${repo.html_url}`);
    console.log(`Private: ${repo.private}`);
    console.log(`Size: ${repo.size} KB`);
  } catch (e: any) {
    console.error('Error getting repo:', e.message);
  }

  try {
    const { data: commits } = await octokit.repos.listCommits({
      owner: OWNER,
      repo: REPO,
      sha: 'main',
      per_page: 5
    });
    console.log('\nLatest commits on main:');
    commits.forEach((c: any) => {
      console.log(`  ${c.sha.slice(0,7)} - ${c.commit.message.split('\n')[0]} (${c.commit.author?.date})`);
    });
  } catch (e: any) {
    console.error('Error listing commits:', e.message);
  }

  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: ''
    });
    console.log('\nFiles in repository root:');
    if (Array.isArray(contents)) {
      contents.forEach((item: any) => {
        console.log(`  ${item.type}: ${item.name}`);
      });
      console.log(`\nTotal items in root: ${contents.length}`);
    }
  } catch (e: any) {
    console.error('Error listing contents:', e.message);
  }
}

main();
