#!/bin/bash
# NexusOS Web3 Wallet - Build and Publish Script
# ===============================================

set -e

echo "🔐 NexusOS Web3 Wallet - Build Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "setup.py" ]; then
    echo "❌ Error: Must run from nexus_wallet_package directory"
    exit 1
fi

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf build/ dist/ *.egg-info
rm -rf nexus_wallet/__pycache__
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true

# Build source distribution and wheel
echo -e "${BLUE}📦 Building package...${NC}"
python setup.py sdist bdist_wheel

# Check distribution
echo -e "${BLUE}✅ Checking package...${NC}"
twine check dist/*

# Display build info
echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
echo ""
ls -lh dist/

echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "  Test locally:"
echo "    pip install dist/nexus_web3_wallet-1.0.0-py3-none-any.whl"
echo ""
echo "  Upload to TestPyPI:"
echo "    twine upload --repository testpypi dist/*"
echo ""
echo "  Upload to PyPI:"
echo "    twine upload dist/*"
echo ""
echo "  Or create GitHub release:"
echo "    gh release create v1.0.0 dist/* --title 'v1.0.0' --notes 'Initial release'"
echo ""
