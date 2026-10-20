import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import sqlite3
import re
import time
from pathlib import Path
import httpx
from bs4 import BeautifulSoup

cookies_path = Path("data/sessions/study4_cookies.json")
cookies = json.loads(cookies_path.read_text(encoding="utf-8"))
cookies.pop("csrftoken", None)

cache_path = Path("data/study4_answers_cache.json")
if cache_path.exists():
    try: cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except: cache = {}
else:
    cache = {}

db_path = Path("data/crawler.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("""
    SELECT id, test_id, name, slug, collection_id
    FROM tests
    WHERE site='study4' AND slug NOT LIKE '%speaking%' AND slug NOT LIKE '%writing%'
    ORDER BY id
""")
lr_tests = [dict(r) for r in c.fetchall()]
conn.close()

print(f"Total Study4 LR tests: {len(lr_tests)}")

def parse_solutions_html(html):
    soup = BeautifulSoup(html, "html.parser")
    q_wrappers = soup.find_all(id=re.compile(r"^question-wrapper-"))
    ans_map = {}
    expl_map = {}
    for qw in q_wrappers:
        q_num_el = qw.find(class_=re.compile(r"question-number"))
        if not q_num_el: continue
        try: q_num = int(re.sub(r"\D", "", q_num_el.text.strip()))
        except: continue
        
        c_ans = None
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
        
        if c_ans and c_ans in ["A", "B", "C", "D"]:
            ans_map[str(q_num)] = c_ans
        if expl_txt:
            expl_map[str(q_num)] = expl_txt
            
    return ans_map, expl_map

headers = {"User-Agent": "Mozilla/5.0"}
success_count = 0

with httpx.Client(cookies=cookies, follow_redirects=True, timeout=35) as client:
    for idx, t in enumerate(lr_tests, 1):
        tid = str(t["test_id"])
        slug = t["slug"]
        name = t["name"]

        if tid in cache and len(cache[tid].get("answers", {})) >= 195:
            print(f"[{idx:2d}/{len(lr_tests)}] Test {tid:<6} ({name[:30]}): Already cached ({len(cache[tid]['answers'])} answers)")
            success_count += 1
            continue

        print(f"[{idx:2d}/{len(lr_tests)}] Fetching solutions for {tid:<6} ({name[:30]})...")
        url = f"https://study4.com/tests/{tid}/{slug}/solutions/"
        try:
            r = client.get(url, headers=headers)
            if r.status_code == 200:
                ans, expl = parse_solutions_html(r.text)
                if len(ans) >= 190:
                    print(f"       SUCCESS: Extracted {len(ans)}/200 answers, {len(expl)} explanations!")
                    cache[tid] = {"answers": ans, "explanations": expl}
                    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                    success_count += 1
                else:
                    print(f"       PARTIAL: Found only {len(ans)} answers on solutions page.")
            else:
                print(f"       HTTP error: {r.status_code}")
            time.sleep(0.6)
        except Exception as e:
            print(f"       Exception: {e}")
            time.sleep(1.0)

print(f"\nAll tests completed! Total with full answers: {success_count}/{len(lr_tests)}")

