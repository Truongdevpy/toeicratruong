from pathlib import Path

lines = Path("core/database.py").read_text(encoding="utf-8").splitlines()
for idx, l in enumerate(lines):
    if "def register_media" in l:
        print("\n".join(lines[idx:idx+35]))
        break
