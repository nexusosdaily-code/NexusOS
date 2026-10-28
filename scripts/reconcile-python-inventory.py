"""Compare scanner package name/version JSON with the selected interpreter.

Read-only; never imports the application or reads environment variables. Input
is a JSON list of {"name": ..., "version": ...} records, not scanner conclusions.
Absence here does not prove absence in production or another environment.
"""
import importlib.metadata as metadata
import json
from pathlib import Path
import sys
import tomllib


def reconcile(records):
    lock = tomllib.loads((Path(__file__).resolve().parents[1] / "uv.lock").read_text())
    locked = {p["name"]: p["version"] for p in lock["package"]}
    output = []
    for item in records:
        name, version = item["name"], item["version"]
        try:
            dist = metadata.distribution(name)
        except metadata.PackageNotFoundError:
            installed, location = None, None
        else:
            installed, location = dist.version, str(dist.locate_file(""))
        output.append({
            "name": name, "scanner_version": version,
            "active_version": installed, "active_location": location,
            "locked_version": locked.get(name),
            "status": "absent" if installed is None else
                      "matches" if installed == version else "version_mismatch",
        })
    return {
        "scope": "selected development interpreter and uv.lock, NOT production",
        "python": sys.version.split()[0],
        "isolated": bool(sys.flags.isolated),
        "packages": output,
        "warning": "Mismatches remain unresolved scanner provenance; not dismissed findings.",
    }


if __name__ == "__main__":
    try:
        records = json.load(sys.stdin)
        if not isinstance(records, list) or not all(
            isinstance(i, dict) and isinstance(i.get("name"), str)
            and isinstance(i.get("version"), str) for i in records
        ):
            raise ValueError("Expected a list of package name/version records")
        print(json.dumps(reconcile(records), indent=2))
    except Exception as error:
        print(json.dumps({"status": "unavailable", "error": str(error)}), file=sys.stderr)
        sys.exit(2)
