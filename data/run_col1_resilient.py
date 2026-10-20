import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import httpx
from bs4 import BeautifulSoup
import re
import time
from pathlib import Path

cookies_path = Path("data/sessions/study4_cookies.json")
cookies = json.loads(cookies_path.read_text(encoding="utf-8"))
cookies.pop("csrftoken", None)

cache_path = Path("data/study4_answers_cache.json")
if cache_path.exists():
    try:
        cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except:
        cache = {}
else:
    cache = {}

base_dir = Path("data/study4/Toeic_Lr_Collection_1")
tests_to_run = []
for test_dir in sorted(base_dir.iterdir()):
    if test_dir.is_dir():
        meta_file = test_dir / "metadata.json"
        if meta_file.exists():
            m = json.loads(meta_file.read_text(encoding="utf-8"))
            tid = str(m.get("test_id"))
            parts = [str(p.get("part_id")) for p in m.get("parts", []) if p.get("part_id")]
            if tid == "6852":
                parts = ['19042', '19043', '19044', '19045', '19046', '19047', '19048']
            if len(parts) == 7:
                tests_to_run.append((tid, m.get("name", tid), parts))

print(f"Collection 1: {len(tests_to_run)} tests to process")

with httpx.Client(cookies=cookies, follow_redirects=True, timeout=35) as client:
    for tid, name, parts in tests_to_run:
        if tid in cache and len(cache[tid].get("answers", {})) >= 195:
            print(f"Test {tid} ({name}): Already in cache ({len(cache[tid]['answers'])} answers), skipping.")
            continue

        print(f"Extracting {tid} ({name})...")
        max_retries = 3
        for attempt in range(max_retries):
            try:
                params = [("part", str(pid)) for pid in parts]
                prac_url = f"https://study4.com/tests/{tid}/practice/"
                r_prac = client.get(prac_url, params=params, headers={"User-Agent": "Mozilla/5.0"})
                if r_prac.status_code == 429:
                    print(f"  Got 429 rate limit, sleeping 15s (attempt {attempt+1}/{max_retries})...")
                    time.sleep(15)
                    continue

                soup_prac = BeautifulSoup(r_prac.text, "html.parser")
                form = soup_prac.find("form")
                if not form:
                    print(f"  No form found on practice page (status {r_prac.status_code})")
                    break

                post_data = {}
                for inp in form.find_all("input"):
                    n = inp.get("name")
                    v = inp.get("value", "")
                    if n and n not in post_data:
                        post_data[n] = v

                action = form.get("action")
                act_url = f"https://study4.com{action}" if action.startswith("/") else action
                r_post = client.post(act_url, data=post_data, headers={"Referer": str(r_prac.url), "User-Agent": "Mozilla/5.0"})

                details_url = str(r_post.url).rstrip("/") + "/details/"
                r_det = client.get(details_url, headers={"User-Agent": "Mozilla/5.0"})

                soup_det = BeautifulSoup(r_det.text, "html.parser")
                q_wrappers = soup_det.find_all(id=re.compile(r"^question-wrapper-"))

                ans_map = {}
                expl_map = {}
                for qw in q_wrappers:
                    q_num_el = qw.find(class_=re.compile(r"question-number"))
                    if not q_num_el: continue
                    try: q_num = int(re.sub(r"\D", "", q_num_el.text.strip()))
                    except: continue

                    correct_ans = None
                    c_inp = qw.find("input", class_="correct")
                    if c_inp: correct_ans = c_inp.get("value")
                    else:
                        succ = qw.find(class_=re.compile(r"text-success"))
                        if succ:
                            m = re.search(r"Đáp án đúng:\s*([A-D])", succ.text)
                            if m: correct_ans = m.group(1)

                    expl_el = qw.find(class_=re.compile(r"explanation|solution", re.I))
                    expl_txt = expl_el.get_text(separator="\n", strip=True) if expl_el else ""

                    if correct_ans:
                        ans_map[str(q_num)] = correct_ans
                    if expl_txt:
                        expl_map[str(q_num)] = expl_txt

                if len(ans_map) >= 195:
                    print(f"  SUCCESS: Extracted {len(ans_map)}/200 answers, {len(expl_map)} explanations")
                    cache[tid] = {"answers": ans_map, "explanations": expl_map}
                    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                    time.sleep(2.0)
                    break
                else:
                    print(f"  Only {len(ans_map)} answers found, retrying...")
                    time.sleep(5)
            except Exception as e:
                print(f"  Exception: {e}")
                time.sleep(5)

print("\nCollection 1 extraction pass complete!")

