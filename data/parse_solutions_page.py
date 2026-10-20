import sys
sys.stdout.reconfigure(encoding="utf-8")
import json, httpx
from bs4 import BeautifulSoup
import re

cookies = json.loads(open('data/sessions/study4_cookies.json', encoding='utf-8').read())
cookies.pop('csrftoken', None)

with httpx.Client(cookies=cookies, follow_redirects=True, timeout=30) as client:
    r = client.get('https://study4.com/tests/6854/toeic-lr-collection-1-test-3/solutions/', headers={'User-Agent': 'Mozilla/5.0'})
    soup = BeautifulSoup(r.text, 'html.parser')
    q_wrappers = soup.find_all(id=re.compile(r"^question-wrapper-"))
    print("Question wrappers:", len(q_wrappers))
    
    answers = {}
    explanations = {}
    for qw in q_wrappers:
        q_num_el = qw.find(class_=re.compile(r"question-number"))
        if not q_num_el: continue
        try: q_num = int(re.sub(r"\D", "", q_num_el.text.strip()))
        except: continue
        
        # In solutions page, check how the correct answer is marked
        c_ans = None
        # Check input.correct or text-success or badge or strong
        succ = qw.find(class_=re.compile(r"text-success|badge-success|correct"))
        if succ:
            m = re.search(r"Đáp án đúng:\s*([A-D])|([A-D])", succ.text.strip())
            if m:
                c_ans = m.group(1) or m.group(2)
        if not c_ans:
            c_inp = qw.find("input", class_=re.compile(r"correct"))
            if c_inp: c_ans = c_inp.get("value")
            
        expl_el = qw.find(class_=re.compile(r"explanation|solution", re.I))
        expl_txt = expl_el.get_text(separator="\n", strip=True) if expl_el else ""
        
        if c_ans: answers[q_num] = c_ans
        if expl_txt: explanations[q_num] = expl_txt
        
    print(f"Extracted {len(answers)}/200 answers from solutions page!")
    print("Answers sample Q1-Q10:", [answers.get(i) for i in range(1, 11)])
    print("Distribution:", {k: list(answers.values()).count(k) for k in ["A", "B", "C", "D"]})

