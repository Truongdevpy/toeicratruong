import sys
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup

soup = BeautifulSoup(open('sample_details.html', encoding='utf-8').read(), 'html.parser')
qw = soup.find(id='question-wrapper-310881')
print(qw.prettify())
