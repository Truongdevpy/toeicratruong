import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import httpx
from bs4 import BeautifulSoup
import re

cookies = json.loads(open('data/sessions/study4_cookies.json', encoding='utf-8').read())
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}
with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True, timeout=20) as client:
    r = client.get('https://study4.com/tests/6852/practice/?part=19042')
    soup = BeautifulSoup(r.text, 'html.parser')
    
    # Check for scripts with test data
    scripts = soup.find_all('script')
    for idx, s in enumerate(scripts):
        if s.string and any(k in s.string.lower() for k in ['questions', 'answers', 'keys', 'testdetail', 'solution']):
            print(f"Script {idx}: {s.string[:300]}...")
            
    # Check question items
    q_items = soup.find_all(class_=re.compile(r"question", re.I))
    print(f"\nQuestion elements count: {len(q_items)}")
    if q_items:
        first = q_items[0]
        print("First question element classes:", first.get("class"))
        print("First question text:\n", first.get_text(separator=' ', strip=True)[:400])
        # Look for inputs, answers, data attributes
        inputs = first.find_all('input')
        print("Inputs in first question:", [(i.get('name'), i.get('value'), i.get('data-correct'), i.get('data-answer')) for i in inputs])

    # Check for form submission or solution buttons
    forms = soup.find_all('form')
    for f in forms:
        print("Form action:", f.get("action"), "id:", f.get("id"), "method:", f.get("method"))
        
