import sys
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup
import re

soup = BeautifulSoup(open("sample_details.html", encoding="utf-8").read(), "html.parser")
# Check how transcripts are shown
contexts = soup.find_all(class_=re.compile(r"context-wrapper|context-content|collapse"))
print(f"Context blocks: {len(contexts)}")
for c in contexts[:5]:
    t = c.get_text(separator=' ', strip=True)
    if len(t) > 20:
        print("  Context text:", t[:120])

