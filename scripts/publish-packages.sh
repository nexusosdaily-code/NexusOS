#!/usr/bin/env bash
set -e

echo "=== Publishing nexusos-ce-encoder to npm ==="
cd packages/ce-encoder

# Set auth token
node -e "
const fs = require('fs');
const os = require('os');
const rcPath = os.homedir() + '/.npmrc';
let content = '';
try { content = fs.readFileSync(rcPath, 'utf8'); } catch(e) {}
const line = '//registry.npmjs.org/:_authToken=' + process.env.NPM_TOKEN;
if (!content.includes('registry.npmjs.org/:_authToken')) {
  fs.appendFileSync(rcPath, '\n' + line + '\n');
  console.log('npmrc updated');
} else {
  content = content.replace(/\/\/registry\.npmjs\.org\/:_authToken=.*/g, line);
  fs.writeFileSync(rcPath, content);
  console.log('npmrc token replaced');
}
"

# Check if version already published
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
echo "Package version: $CURRENT_VERSION"

PUBLISHED=$(node -e "
const { execSync } = require('child_process');
try {
  const info = execSync('npm view nexusos-ce-encoder version 2>/dev/null', { encoding: 'utf8' }).trim();
  console.log(info);
} catch(e) {
  console.log('NOT_PUBLISHED');
}
")

echo "Latest published: $PUBLISHED"

if [ "$PUBLISHED" = "$CURRENT_VERSION" ]; then
  echo "Version $CURRENT_VERSION already published to npm, skipping."
else
  node -e "
const { execSync } = require('child_process');
const result = execSync('npm publish --access public 2>&1', { encoding: 'utf8' });
console.log(result);
"
  echo "npm publish complete."
fi

cd ../..

echo ""
echo "=== Publishing nexusos-ce-encoder to PyPI ==="
cd packages/ce-encoder-py

pip install --quiet build twine 2>&1 | tail -3

python -m build --quiet 2>&1

PYPI_CHECK=$(python -c "
import urllib.request, json
try:
    resp = urllib.request.urlopen('https://pypi.org/pypi/nexusos-ce-encoder/json', timeout=5)
    data = json.loads(resp.read())
    print(data['info']['version'])
except:
    print('NOT_PUBLISHED')
" 2>/dev/null)

echo "Latest on PyPI: $PYPI_CHECK"

CURRENT_PY_VERSION=$(python -c "
import tomllib
with open('pyproject.toml','rb') as f:
    d = tomllib.load(f)
print(d['project']['version'])
" 2>/dev/null || python3 -c "
import re
content = open('pyproject.toml').read()
m = re.search(r'version\s*=\s*\"([^\"]+)\"', content)
print(m.group(1) if m else 'unknown')
")

echo "Package version: $CURRENT_PY_VERSION"

if [ "$PYPI_CHECK" = "$CURRENT_PY_VERSION" ]; then
  echo "Version $CURRENT_PY_VERSION already published to PyPI, skipping."
else
  python -m twine upload --username __token__ --password "$PYPI_TOKEN" dist/* 2>&1
  echo "PyPI publish complete."
fi

cd ../..

echo ""
echo "=== All done ==="
