import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx, json, re
from bs4 import BeautifulSoup

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get("https://study4.com/tests/1209/start/", cookies=cookies, headers=headers, follow_redirects=True)
soup = BeautifulSoup(r.text, "html.parser")

img_nodes = soup.find_all("img")
for img in img_nodes:
    src = img.get("src") or img.get("data-src")
    if src and "gg_imgs" in src:
        parent = img.parent
        print(f"Img: {src.split('/')[-1]} | Parent tag: {parent.name}, class: {parent.get('class')}")
        # Look for question numbers nearby
        wrapper = img.find_parent(class_=re.compile("wrapper|group|context|question"))
        if wrapper:
            print(f"  Enclosing wrapper class: {wrapper.get('class')}")
            # find question numbers inside or following
            qnums = [q.text.strip() for q in wrapper.find_all(class_="question-number")]
            print(f"  Qnums inside wrapper: {qnums}")
