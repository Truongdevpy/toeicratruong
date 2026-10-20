import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
import sqlite3
from pathlib import Path
from collections import defaultdict

data_root = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data")
mock_dir = data_root / "web_ready" / "mock_tests"
mock_dir.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(data_root / "crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Load study4 answers cache
cache_path = Path("data/study4_answers_cache.json")
study4_cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

# Load downloads map
c.execute("SELECT url, local_path FROM downloads WHERE status='completed'")
downloads_map = dict(c.fetchall())

# Load all tests
c.execute("SELECT * FROM tests ORDER BY site, id")
all_tests = [dict(r) for r in c.fetchall()]

# Load all passages
c.execute("SELECT * FROM passages ORDER BY site, test_id, part, order_index")
all_passages = [dict(r) for r in c.fetchall()]
passages_by_test = defaultdict(list)
for p in all_passages:
    passages_by_test[p["test_id"]].append(p)

# Load all questions
c.execute("SELECT * FROM questions ORDER BY site, test_id, part, question_number")
all_questions = [dict(r) for r in c.fetchall()]
questions_by_test = defaultdict(list)
for q in all_questions:
    questions_by_test[q["test_id"]].append(q)

conn.close()

# Vol 2 mapping helper
vol2_base = data_root / "dautoeic" / "Crack_TOEIC_Vol_2"
vol2_tests_map = {
    "dautoeic_832b2e18-2fd4-444c-b47b-2fcf76812b17": 1,
    "832b2e18-2fd4-444c-b47b-2fcf76812b17": 1,
    "dautoeic_38a433d0-d5eb-4361-81ef-5f60ee876686": 2,
    "38a433d0-d5eb-4361-81ef-5f60ee876686": 2,
    "dautoeic_4062ab44-9abe-4daf-b32d-217402370f27": 3,
    "4062ab44-9abe-4daf-b32d-217402370f27": 3,
    "dautoeic_220ee419-fb7d-4005-9142-af7070cdac57": 4,
    "220ee419-fb7d-4005-9142-af7070cdac57": 4,
    "dautoeic_bc41ac36-33e7-49de-8048-fb47ef4e2d16": 5,
    "bc41ac36-33e7-49de-8048-fb47ef4e2d16": 5,
    "dautoeic_be9cd952-e762-444f-9a79-492933d4a930": 6,
    "be9cd952-e762-444f-9a79-492933d4a930": 6,
    "dautoeic_5bf7beef-625d-4827-9c21-1f935b461ebc": 7,
    "5bf7beef-625d-4827-9c21-1f935b461ebc": 7,
    "dautoeic_eac1356a-5f1a-43e9-9f9d-8f8c51d5be69": 8,
    "eac1356a-5f1a-43e9-9f9d-8f8c51d5be69": 8,
    "dautoeic_9a4ed8fa-609c-4ed0-90a9-346938b798b7": 9,
    "9a4ed8fa-609c-4ed0-90a9-346938b798b7": 9,
    "dautoeic_44ee4233-6c74-4343-b518-8f51240c719e": 10,
    "44ee4233-6c74-4343-b518-8f51240c719e": 10,
}

# Study4 media scan
study4_media_dir = data_root / "media" / "study4"
study4_audio_files = list(study4_media_dir.rglob("*.mp3"))

def get_study4_overall_audio(test_name, slug):
    slug_norm = slug.lower().replace("-", "_")
    for f in study4_audio_files:
        fn_low = f.name.lower()
        if slug_norm in fn_low or (slug.lower() in fn_low):
            rel = os.path.relpath(f, data_root / "media").replace("\\", "/")
            return f"/media/{rel}"
    # Fallback to test name keywords
    for word in slug.split("-"):
        if len(word) > 4:
            for f in study4_audio_files:
                if word.lower() in f.name.lower():
                    rel = os.path.relpath(f, data_root / "media").replace("\\", "/")
                    return f"/media/{rel}"
    return None

test_catalog = []
packaged_count = 0

for t in all_tests:
    t_id = t["id"]
    t_num_id = t["test_id"]
    t_site = t["site"]
    slug = t["slug"]
    name = t["name"]

    q_list = questions_by_test.get(t_id, []) or questions_by_test.get(t_num_id, [])
    p_list = passages_by_test.get(t_id, []) or passages_by_test.get(t_num_id, [])

    test_type = "lr_full"
    if "speaking" in slug.lower():
        test_type = "sw_speaking"
        duration_minutes = 20
    elif "writing" in slug.lower():
        test_type = "sw_writing"
        duration_minutes = 60
    else:
        duration_minutes = 120

    # Build clean name
    clean_name = name
    year = 2026
    if "2024" in name or "2024" in slug: year = 2024
    elif "2023" in name or "2023" in slug: year = 2023
    elif "2022" in name or "2022" in slug: year = 2022
    elif "old" in slug.lower(): year = 2020

    if t_site == "dautoeic":
        vol2_idx = vol2_tests_map.get(t_id) or vol2_tests_map.get(t_num_id)
        if vol2_idx:
            clean_name = f"Crack TOEIC Vol 2 - Test {vol2_idx:02d} (Full 200 câu)"
        else:
            clean_name = f"ETS TOEIC Practice Test ({t_num_id[:8]})"

    # Pre-map Vol 2 media if this is Crack TOEIC Vol 2
    vol2_idx = vol2_tests_map.get(t_id) or vol2_tests_map.get(t_num_id)
    v2_aud_map = {}
    v2_img_map = {}
    if vol2_idx:
        tdir = vol2_base / f"Test_{vol2_idx}"
        if tdir.exists():
            for f in (tdir / "audio").rglob("*.*"):
                m = re.match(r"^(\d{3})_audio", f.name)
                if m:
                    base_qn = int(m.group(1))
                    rel = os.path.relpath(f, data_root / "dautoeic").replace("\\", "/")
                    web_url = f"/dautoeic_media/{rel}"
                    if base_qn <= 31:
                        v2_aud_map[base_qn] = web_url
                    else:
                        # 3 questions per conversation/talk
                        for sub_q in range(base_qn, base_qn + 3):
                            v2_aud_map[sub_q] = web_url

            for f in (tdir / "images").glob("*.*"):
                m = re.match(r"^(\d{3})_image", f.name)
                if m:
                    base_qn = int(m.group(1))
                    rel = os.path.relpath(f, data_root / "dautoeic").replace("\\", "/")
                    web_url = f"/dautoeic_media/{rel}"
                    if base_qn <= 6:
                        v2_img_map[base_qn] = web_url
                    else:
                        for sub_q in range(base_qn, base_qn + 3):
                            v2_img_map[sub_q] = web_url

    # Check overall audio for Study4
    overall_audio = None
    if t_site == "study4" and test_type == "lr_full":
        overall_audio = get_study4_overall_audio(name, slug)

    # Process questions
    packaged_qs = []
    # If study4, get answers from cache
    s4_ans_entry = study4_cache.get(str(t_num_id), {})
    s4_answers = s4_ans_entry.get("answers", {})
    s4_expls = s4_ans_entry.get("explanations", {})

    for idx, q in enumerate(q_list, 1):
        qn = q.get("question_number", idx)
        part = q.get("part", 1)
        q_id = q.get("id") or f"{t_id}_{qn}"

        # Adjust Speaking/Writing part numbers
        if test_type == "sw_speaking":
            if qn in (1, 2): part = 1
            elif qn in (3, 4): part = 2
            elif qn in (5, 6, 7): part = 3
            elif qn in (8, 9, 10): part = 4
            elif qn == 11: part = 5
        elif test_type == "sw_writing":
            if qn <= 5: part = 1
            elif qn in (6, 7): part = 2
            elif qn == 8: part = 3

        # Correct answer & explanation
        ans = q.get("correct_answer") or ""
        expl = q.get("explanation") or ""

        if t_site == "study4" and test_type == "lr_full":
            if str(qn) in s4_answers:
                ans = s4_answers[str(qn)]
            if str(qn) in s4_expls and not expl:
                expl = s4_expls[str(qn)]

        # Audio and Image resolution
        q_audio = None
        q_image = None

        if vol2_idx:
            q_audio = v2_aud_map.get(qn)
            q_image = v2_img_map.get(qn)
        else:
            # Check local path in downloads
            raw_aud = q.get("audio_url")
            raw_img = q.get("image_url")

            if raw_aud:
                loc_a = downloads_map.get(raw_aud) or raw_aud
                if loc_a and os.path.exists(loc_a):
                    clean_a = str(loc_a).replace("\\", "/")
                    if "data/dautoeic/" in clean_a:
                        q_audio = f"/dautoeic_media/{clean_a.split('data/dautoeic/')[1]}"
                    elif "data/media/" in clean_a:
                        q_audio = f"/media/{clean_a.split('data/media/')[1]}"
                    else:
                        q_audio = f"/data/{clean_a.split('data/')[1]}" if "data/" in clean_a else clean_a
                elif raw_aud.startswith("http"):
                    q_audio = raw_aud

            if raw_img:
                loc_i = downloads_map.get(raw_img) or raw_img
                if loc_i and os.path.exists(loc_i):
                    clean_i = str(loc_i).replace("\\", "/")
                    if "data/dautoeic/" in clean_i:
                        q_image = f"/dautoeic_media/{clean_i.split('data/dautoeic/')[1]}"
                    elif "data/media/" in clean_i:
                        q_image = f"/media/{clean_i.split('data/media/')[1]}"
                    else:
                        q_image = f"/data/{clean_i.split('data/')[1]}" if "data/" in clean_i else clean_i
                elif raw_img.startswith("http"):
                    q_image = raw_img

        # Options
        options = {
            "A": q.get("option_a") or "",
            "B": q.get("option_b") or "",
            "C": q.get("option_c") or "",
            "D": q.get("option_d") or ""
        }
        if part == 2 and not options["D"]:
            options.pop("D", None)

        packaged_qs.append({
            "id": q_id,
            "part": part,
            "question_number": qn,
            "question_type": q.get("question_type") or f"Part {part}",
            "question_text": q.get("question_text") or f"Câu hỏi {qn}",
            "passage_text": q.get("passage_text") or "",
            "options": options,
            "option_a": options.get("A"),
            "option_b": options.get("B"),
            "option_c": options.get("C"),
            "option_d": options.get("D"),
            "correct_answer": ans,
            "explanation": expl,
            "instruction_translation": q.get("instruction") or "",
            "audio_url": q_audio,
            "local_audio": q_audio,
            "image_url": q_image,
            "local_image": q_image
        })

    meta = {
        "id": t_id,
        "test_id": t_num_id,
        "site": t_site,
        "name": clean_name,
        "slug": slug,
        "collection_id": t["collection_id"],
        "total_questions": len(packaged_qs),
        "duration_minutes": duration_minutes,
        "test_type": test_type,
        "file_name": f"{t_id}.json",
        "year": year,
        "overall_audio": overall_audio
    }
    test_catalog.append(meta)

    package = {
        "meta": meta,
        "overall_audio": overall_audio,
        "passages": p_list,
        "questions": packaged_qs
    }

    out_file = mock_dir / f"{t_id}.json"
    out_file.write_text(json.dumps(package, ensure_ascii=False, indent=2), encoding="utf-8")
    packaged_count += 1

(data_root / "web_ready" / "tests_catalog.json").write_text(json.dumps(test_catalog, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"\n================ SUMMARY ================")
print(f"Total packaged tests: {packaged_count}")
print(f"Catalog saved to {data_root / 'web_ready' / 'tests_catalog.json'}")

# Verify answer completeness
lr_pkgs = [t for t in test_catalog if t["test_type"] == "lr_full"]
print(f"Total LR tests: {len(lr_pkgs)}")

zero_ans = 0
full_ans = 0
for t in lr_pkgs:
    pf = mock_dir / f"{t['id']}.json"
    pdata = json.loads(pf.read_text(encoding="utf-8"))
    with_a = sum(1 for q in pdata["questions"] if q.get("correct_answer"))
    if with_a == len(pdata["questions"]):
        full_ans += 1
    elif with_a == 0:
        zero_ans += 1

print(f"LR Tests with 100% authentic answers: {full_ans}/{len(lr_pkgs)} ({full_ans/len(lr_pkgs)*100:.1f}%)")
print(f"LR Tests with zero answers: {zero_ans}/{len(lr_pkgs)}")

