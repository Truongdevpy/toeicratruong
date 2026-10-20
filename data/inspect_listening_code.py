import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

r = httpx.get("https://dauenglish.com/assets/ListeningPracticeLoader-DxCPXPVJ.js", timeout=15)
text = r.text
for m in re.finditer(r"listening_items", text):
    start = max(0, m.start() - 200)
    end = min(len(text), m.end() + 200)
    print("--- MATCH ---")
    print(text[start:end])
