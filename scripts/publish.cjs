#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const { writeFileSync, readFileSync } = require('fs');
const { homedir } = require('os');

const NPM = process.execPath.replace('/node', '/npm');

const npmToken = process.env.NPM_TOKEN;
const pypiToken = process.env.PYPI_TOKEN;

if (!npmToken) { console.error('ERROR: NPM_TOKEN not set'); process.exit(1); }
if (!pypiToken) { console.error('ERROR: PYPI_TOKEN not set'); process.exit(1); }

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
  } catch(e) {
    throw new Error((e.stdout || '') + (e.stderr || '') + e.message);
  }
}

// ── npm ───────────────────────────────────────────────────────────────────
console.log('\n=== npm: nexusos-ce-encoder ===');

// Write .npmrc
writeFileSync(homedir() + '/.npmrc', `//registry.npmjs.org/:_authToken=${npmToken}\n`);
console.log('.npmrc configured');

const pkg = JSON.parse(readFileSync(__dirname + '/../packages/ce-encoder/package.json', 'utf8'));
const localVer = pkg.version;
console.log('Local version:', localVer);

let registryVer = 'NOT_PUBLISHED';
try {
  registryVer = execSync(`${NPM} view nexusos-ce-encoder version 2>/dev/null`, { encoding: 'utf8' }).trim();
} catch {}
console.log('Registry version:', registryVer || 'NOT_PUBLISHED');

if (registryVer === localVer) {
  console.log(`SKIP: v${localVer} already on npm`);
} else {
  const out = run(`${NPM} publish --access public`, { cwd: __dirname + '/../packages/ce-encoder' });
  console.log(out);
  console.log(`PUBLISHED: v${localVer} → npm`);
}

// ── PyPI ──────────────────────────────────────────────────────────────────
console.log('\n=== PyPI: nexusos-ce-encoder ===');

// Install build tools
try {
  run('pip install --quiet build twine 2>&1');
  console.log('build + twine ready');
} catch(e) {
  console.log('pip note:', e.message.slice(0, 100));
}

const toml = readFileSync(__dirname + '/../packages/ce-encoder-py/pyproject.toml', 'utf8');
const verMatch = toml.match(/version\s*=\s*"([^"]+)"/);
const pyLocalVer = verMatch ? verMatch[1] : 'unknown';
console.log('Local version:', pyLocalVer);

let pypiVer = 'NOT_PUBLISHED';
try {
  pypiVer = run(
    `python3 -c "import urllib.request,json; d=json.loads(urllib.request.urlopen('https://pypi.org/pypi/nexusos-ce-encoder/json',timeout=5).read()); print(d['info']['version'])"`
  ).trim();
} catch {}
console.log('PyPI version:', pypiVer);

if (pypiVer === pyLocalVer) {
  console.log(`SKIP: v${pyLocalVer} already on PyPI`);
} else {
  const pyDir = __dirname + '/../packages/ce-encoder-py';
  try { run('rm -rf dist build *.egg-info', { cwd: pyDir }); } catch {}
  
  run('pip install --quiet setuptools wheel build twine 2>&1');
  const buildOut = run('python3 -m build --no-isolation 2>&1', { cwd: pyDir });
  console.log('Build:', buildOut.trim().split('\n').pop());

  const env = { ...process.env, TWINE_PASSWORD: pypiToken };
  const uploadOut = run(
    'python3 -m twine upload --username __token__ --non-interactive dist/*',
    { cwd: pyDir, env }
  );
  console.log(uploadOut.trim());
  console.log(`PUBLISHED: v${pyLocalVer} → PyPI`);
}

console.log('\n=== Done ===');
