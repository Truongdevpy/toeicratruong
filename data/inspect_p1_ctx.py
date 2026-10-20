import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx, json, re
from bs4 import BeautifulSoup

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get("https://study4.com/tests/1209/start/", cookies=cookies, headers=headers, follow_redirects=True)
soup = BeautifulSoup(r.text, "html.parser")

for idx, ctx in enumerate(soup.find_all(class_="context-content")[:6], 1):
    parent = ctx.parent
    print(f"Part 1 ctx {idx}: parent={parent.name}, class={parent.get('class')}")
    # find question-number
    q_elem = parent.find(class_="question-number") or ctx.find(class_="question-number") or parent.parent.find(class_="question-number")
    print(f"  q_elem: {q_elem.text.strip() if q_elem else None}")
