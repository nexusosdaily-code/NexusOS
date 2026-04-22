'use strict';

const { execSync } = require('child_process');
const { writeFileSync, readFileSync } = require('fs');
const { homedir } = require('os');

const NPM = '/nix/store/bl6iwirn83qj9r8wng43kfdqd5mfahj8-nodejs-22.22.0/bin/npm';

const githubToken = process.env.GITHUB_PAT;
if (!githubToken) { console.error('ERROR: GITHUB_PAT not set'); process.exit(1); }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
  } catch(e) {
    throw new Error((e.stdout || '') + (e.stderr || '') + e.message);
  }
}

// ── GitHub Packages (npm) ─────────────────────────────────────────────────
console.log('\n=== GitHub Packages: @nexusosdaily-code/nexusos-ce-encoder ===');

// Write .npmrc for GitHub Packages
const rcContent = `//npm.pkg.github.com/:_authToken=${githubToken}
@nexusosdaily-code:registry=https://npm.pkg.github.com
`;
writeFileSync(homedir() + '/.npmrc', rcContent);
console.log('.npmrc configured for GitHub Packages');

const pkg = JSON.parse(readFileSync(__dirname + '/../packages/ce-encoder/package.json', 'utf8'));
const localVer = pkg.version;
console.log('Local version:', localVer);
console.log('Package name:', pkg.name);

let registryVer = 'NOT_PUBLISHED';
try {
  registryVer = run(
    `${NPM} view @nexusosdaily-code/nexusos-ce-encoder version --registry=https://npm.pkg.github.com 2>/dev/null`
  ).trim();
} catch {}
console.log('GitHub Packages version:', registryVer || 'NOT_PUBLISHED');

if (registryVer === localVer) {
  console.log(`SKIP: v${localVer} already on GitHub Packages`);
} else {
  const out = run(`${NPM} publish`, { cwd: __dirname + '/../packages/ce-encoder' });
  console.log(out);
  console.log(`PUBLISHED: v${localVer} → GitHub Packages`);
}

console.log('\n=== Done ===');
console.log('Install with:');
console.log('  echo "@nexusosdaily-code:registry=https://npm.pkg.github.com" >> .npmrc');
console.log('  npm install @nexusosdaily-code/nexusos-ce-encoder');
console.log('');
console.log('Python (install directly from GitHub):');
console.log('  pip install git+https://github.com/nexusosdaily-code/NexusOS#subdirectory=packages/ce-encoder-py');
