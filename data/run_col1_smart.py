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
    try: cache = json.loads(cache_path.read_text(encoding="utf-8"))
    except: cache = {}
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
            slug = m.get("slug", "")
            parts = [str(p.get("part_id")) for p in m.get("parts", []) if p.get("part_id")]
            if tid == "6852":
                parts = ['19042', '19043', '19044', '19045', '19046', '19047', '19048']
            tests_to_run.append((tid, m.get("name", tid), slug, parts))

print(f"Collection 1: {len(tests_to_run)} tests")

def parse_wrappers(html):
    soup = BeautifulSoup(html, "html.parser")
    q_wrappers = soup.find_all(id=re.compile(r"^question-wrapper-"))
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

        if correct_ans: ans_map[str(q_num)] = correct_ans
        if expl_txt: expl_map[str(q_num)] = expl_txt
    return ans_map, expl_map

headers = {"User-Agent": "Mozilla/5.0"}
with httpx.Client(cookies=cookies, follow_redirects=True, timeout=35) as client:
    for tid, name, slug, parts in tests_to_run:
        if tid in cache and len(cache[tid].get("answers", {})) >= 195:
            print(f"Test {tid} ({name}): Already cached ({len(cache[tid]['answers'])} answers)")
            continue

        print(f"Processing {tid} ({name})...")
        try:
            # 1. Check landing page for existing result
            landing_url = f"https://study4.com/tests/{tid}/{slug}/" if slug else f"https://study4.com/tests/{tid}/"
            r_land = client.get(landing_url, headers=headers)
            soup_land = BeautifulSoup(r_land.text, "html.parser")
            res_link = soup_land.find("a", href=lambda h: h and "/results/" in h)
            
            got_answers = False
            if res_link:
                href = res_link.get("href")
                details_url = "https://study4.com" + href.rstrip("/") + "/details/"
                print(f"  Found previous result: {details_url}")
                r_det = client.get(details_url, headers=headers)
                if r_det.status_code == 200:
                    ans, expl = parse_wrappers(r_det.text)
                    if len(ans) >= 195:
                        print(f"  --> Extracted {len(ans)} answers from existing result!")
                        cache[tid] = {"answers": ans, "explanations": expl}
                        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                        got_answers = True

            if not got_answers and parts:
                # 2. Do practice submission
                params = [("part", str(pid)) for pid in parts]
                prac_url = f"https://study4.com/tests/{tid}/practice/"
                r_prac = client.get(prac_url, params=params, headers=headers)
                soup_prac = BeautifulSoup(r_prac.text, "html.parser")
                form = soup_prac.find("form")
                if form:
                    post_data = {}
                    for inp in form.find_all("input"):
                        n = inp.get("name")
                        v = inp.get("value", "")
                        if n and n not in post_data: post_data[n] = v
                    act = form.get("action")
                    act_url = f"https://study4.com{act}" if act.startswith("/") else act
                    r_post = client.post(act_url, data=post_data, headers={"Referer": str(r_prac.url), "User-Agent": "Mozilla/5.0"})
                    if "/results/" in str(r_post.url):
                        details_url = str(r_post.url).rstrip("/") + "/details/"
                        r_det = client.get(details_url, headers=headers)
                        if r_det.status_code == 200:
                            ans, expl = parse_wrappers(r_det.text)
                            if len(ans) >= 195:
                                print(f"  --> Extracted {len(ans)} answers from new submission!")
                                cache[tid] = {"answers": ans, "explanations": expl}
                                cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                                got_answers = True

            time.sleep(1.0)
        except Exception as e:
            print(f"  Error on {tid}: {e}")
            time.sleep(1.0)

print(f"\nFinished! Total in cache: {len(cache)}")

