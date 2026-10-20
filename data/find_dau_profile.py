import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
from pathlib import Path

user_data = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
for p in user_data.glob("Profile */Local Storage/leveldb"):
    for f in p.glob("*.ldb"):
        try:
            data = f.read_bytes()
            if b"dauenglish.com" in data:
                print(f"Found dauenglish.com in {p.parent.parent.name}/{f.name}")
        except Exception:
            pass
