"""Read-only OSV audit of actual Python distributions AND uv.lock registry packages.

Only package names and versions are sent to https://api.osv.dev. No environment
variables, credentials, application data or source code are sent. A clean result
is limited to this inventory and this advisory database at the time of the check.
Exit 0: no reported advisories; 1: advisories; 2: audit unavailable/invalid.
"""
import importlib.metadata as metadata
import json
from pathlib import Path
import re
import sys
import tomllib
import urllib.request
from datetime import datetime, timezone


def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()


def audit():
    root = Path(__file__).resolve().parents[1]
    installed = {
        normalize(dist.metadata["Name"]): metadata.version(dist.metadata["Name"])
        for dist in metadata.distributions()
    }
    lock = tomllib.loads((root / "uv.lock").read_text())
    locked = {
        normalize(package["name"]): package["version"]
        for package in lock["package"]
        if "registry" in package.get("source", {})
    }
    inventory = sorted(set(installed.items()) | set(locked.items()))
    queries = [
        {"package": {"ecosystem": "PyPI", "name": name}, "version": version}
        for name, version in inventory
    ]
    request = urllib.request.Request(
        "https://api.osv.dev/v1/querybatch",
        data=json.dumps({"queries": queries}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        result = json.load(response)
    results = result.get("results")
    if not isinstance(results, list) or len(results) != len(inventory):
        raise ValueError("OSV response does not match the queried inventory")
    findings = []
    for (name, version), item in zip(inventory, results):
        if not isinstance(item, dict):
            raise ValueError("OSV returned an invalid result item")
        if item.get("error") or item.get("next_page_token"):
            raise ValueError("OSV returned an error or incomplete advisory page")
        advisories = item.get("vulns", [])
        if advisories:
            findings.append({
                "name": name, "version": version,
                "installed": installed.get(name) == version,
                "locked": locked.get(name) == version,
                "advisory_ids": [vulnerability["id"] for vulnerability in advisories],
            })
    report = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "source": "https://api.osv.dev/v1/querybatch",
        "scope": "active development interpreter and uv.lock, not production",
        "isolated_interpreter": bool(sys.flags.isolated),
        "installed": installed, "locked": locked, "findings": findings,
        "lock_only_packages": sorted(set(locked) - set(installed)),
        "note": "Lock-only packages may be conditional dependencies for other platforms.",
    }
    print(json.dumps(report, indent=2))
    return 1 if findings else 0


if __name__ == "__main__":
    try:
        sys.exit(audit())
    except Exception as error:
        print(json.dumps({"audit_status": "unavailable", "error": str(error)}), file=sys.stderr)
        sys.exit(2)
