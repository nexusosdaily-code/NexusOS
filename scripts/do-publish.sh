#!/usr/bin/env bash
set -e

# npm publish
echo "=== Publishing to npm ==="
cd /home/runner/workspace/packages/ce-encoder

LOCAL_VER=$(node -e "console.log(require('./package.json').version)")
echo "Local: $LOCAL_VER"

REGISTRY_VER=$(node -e "
const {execSync}=require('child_process');
try{process.stdout.write(execSync('npm view nexusos-ce-encoder version 2>/dev/null',{encoding:'utf8'}).trim())}
catch(e){process.stdout.write('NOT_PUBLISHED')}
")
echo "Registry: $REGISTRY_VER"

cat > ~/.npmrc << EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

if [ "$REGISTRY_VER" = "$LOCAL_VER" ]; then
  echo "SKIP: v$LOCAL_VER already on npm"
else
  node -e "
const {execSync}=require('child_process');
const o=execSync('npm publish --access public',{encoding:'utf8',cwd:process.cwd()});
console.log(o);
"
  echo "npm: PUBLISHED v$LOCAL_VER"
fi

# PyPI publish
echo ""
echo "=== Publishing to PyPI ==="
cd /home/runner/workspace/packages/ce-encoder-py

pip install --quiet build twine 2>&1 | grep -E "already|Collecting|Successfully" || true

PY_VER=$(python3 -c "
import re; c=open('pyproject.toml').read()
m=re.search(r'version\s*=\s*\"([^\"]+)\"',c)
print(m.group(1) if m else 'unknown')
")
echo "Local: $PY_VER"

PYPI_VER=$(python3 -c "
import urllib.request,json,sys
try:
  d=json.loads(urllib.request.urlopen('https://pypi.org/pypi/nexusos-ce-encoder/json',timeout=5).read())
  print(d['info']['version'])
except:
  print('NOT_PUBLISHED')
" 2>/dev/null)
echo "PyPI: $PYPI_VER"

if [ "$PYPI_VER" = "$PY_VER" ]; then
  echo "SKIP: v$PY_VER already on PyPI"
else
  rm -rf dist build *.egg-info 2>/dev/null || true
  python3 -m build 2>&1 | tail -5
  TWINE_PASSWORD="${PYPI_TOKEN}" python3 -m twine upload --username __token__ dist/* 2>&1
  echo "PyPI: PUBLISHED v$PY_VER"
fi

echo ""
echo "=== All done ==="
