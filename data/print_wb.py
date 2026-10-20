from pathlib import Path
import re

text = Path("temp_js/index-laDVicvl.js").read_text(encoding="utf-8")
idx = text.find("function Wb(")
print(text[idx:idx+600])
