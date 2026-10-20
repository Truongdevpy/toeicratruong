import sys
sys.stdout.reconfigure(encoding="utf-8")
from bs4 import BeautifulSoup
import re

soup = BeautifulSoup(open('sample_details.html', encoding='utf-8').read(), 'html.parser')

q_wrappers = soup.find_all(id=re.compile(r"^question-wrapper-"))
print(f"Total question wrappers found: {len(q_wrappers)}")

for idx, qw in enumerate(q_wrappers[:3]):
    print(f"\n================ Question Wrapper {idx+1} ================")
    print("ID:", qw.get("id"))
    
    # Check question number
    q_num = qw.find(class_=re.compile(r"question-number"))
    print("Question number:", q_num.text.strip() if q_num else None)
    
    # Check correct answer marker
    # Often marked with class like 'text-correct', 'is-correct', 'badge-success', or check inputs
    correct_elem = qw.find(class_=re.compile(r"correct|answer", re.I))
    if correct_elem:
        print("Correct elem:", correct_elem.get("class"), correct_elem.text.strip())
        
    # Check options and radio buttons/labels
    for opt in qw.find_all(class_=re.compile(r"form-check|option")):
        print("  Option elem:", opt.get("class"), opt.text.strip())
        
    # Check explanation block
    expl = qw.find(class_=re.compile(r"explanation|solution", re.I))
    if expl:
        print("Explanation:", expl.text.strip()[:300])

