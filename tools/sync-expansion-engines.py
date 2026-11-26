#!/usr/bin/env python3
"""Keep the four shared browser/server rule modules byte-identical."""
from pathlib import Path
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
options = parser.parse_args()
root = Path(__file__).resolve().parents[1]
assets = root / "app/src/main/assets"
target = root / "chiodo-server/games"
names = ["expansion-tricks.js", "expansion-table.js", "expansion-party.js", "expansion-session.js"]
if not options.check:
    target.mkdir(parents=True, exist_ok=True)
for name in names:
    content = (assets / name).read_bytes()
    dest = target / name
    if options.check:
        if not dest.exists() or dest.read_bytes() != content:
            raise SystemExit("Shared module differs: " + name)
    else:
        dest.write_bytes(content)
print("Four shared game modules " + ("verified" if options.check else "synchronized"))
