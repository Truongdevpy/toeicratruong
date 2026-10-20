import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx, json, re
from bs4 import BeautifulSoup

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {"User-Agent": "Mozilla/5.0"}
r = httpx.get("https://study4.com/tests/1209/start/", cookies=cookies, headers=headers, follow_redirects=True)
soup = BeautifulSoup(r.text, "html.parser")

all_imgs = [img.get("src") or img.get("data-src") for img in soup.find_all("img")]
test_imgs = [i for i in all_imgs if i and ("s4-media" in i or "media" in i) and not any(x in i for x in ["logo", "zalo", "messenger", "icon"])]
print(f"Total test images in test 1209: {len(test_imgs)}")
for idx, img in enumerate(test_imgs):
    print(f"  {idx+1}: {img}")
