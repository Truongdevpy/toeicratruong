import httpx
from bs4 import BeautifulSoup

r = httpx.get("https://dauenglish.com", follow_redirects=True, timeout=15)
soup = BeautifulSoup(r.text, "html.parser")
scripts = [s.get("src") for s in soup.find_all("script") if s.get("src")]
links = [l.get("href") for l in soup.find_all("link") if l.get("href") and l.get("href").endswith(".js")]
print("Scripts:", scripts)
print("Links:", links)
