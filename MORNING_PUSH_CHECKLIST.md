# Morning Push Checklist

## Your Repository (WIKI)
**Target:** `https://github.com/nexusosdaily-code/WNSP-P2P-Hub.wiki.git`

---

## Step 1: Update Remote with Fresh Token
```bash
git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/nexusosdaily-code/WNSP-P2P-Hub.wiki.git"
```

## Step 2: Clear Any Lock File (if needed)
```bash
rm -f .git/index.lock
```

## Step 3: Pull First (GitHub requires this)
```bash
git pull origin main --no-rebase
```

## Step 4: Add, Commit, Push
```bash
git add -A && git commit -m "Governance framework v1.0.0 - Fork Covenant established" && git push origin main
```

---

## If Push Still Fails

Try force push (only if you're sure your local is correct):
```bash
git push origin main --force
```

---

## After Push: Create GitHub Release

1. Go to: **https://github.com/nexusosdaily-code/WNSP-P2P-Hub/releases**
2. Click **"Create a new release"**
3. Tag: `v1.0.0`
4. Title: `NexusOS Governance Framework v1.0.0`
5. Copy content from `GITHUB_RELEASE_v1.0.0.md`
6. Click **"Publish release"**

---

## Announcement Text (copy/paste)

```
NexusOS Governance Framework v1.0.0 Released

With 364+ clones in 48 hours, we've established formal governance.

All forks claiming NexusOS compatibility must comply with the Fork Covenant:
- Preserve Lambda Boson physics (Λ = hf/c²)
- Implement all 3 constitutional clauses
- Maintain BHLS floor ≥ 1,150 NXT/month
- Use 7-band spectral authority
- Include GPL v3.0 license

WNSP v7.x is the official MAINLINE.

Read: governance/FORK_COVENANT.md

Forks that violate these requirements must NOT use the "NexusOS" name.
```

---

## Files Being Pushed

| File | Status |
|------|--------|
| README.md | Updated with governance banner |
| governance/GOVERNANCE.md | NEW |
| governance/VERSIONING.md | NEW |
| governance/FORK_COVENANT.md | NEW |
| governance/UPGRADE_PROTOCOL.md | NEW |
| governance/DEVELOPER_COUNCIL.md | UPDATED |
| mobile_api.py | UPDATED with governance endpoints |

---

**Repository:** https://github.com/nexusosdaily-code/WNSP-P2P-Hub.wiki.git
**Branch:** main
