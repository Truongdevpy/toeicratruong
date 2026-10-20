import sys
sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path

for p in Path("temp_js").glob("*.js"):
    text = p.read_text(encoding="utf-8", errors="ignore")
    if 'Chinh phục TOEIC Reading' in text or 'Chinh phục TOEIC Listening' in text or 'Theo dạng câu hỏi' in text or 'theo dạng tranh' in text.lower():
        print("Match found:", p.name)
