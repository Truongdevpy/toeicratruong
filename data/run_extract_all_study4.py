import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import json
import sqlite3
import re
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import httpx
from bs4 import BeautifulSoup

base_dir = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data\study4")
db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
cookies_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\sessions\study4_cookies.json"

cookies = json.loads(Path(cookies_path).read_text(encoding="utf-8"))
cookies.pop("csrftoken", None)

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

# Map test_id -> part_ids
test_parts_map = {}
for t in lr_tests:
    tid = str(t["test_id"])
    found_parts = []
    # Hardcoded known part mapping for 6852
    if tid == "6852":
        found_parts = ['19042', '19043', '19044', '19045', '19046', '19047', '19048']
    else:
        for meta_file in base_dir.rglob("metadata.json"):
            try:
                m = json.loads(meta_file.read_text(encoding="utf-8"))
                if str(m.get("test_id")) == tid:
                    parts = m.get("parts", [])
                    found_parts = [str(p.get("part_id")) for p in parts if p.get("part_id")]
                    if len(found_parts) == 7:
                        break
            except Exception:
                pass
    test_parts_map[tid] = found_parts

print(f"Preparing to process {len(lr_tests)} Study4 LR tests...")
print(f"Tests with 7 parts: {sum(1 for p in test_parts_map.values() if len(p) == 7)}/{len(lr_tests)}")

def fetch_single_test_answers(test_info):
    t_id = str(test_info["test_id"])
    parts = test_parts_map.get(t_id)
    if not parts or len(parts) != 7:
        return t_id, False, "missing_parts", {}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    }

    try:
        with httpx.Client(cookies=cookies, follow_redirects=True, timeout=45) as client:
            params = [("part", str(pid)) for pid in parts]
            prac_url = f"https://study4.com/tests/{t_id}/practice/"
            r_prac = client.get(prac_url, params=params, headers=headers)
            soup_prac = BeautifulSoup(r_prac.text, "html.parser")
            form = soup_prac.find("form")
            if not form:
                return t_id, False, f"no_form_status_{r_prac.status_code}", {}

            post_data = {}
            for inp in form.find_all("input"):
                n = inp.get("name")
                v = inp.get("value", "")
                if n and n not in post_data:
                    post_data[n] = v

            action = form.get("action")
            act_url = f"https://study4.com{action}" if action.startswith("/") else action
            r_post = client.post(act_url, data=post_data, headers={"Referer": str(r_prac.url), "User-Agent": headers["User-Agent"]})

            details_url = str(r_post.url).rstrip("/") + "/details/"
            r_det = client.get(details_url, headers=headers)
            if r_det.status_code != 200:
                return t_id, False, f"details_status_{r_det.status_code}", {}

            soup_det = BeautifulSoup(r_det.text, "html.parser")
            q_wrappers = soup_det.find_all(id=re.compile(r"^question-wrapper-"))

            answers_data = {}
            for qw in q_wrappers:
                q_num_el = qw.find(class_=re.compile(r"question-number"))
                if not q_num_el:
                    continue
                try:
                    q_num = int(re.sub(r"\D", "", q_num_el.text.strip()))
                except Exception:
                    continue

                correct_ans = None
                c_inp = qw.find("input", class_="correct")
                if c_inp:
                    correct_ans = c_inp.get("value")
                else:
                    succ = qw.find(class_=re.compile(r"text-success"))
                    if succ:
                        m = re.search(r"Đáp án đúng:\s*([A-D])", succ.text)
                        if m:
                            correct_ans = m.group(1)

                expl_el = qw.find(class_=re.compile(r"explanation|solution", re.I))
                expl_txt = expl_el.get_text(separator="\n", strip=True) if expl_el else ""

                if correct_ans:
                    answers_data[q_num] = {
                        "correct_answer": correct_ans,
                        "explanation": expl_txt
                    }

            return t_id, True, "ok", answers_data
    except Exception as e:
        return t_id, False, str(e), {}

all_extracted_answers = {}
failed_tests = []

print("Starting concurrent extraction with 4 workers...")
start_time = time.time()
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(fetch_single_test_answers, t): t for t in lr_tests}
    for fut in as_completed(futures):
        t_id, ok, msg, ans_data = fut.result()
        if ok and len(ans_data) >= 150:
            all_extracted_answers[t_id] = ans_data
            print(f"  [SUCCESS] Test {t_id:<6}: Extracted {len(ans_data)}/200 answers")
        else:
            failed_tests.append((t_id, msg, len(ans_data)))
            print(f"  [FAILED]  Test {t_id:<6}: {msg} (extracted {len(ans_data)})")

elapsed = time.time() - start_time
print(f"\nExtraction complete in {elapsed:.1f}s!")
print(f"Total successful tests: {len(all_extracted_answers)}/{len(lr_tests)}")
if failed_tests:
    print(f"Failed tests: {failed_tests}")

# Save extracted cache to disk so we don't need to re-fetch
out_cache = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data\study4_answers_cache.json")
out_cache.write_text(json.dumps(all_extracted_answers, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Saved extracted answers cache to {out_cache} ({out_cache.stat().st_size} bytes)")

