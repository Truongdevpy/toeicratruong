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
    r = client.get('https://study4.com/tests/6852/toeic-lr-collection-1-test-1/results/38587579/')
    soup = BeautifulSoup(r.text, 'html.parser')
    
    # Save to file for thorough inspection
    open('sample_result.html', 'w', encoding='utf-8').write(r.text)
    print("Saved sample_result.html, length:", len(r.text))
    
    # Check question elements in results
    q_elems = soup.find_all(class_=lambda c: c and 'question' in c.lower())
    print("Question elements:", len(q_elems))
    for q in q_elems[:6]:
        print("---")
        print("Class:", q.get("class"))
        print("Text:", q.get_text(separator=' | ', strip=True)[:250])

