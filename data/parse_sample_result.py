import sys
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup
import re

soup = BeautifulSoup(open('sample_result.html', encoding='utf-8').read(), 'html.parser')

# Check links or buttons for "xem đáp án" or "chi tiết"
links = soup.find_all('a', href=True)
for a in links:
    if any(k in a.text.lower() or k in a.get('href', '').lower() for k in ['đáp án', 'giải thích', 'detail', 'review', 'solution', 'attempt']):
        print("Relevant link:", a.text.strip(), "->", a.get('href'))

# Check scripts in sample_result.html
for idx, s in enumerate(soup.find_all('script')):
    if s.string and any(k in s.string.lower() for k in ['correct', 'answers', 'explanation', 'questions', 'results']):
        print(f"\nScript {idx} (len {len(s.string)}):")
        print(s.string[:500])

