from pathlib import Path
import re

text = Path("core/database.py").read_text(encoding="utf-8")
idx = text.find("def upsert_media")
if idx != -1:
    print(text[idx:idx+800])
