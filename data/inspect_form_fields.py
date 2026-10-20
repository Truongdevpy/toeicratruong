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
    r = client.get('https://study4.com/tests/6852/practice/?part=19042')
    soup = BeautifulSoup(r.text, 'html.parser')
    form = soup.find('form')
    inputs = form.find_all('input')
    for inp in inputs:
        print(inp.get('name'), inp.get('type'), inp.get('value'))
