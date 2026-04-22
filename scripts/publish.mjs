import { execSync } from 'child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

const npmToken = process.env.NPM_TOKEN;
const pypiToken = process.env.PYPI_TOKEN;

if (!npmToken) { console.error('NPM_TOKEN not set'); process.exit(1); }
if (!pypiToken) { console.error('PYPI_TOKEN not set'); process.exit(1); }

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

// ── npm ──────────────────────────────────────────────────────────────────────
console.log('\n=== npm: nexusos-ce-encoder ===');

const rcPath = homedir() + '/.npmrc';
let rcContent = '';
try { rcContent = readFileSync(rcPath, 'utf8'); } catch {}
const authLine = `//registry.npmjs.org/:_authToken=${npmToken}`;
if (rcContent.includes('registry.npmjs.org/:_authToken')) {
  rcContent = rcContent.replace(/\/\/registry\.npmjs\.org\/:_authToken=.*/g, authLine);
  writeFileSync(rcPath, rcContent);
} else {
  appendFileSync(rcPath, '\n' + authLine + '\n');
}
console.log('.npmrc configured');

const pkgJson = JSON.parse(readFileSync('packages/ce-encoder/package.json', 'utf8'));
const localVersion = pkgJson.version;
console.log(`Local version: ${localVersion}`);

let publishedVersion = 'NOT_PUBLISHED';
try {
  publishedVersion = run('npm view nexusos-ce-encoder version 2>/dev/null').trim();
} catch {}
console.log(`Registry version: ${publishedVersion}`);

if (publishedVersion === localVersion) {
  console.log(`v${localVersion} already on npm — skipping.`);
} else {
  const out = run('npm publish --access public', { cwd: 'packages/ce-encoder' });
  console.log(out);
  console.log('npm publish: done');
}

// ── PyPI ─────────────────────────────────────────────────────────────────────
console.log('\n=== PyPI: nexusos-ce-encoder ===');

try { run('pip install --quiet build twine'); } catch (e) { console.log('pip install output:', e.stdout); }

let pyLocal = 'unknown';
try {
  const toml = readFileSync('packages/ce-encoder-py/pyproject.toml', 'utf8');
  const m = toml.match(/version\s*=\s*"([^"]+)"/);
  if (m) pyLocal = m[1];
} catch {}
console.log(`Local version: ${pyLocal}`);

let pyPublished = 'NOT_PUBLISHED';
try {
  const resp = run('python3 -c "import urllib.request,json; d=json.loads(urllib.request.urlopen(\'https://pypi.org/pypi/nexusos-ce-encoder/json\',timeout=5).read()); print(d[\'info\'][\'version\'])"');
  pyPublished = resp.trim();
} catch {}
console.log(`PyPI version: ${pyPublished}`);

if (pyPublished === pyLocal) {
  console.log(`v${pyLocal} already on PyPI — skipping.`);
} else {
  try { run('rm -rf dist build', { cwd: 'packages/ce-encoder-py' }); } catch {}
  const buildOut = run('python3 -m build', { cwd: 'packages/ce-encoder-py' });
  console.log('build:', buildOut.slice(0, 200));
  const uploadOut = run(
    `python3 -m twine upload --username __token__ --password "${pypiToken}" dist/*`,
    { cwd: 'packages/ce-encoder-py' }
  );
  console.log('upload:', uploadOut);
  console.log('PyPI publish: done');
}

console.log('\n=== All done ===');
