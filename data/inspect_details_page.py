import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import httpx
from bs4 import BeautifulSoup

cookies = json.loads(open('data/sessions/study4_cookies.json', encoding='utf-8').read())
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}
with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True, timeout=20) as client:
    r = client.get('https://study4.com/tests/6852/toeic-lr-collection-1-test-1/results/38587579/details/')
    print("Details status:", r.status_code)
    print("Details length:", len(r.text))
    open('sample_details.html', 'w', encoding='utf-8').write(r.text)
    
    soup = BeautifulSoup(r.text, 'html.parser')
    for idx, s in enumerate(soup.find_all('script')):
        if s.string and any(k in s.string.lower() for k in ['correct', 'answers', 'explanation', 'questions']):
            print(f"Script {idx}: {s.string[:300]}...")
            
    # Look for question explanation blocks
    expls = soup.find_all(class_=lambda c: c and any(k in c.lower() for k in ['explanation', 'solution', 'transcript', 'context']))
    print(f"\nExplanation/transcript blocks count: {len(expls)}")
    for e in expls[:4]:
        print("---")
        print("Class:", e.get("class"))
        print("Text:", e.get_text(separator=' | ', strip=True)[:300])

