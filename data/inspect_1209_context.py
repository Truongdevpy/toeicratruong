import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx, json, re
from bs4 import BeautifulSoup

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get("https://study4.com/tests/1209/start/", cookies=cookies, headers=headers, follow_redirects=True)
soup = BeautifulSoup(r.text, "html.parser")

for ctx in soup.find_all(class_="context-content"):
    imgs = ctx.find_all("img")
    if imgs:
        parent_group = ctx.find_parent(class_=re.compile("group|passage|section|row"))
        qnums = []
        if parent_group:
            qnums = [q.text.strip() for q in parent_group.find_all(class_="question-number")]
        else:
            # check siblings
            sib = ctx.find_next_sibling()
            if sib:
                qnums = [q.text.strip() for q in sib.find_all(class_="question-number")]
        print(f"Context with {len(imgs)} imgs -> Qs: {qnums}")
