import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx, json, re
from bs4 import BeautifulSoup

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get("https://study4.com/tests/1209/start/", cookies=cookies, headers=headers, follow_redirects=True)
soup = BeautifulSoup(r.text, "html.parser")

for qnum in [63, 66, 69, 92, 95, 100]:
    for item in soup.find_all(class_="question-item-wrapper"):
        if f"{qnum}" in (item.find(class_="question-number").text if item.find(class_="question-number") else ""):
            parent = item.parent
            parent_imgs = [img.get("src") or img.get("data-src") for img in parent.find_all("img")]
            context = item.find_previous(class_=re.compile("context|passage|group"))
            ctx_imgs = [img.get("src") or img.get("data-src") for img in context.find_all("img")] if context else []
            print(f"Q{qnum}: parent_imgs={parent_imgs} ctx_imgs={ctx_imgs}")
