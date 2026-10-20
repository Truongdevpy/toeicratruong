
import httpx
from bs4 import BeautifulSoup
import re

for url in ['https://dautoeic.vn', 'https://dauenglish.com']:
    print('Checking', url)
    try:
        r = httpx.get(url, follow_redirects=True, timeout=15)
        soup = BeautifulSoup(r.text, 'html.parser')
        scripts = [s.get('src') for s in soup.find_all('script') if s.get('src')]
        print(f'{url} scripts count: {len(scripts)}')
        for s in scripts:
            print('  ', s)
    except Exception as e:
        print(e)
