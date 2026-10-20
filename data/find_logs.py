import os
from pathlib import Path

p = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
for root, dirs, files in os.walk(p):
    if "leveldb" in root.lower():
        for f in files:
            if f.endswith(".log"):
                fp = Path(root) / f
                print(f"{fp} ({fp.stat().st_size} bytes)")
