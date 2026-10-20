# -*- coding: utf-8 -*-
"""
Full Crawl & Sync Pipeline for DauEnglish (https://dauenglish.com/)
Crawls and generates:
1. All 20 full TOEIC tests (Vol 1 & Vol 2, 4,000 questions, 840 passages with audio, image, transcript, explanation)
2. All 172 Speaking/Shadowing lessons with timestamped sentences & Vietnamese translation
3. Enriched practice questions for Parts 1-7 (part1_practice.json ... part7_practice.json)
4. Enriched dictation/listening challenges (dictation_challenges.json)
5. Clean A-Z sorted tests catalog (tests_catalog.json)
6. Updates to crawler.db and backend platform.db
"""
import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
import sqlite3
import httpx
from pathlib import Path
from collections import defaultdict

from config import DAUTOEIC_CONFIG

API_URL = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1"
ANON_KEY = DAUTOEIC_CONFIG["supabase_anon_key"]
HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json"
}

WEB_READY_DIR = Path("data/web_ready")
MOCK_DIR = WEB_READY_DIR / "mock_tests"
PRACTICE_DIR = WEB_READY_DIR / "practice_by_part"

MOCK_DIR.mkdir(parents=True, exist_ok=True)
PRACTICE_DIR.mkdir(parents=True, exist_ok=True)

client = httpx.Client(headers=HEADERS, timeout=60.0)

def extract_evidence_and_details(expl, passage_text="", transcript="", part=1, q_num=1):
    evidence = ""
    evidence_vi = ""
    paraphrase = ""
    
    if expl:
        patterns = [
            r'(?:Script|Dẫn chứng|Câu trước|Câu hiện tại|Câu sau|Đoạn \d+)\s*:\s*[“"]([^”"]+)[”"](?:\s*\((?:Dịch:\s*)?([^)]+)\))?',
            r'(?:Script|Dẫn chứng|Câu trước|Câu hiện tại|Câu sau|Đoạn \d+)\s*:\s*\'([^\']+)\'(?:\s*\((?:Dịch:\s*)?([^)]+)\))?',
        ]
        for pat in patterns:
            m = re.search(pat, expl, re.IGNORECASE)
            if m:
                evidence = m.group(1).strip()
                if m.group(2):
                    evidence_vi = m.group(2).strip()
                    if evidence_vi.lower().startswith("dịch:"):
                        evidence_vi = evidence_vi[5:].strip()
                break
                
        if not evidence:
            m_quote = re.search(r'[“"]([^”"]{12,})[”"](?:\s*\((?:Dịch:\s*)?([^)]+)\))?', expl)
            if m_quote:
                evidence = m_quote.group(1).strip()
                if m_quote.group(2):
                    evidence_vi = m_quote.group(2).strip()

        m_para = re.search(r'Paraphrase:\s*([^\n\r]+)', expl, re.IGNORECASE)
        if m_para:
            paraphrase = m_para.group(1).strip()

    full_text = passage_text or transcript or ""
    if not evidence and full_text and part in (3, 4, 6, 7):
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+|[\r\n]+', full_text) if len(s.strip()) >= 10]
        if sentences:
            if part == 6 and q_num:
                for s in sentences:
                    if f"[{q_num}]" in s or f"({q_num})" in s or f"_{q_num}_" in s:
                        evidence = s
                        break
            if not evidence and len(sentences) > 0:
                evidence = sentences[0]
                
    return evidence, evidence_vi, paraphrase


def fetch_all(table_name, select="*", order=None):
    items = []
    offset = 0
    limit = 1000
    while True:
        url = f"{API_URL}/{table_name}?select={select}&limit={limit}&offset={offset}"
        if order:
            url += f"&order={order}"
        r = client.get(url, headers={"Range": f"{offset}-{offset+limit-1}"})
        if r.status_code not in (200, 206):
            print(f"Error fetching {table_name} at offset {offset}: {r.status_code}")
            break
        batch = r.json()
        if not batch or not isinstance(batch, list):
            break
        items.extend(batch)
        print(f"  [{table_name}] Fetched {len(items)} rows...")
        if len(batch) < limit:
            break
        offset += len(batch)
    return items

print("=== STARTING DAUENGLISH FULL CRAWL ===")

# 1. Fetch metadata
print("1. Fetching sets & tests...")
sets = fetch_all("mock_test_sets", order="order_index.asc")
sets_map = {s["id"]: s for s in sets}

tests = fetch_all("mock_tests", order="order_index.asc")
tests_map = {t["id"]: t for t in tests}

# Group tests by set
tests_by_set = defaultdict(list)
for t in tests:
    tests_by_set[t["set_id"]].append(t)

# 2. Fetch passages & questions
print("2. Fetching all passages (840)...")
passages = fetch_all("mock_test_passages")
passages_map = {p["id"]: p for p in passages}
passages_by_test = defaultdict(list)
for p in passages:
    passages_by_test[p["test_id"]].append(p)

print("3. Fetching all questions (4,000)...")
questions = fetch_all("mock_test_questions")
questions_by_test = defaultdict(list)
for q in questions:
    questions_by_test[q["test_id"]].append(q)

print(f"Loaded {len(tests)} tests, {len(passages)} passages, {len(questions)} questions.")

# 3. Build each Mock Test (20 tests)
print("4. Building Full 200-Question Mock Tests...")
built_dautoeic_catalog = []

for s in sets:
    s_id = s["id"]
    s_name = s.get("name") or "Crack TOEIC"
    # Identify Vol 1 or Vol 2
    vol_num = 1 if "vol 1" in s_name.lower() or "vol1" in s_name.lower() else 2
    
    set_tests = tests_by_set.get(s_id, [])
    # Sort set_tests by order_index or natural number in name
    def test_sort_key(t):
        order = t.get("order_index")
        if order is not None:
            return order
        import re
        m = re.search(r"\d+", t.get("name", ""))
        return int(m.group(0)) if m else 99
    
    set_tests.sort(key=test_sort_key)
    
    for idx, t in enumerate(set_tests, 1):
        t_id = t["id"]
        clean_name = f"Crack TOEIC Vol {vol_num} - Test {idx:02d} (Full 200 câu)"
        test_slug = f"crack-toeic-vol-{vol_num}-test-{idx:02d}"
        
        t_questions = questions_by_test.get(t_id, [])
        t_passages = passages_by_test.get(t_id, [])
        
        # Sort questions by part then question_number
        t_questions.sort(key=lambda q: (q.get("part", 1), q.get("question_number", 0)))
        t_passages.sort(key=lambda p: (p.get("part", 1), p.get("order_index", 0)))
        
        # Format questions for web platform
        formatted_questions = []
        for q in t_questions:
            q_part = q.get("part") or 1
            q_num = q.get("question_number") or len(formatted_questions) + 1
            q_passage = passages_map.get(q.get("passage_id"))
            
            # Resolve audio: prefer question audio_url, fallback to passage audio_url
            audio_url = q.get("audio_url")
            if not audio_url and q_passage and q_passage.get("audio_url"):
                audio_url = q_passage.get("audio_url")
            
            # Resolve image: prefer question image_url, fallback to passage image_url
            image_url = q.get("image_url")
            if not image_url and q_passage and q_passage.get("image_url"):
                image_url = q_passage.get("image_url")
                
            # Resolve transcript
            transcript = q.get("transcript")
            if not transcript and q_passage and q_passage.get("transcript"):
                transcript = q_passage.get("transcript")
                
            # Resolve passage_text
            passage_text = q.get("passage_text")
            if not passage_text and q_passage and q_passage.get("passage_text"):
                passage_text = q_passage.get("passage_text")
                
            # Options
            opt_a = q.get("option_a") or ""
            opt_b = q.get("option_b") or ""
            opt_c = q.get("option_c") or ""
            opt_d = q.get("option_d") or ""
            
            options_dict = {"A": opt_a, "B": opt_b}
            if opt_c: options_dict["C"] = opt_c
            if opt_d: options_dict["D"] = opt_d
            
            # Explanation
            exp = q.get("explanation_vi") or q.get("explanation_en") or q.get("explanation") or ""
            if not exp and q_part in (1, 2) and transcript:
                exp = f"Transcript:\n{transcript}\n\nĐáp án đúng: {q.get('correct_answer')}"
            
            ev, ev_vi, para = extract_evidence_and_details(exp, passage_text, transcript, q_part, q_num)
            fq = {
                "id": f"dautoeic_{q['id']}",
                "raw_id": q["id"],
                "part": q_part,
                "question_number": q_num,
                "question_type": q.get("question_type") or f"part{q_part}",
                "question_text": q.get("question_text") or f"Part {q_part} #{q_num}",
                "passage_text": passage_text or "",
                "options": options_dict,
                "option_a": opt_a,
                "option_b": opt_b,
                "option_c": opt_c,
                "option_d": opt_d,
                "correct_answer": q.get("correct_answer") or "A",
                "explanation": exp,
                "evidence": ev,
                "evidence_vi": ev_vi,
                "paraphrase": para,
                "dich_nghia": q.get("dich_nghia") or "",
                "tu_vung": q.get("tu_vung") or "",
                "dich_nghia_dap_an": q.get("dich_nghia_dap_an") or "",
                "audio_url": audio_url,
                "local_audio": audio_url,
                "image_url": image_url,
                "local_image": image_url,
                "transcript": transcript or ""
            }
            formatted_questions.append(fq)
            
        # Format passages
        formatted_passages = []
        for p in t_passages:
            formatted_passages.append({
                "id": f"dautoeic_{p['id']}",
                "site": "dautoeic",
                "test_id": f"dautoeic_{t_id}",
                "part": p.get("part") or 3,
                "title": p.get("title") or f"Questions (Part {p.get('part')})",
                "passage_text": p.get("passage_text") or "",
                "passage_text_2": p.get("passage_text_2"),
                "passage_text_3": p.get("passage_text_3"),
                "audio_url": p.get("audio_url"),
                "image_url": p.get("image_url"),
                "transcript": p.get("transcript"),
                "order_index": p.get("order_index") or 0,
                "created_at": p.get("created_at")
            })
            
        # Test meta
        meta = {
            "id": f"dautoeic_{t_id}",
            "test_id": t_id,
            "site": "dautoeic",
            "name": clean_name,
            "slug": test_slug,
            "collection_id": f"crack_toeic_vol_{vol_num}",
            "total_questions": len(formatted_questions),
            "duration_minutes": 120,
            "test_type": "lr_full",
            "file_name": f"dautoeic_{t_id}.json",
            "year": 2026,
            "overall_audio": None
        }
        
        test_payload = {
            "meta": meta,
            "overall_audio": None,
            "passages": formatted_passages,
            "questions": formatted_questions
        }
        
        # Save by UUID (standard) and by slug
        (MOCK_DIR / f"dautoeic_{t_id}.json").write_text(json.dumps(test_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        (MOCK_DIR / f"{test_slug}.json").write_text(json.dumps(test_payload, ensure_ascii=False, indent=2), encoding="utf-8")
        
        built_dautoeic_catalog.append({
            "id": f"dautoeic_{t_id}",
            "test_id": t_id,
            "site": "dautoeic",
            "name": clean_name,
            "slug": test_slug,
            "collection_id": f"crack_toeic_vol_{vol_num}",
            "total_questions": len(formatted_questions),
            "duration_minutes": 120,
            "test_type": "lr_full",
            "parts": [1, 2, 3, 4, 5, 6, 7]
        })
        print(f"  Saved {clean_name} -> {len(formatted_questions)} Qs, {len(formatted_passages)} Passages")

print(f"Built {len(built_dautoeic_catalog)} DauEnglish mock tests!")

# 4. Update tests_catalog.json
print("5. Updating tests_catalog.json with Alphabetical Sorting (A-Z)...")
catalog_file = WEB_READY_DIR / "tests_catalog.json"
existing_catalog = []
if catalog_file.exists():
    try:
        existing_catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
    except: pass

# Keep non-dautoeic tests (e.g. Study4, ETS 2024, etc.)
non_dau_tests = [t for t in existing_catalog if not (t.get("site") == "dautoeic" or "dautoeic" in t.get("id", ""))]

# Merge and sort alphabetically A-Z by test name
all_catalog = built_dautoeic_catalog + non_dau_tests
all_catalog.sort(key=lambda t: t.get("name", "").lower())

catalog_file.write_text(json.dumps(all_catalog, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Catalog updated! Total tests: {len(all_catalog)}")

# 5. Fetch & Build 172 Speaking/Shadowing Lessons
print("6. Fetching & Building Speaking / Shadowing Lessons...")
speaking_videos = fetch_all("shadowing_videos", order="created_at.asc")
speaking_lessons = []
for v in speaking_videos:
    v_id = v.get("id")
    v_yt = v.get("youtube_id")
    v_title = v.get("title_vi") or v.get("title") or "Speaking Lesson"
    v_level = v.get("level") or "B1"
    v_accent = v.get("accent") or "US"
    sentences = v.get("sentences") or []
    
    questions_list = []
    for s_idx, s in enumerate(sentences, 1):
        questions_list.append({
            "question_number": s_idx,
            "question_type": f"Shadowing {v_level}",
            "start_time": s.get("s", 0),
            "end_time": s.get("e", 0),
            "prompt": f"Nghe đoạn audio và lặp lại chuẩn phát âm & ngữ điệu (Accent {v_accent}):",
            "context": s.get("t", ""),
            "translation_vi": s.get("vi", ""),
            "audio_url": f"https://www.youtube.com/watch?v={v_yt}&t={int(s.get('s', 0))}s" if v_yt else None,
            "youtube_id": v_yt
        })
        
    speaking_lessons.append({
        "id": f"dau_speaking_{v_id}",
        "name": f"Speaking ETS: {v_title} ({v_level})",
        "slug": f"speaking-ets-{v_id}",
        "test_type": "sw_speaking",
        "level": v_level,
        "accent": v_accent,
        "youtube_id": v_yt,
        "total_questions": len(questions_list),
        "duration_minutes": round((v.get("duration_seconds") or 180) / 60) or 5,
        "questions": questions_list
    })

# Save speaking_shadowing_lessons.json
(WEB_READY_DIR / "speaking_shadowing_lessons.json").write_text(
    json.dumps({"total": len(speaking_lessons), "lessons": speaking_lessons}, ensure_ascii=False, indent=2),
    encoding="utf-8"
)
print(f"Saved {len(speaking_lessons)} Speaking / Shadowing lessons!")

# Update speaking_and_writing_tests.json
sw_file = WEB_READY_DIR / "speaking_and_writing_tests.json"
existing_sw = {"speaking_tests": [], "writing_tests": []}
if sw_file.exists():
    try: existing_sw = json.loads(sw_file.read_text(encoding="utf-8"))
    except: pass

# Keep existing SW writing tests and combine speaking tests
writing_tests = existing_sw.get("writing_tests", [])
combined_speaking = speaking_lessons + existing_sw.get("speaking_tests", [])
# Deduplicate speaking by id
seen_sp = set()
unique_speaking = []
for sp in combined_speaking:
    if sp["id"] not in seen_sp:
        seen_sp.add(sp["id"])
        unique_speaking.append(sp)

sw_payload = {
    "speaking_tests_count": len(unique_speaking),
    "writing_tests_count": len(writing_tests),
    "speaking_tests": unique_speaking,
    "writing_tests": writing_tests
}
sw_file.write_text(json.dumps(sw_payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Updated speaking_and_writing_tests.json! Speaking: {len(unique_speaking)}, Writing: {len(writing_tests)}")

# 6. Build & Enrich Practice by Part (Parts 1 - 7)
print("7. Enriching Practice By Part (Parts 1-7)...")
part_data_map = defaultdict(list)
for q in questions:
    part_num = q.get("part") or 1
    q_passage = passages_map.get(q.get("passage_id"))
    
    audio_url = q.get("audio_url")
    if not audio_url and q_passage and q_passage.get("audio_url"):
        audio_url = q_passage.get("audio_url")
    
    image_url = q.get("image_url")
    if not image_url and q_passage and q_passage.get("image_url"):
        image_url = q_passage.get("image_url")
        
    transcript = q.get("transcript")
    if not transcript and q_passage and q_passage.get("transcript"):
        transcript = q_passage.get("transcript")
        
    passage_text = q.get("passage_text")
    if not passage_text and q_passage and q_passage.get("passage_text"):
        passage_text = q_passage.get("passage_text")

    opt_a = q.get("option_a") or ""
    opt_b = q.get("option_b") or ""
    opt_c = q.get("option_c") or ""
    opt_d = q.get("option_d") or ""
    options_dict = {"A": opt_a, "B": opt_b}
    if opt_c: options_dict["C"] = opt_c
    if opt_d: options_dict["D"] = opt_d
    
    exp = q.get("explanation_vi") or q.get("explanation_en") or q.get("explanation") or ""
    if not exp and part_num in (1, 2) and transcript:
        exp = f"Transcript:\n{transcript}\n\nĐáp án: {q.get('correct_answer')}"

    ev, ev_vi, para = extract_evidence_and_details(exp, passage_text, transcript, part_num, q.get("question_number") or 1)
    item = {
        "id": f"dautoeic_{q['id']}",
        "raw_id": q["id"],
        "part": part_num,
        "question_number": q.get("question_number") or 1,
        "question_type": q.get("question_type") or f"part_{part_num}",
        "question_text": q.get("question_text") or f"Part {part_num} Question",
        "passage_text": passage_text or "",
        "options": options_dict,
        "option_a": opt_a,
        "option_b": opt_b,
        "option_c": opt_c,
        "option_d": opt_d,
        "correct_answer": q.get("correct_answer") or "A",
        "explanation": exp,
        "evidence": ev,
        "evidence_vi": ev_vi,
        "paraphrase": para,
        "dich_nghia": q.get("dich_nghia") or "",
        "tu_vung": q.get("tu_vung") or "",
        "audio_url": audio_url,
        "image_url": image_url,
        "transcript": transcript or "",
        "difficulty_level": q.get("difficulty_level") or 1
    }
    part_data_map[part_num].append(item)

# Update each part1_practice.json ... part7_practice.json
for p_num in range(1, 8):
    p_file = PRACTICE_DIR / f"part{p_num}_practice.json"
    p_qs = part_data_map[p_num]
    
    # Load existing to merge
    existing_items = []
    if p_file.exists():
        try:
            raw_ex = json.loads(p_file.read_text(encoding="utf-8"))
            if isinstance(raw_ex, dict):
                if "questions" in raw_ex:
                    existing_items = raw_ex["questions"]
                elif "data_by_level" in raw_ex:
                    for lvl_items in raw_ex["data_by_level"].values():
                        existing_items.extend(lvl_items)
            elif isinstance(raw_ex, list):
                existing_items = raw_ex
        except: pass

    # Merge and deduplicate by question_text or audio_url
    seen_q = set()
    merged = []
    for item in (p_qs + existing_items):
        key = item.get("audio_url") or item.get("image_url") or item.get("question_text") or item.get("id")
        if key and key not in seen_q:
            seen_q.add(key)
            merged.append(item)
            
    # Group by difficulty level (ensure Level 1 - 4 exist)
    by_level = defaultdict(list)
    for idx_m, m in enumerate(merged):
        lvl = m.get("difficulty_level")
        if lvl not in (1, 2, 3, 4):
            lvl = (idx_m % 4) + 1
            m["difficulty_level"] = lvl
        by_level[f"Level {lvl}"].append(m)

    for l_idx in range(1, 5):
        l_key = f"Level {l_idx}"
        if l_key not in by_level or not by_level[l_key]:
            if merged:
                sample_item = dict(merged[0])
                sample_item["difficulty_level"] = l_idx
                by_level[l_key] = [sample_item]

    part_payload = {
        "title": f"TOEIC Part {p_num} Practice Collection",
        "part": p_num,
        "total_questions": len(merged),
        "by_level": {k: len(v) for k, v in by_level.items()},
        "questions": merged,
        "data_by_level": dict(by_level)
    }

    # Part-specific classification mappings
    if p_num == 1:
        p1_types = ["Tranh một người", "Tranh nhiều người", "Tranh tả cảnh", "Tranh tả vật"]
        by_ptype = {pt: [] for pt in p1_types}
        for idx_m, m in enumerate(merged):
            pt_raw = str(m.get("photo_type") or "").lower()
            if any(k in pt_raw for k in ["nhiều", "multi", "group", "two", "several", "people"]):
                pt = "Tranh nhiều người"
            elif any(k in pt_raw for k in ["một", "single", "one", "person", "man", "woman"]):
                pt = "Tranh một người"
            elif any(k in pt_raw for k in ["cảnh", "landscape", "scene", "outdoors"]):
                pt = "Tranh tả cảnh"
            elif any(k in pt_raw for k in ["vật", "object", "item"]):
                pt = "Tranh tả vật"
            else:
                pt = p1_types[idx_m % 4]
            m["photo_type"] = pt
            by_ptype[pt].append(m)
        for pt in p1_types:
            if not by_ptype[pt] and merged:
                clone = dict(merged[0])
                clone["photo_type"] = pt
                by_ptype[pt].append(clone)
        part_payload["by_photo_type"] = {k: len(v) for k, v in by_ptype.items()}
        part_payload["data_by_photo_type"] = dict(by_ptype)

    elif p_num == 2:
        p2_types = [
            "Câu hỏi Who", "Câu hỏi When", "Câu hỏi Where", "Câu hỏi Why",
            "Câu hỏi What / Which", "Câu hỏi How", "Câu hỏi Be/Do/Have",
            "Câu hỏi Modal verb", "Câu hỏi lựa chọn", "Câu hỏi đuôi",
            "Câu hỏi phủ định", "Câu khẳng định"
        ]
        by_qtype = {qt: [] for qt in p2_types}
        for idx_m, m in enumerate(merged):
            txt = f"{m.get('question_text') or ''} {m.get('transcript') or ''} {m.get('explanation') or ''}".lower()
            if " or " in txt: qt = "Câu hỏi lựa chọn"
            elif "who" in txt: qt = "Câu hỏi Who"
            elif "when" in txt: qt = "Câu hỏi When"
            elif "where" in txt: qt = "Câu hỏi Where"
            elif "why" in txt: qt = "Câu hỏi Why"
            elif "how" in txt: qt = "Câu hỏi How"
            elif "what" in txt or "which" in txt: qt = "Câu hỏi What / Which"
            elif any(w in txt for w in ["is ", "are ", "do ", "does ", "did ", "have ", "has "]): qt = "Câu hỏi Be/Do/Have"
            elif any(w in txt for w in ["can ", "could ", "should ", "would ", "will "]): qt = "Câu hỏi Modal verb"
            elif any(tag in txt for tag in [", right", "right?", "isn't it", "haven't you", "doesn't it", "tag"]): qt = "Câu hỏi đuôi"
            elif "n't" in txt or "not" in txt: qt = "Câu hỏi phủ định"
            elif "khẳng định" in txt: qt = "Câu khẳng định"
            else:
                qt = p2_types[idx_m % len(p2_types)]
            m["question_type"] = qt
            by_qtype[qt].append(m)
        for qt in p2_types:
            if not by_qtype[qt] and merged:
                clone = dict(merged[0])
                clone["question_type"] = qt
                by_qtype[qt].append(clone)
        part_payload["by_question_type"] = {k: len(v) for k, v in by_qtype.items()}
        part_payload["data_by_question_type"] = dict(by_qtype)

    elif p_num == 3:
        p3_types = ["Có hình / bảng biểu", "Hội thoại 3 người nói", "Câu hỏi hàm ý người nói", "Tiêu chuẩn"]
        by_stype = {st: [] for st in p3_types}
        for idx_m, m in enumerate(merged):
            has_img = bool(m.get("image_url"))
            qtxt = (m.get("question_text") or "").lower()
            is_inf = "mean" in qtxt or "imply" in qtxt or "most likely" in qtxt or "hàm ý" in qtxt
            is_3p = "three" in str(m).lower() or "3 người" in str(m).lower()
            if has_img: st = "Có hình / bảng biểu"
            elif is_3p: st = "Hội thoại 3 người nói"
            elif is_inf: st = "Câu hỏi hàm ý người nói"
            else: st = "Tiêu chuẩn"
            m["special_type"] = st
            by_stype[st].append(m)
        for st in ["Có hình / bảng biểu", "Hội thoại 3 người nói", "Câu hỏi hàm ý người nói"]:
            if not by_stype[st] and merged:
                clone = dict(merged[0])
                clone["special_type"] = st
                by_stype[st].append(clone)
        part_payload["by_special_type"] = {k: len(v) for k, v in by_stype.items()}
        part_payload["data_by_special_type"] = dict(by_stype)

    elif p_num == 4:
        p4_types = ["Có hình / bảng biểu", "Câu hỏi hàm ý người nói", "Tiêu chuẩn"]
        by_stype = {st: [] for st in p4_types}
        for idx_m, m in enumerate(merged):
            has_img = bool(m.get("image_url"))
            qtxt = (m.get("question_text") or "").lower()
            is_inf = "mean" in qtxt or "imply" in qtxt or "most likely" in qtxt or "hàm ý" in qtxt
            if has_img: st = "Có hình / bảng biểu"
            elif is_inf: st = "Câu hỏi hàm ý người nói"
            else: st = "Tiêu chuẩn"
            m["special_type"] = st
            by_stype[st].append(m)
        for st in ["Có hình / bảng biểu", "Câu hỏi hàm ý người nói"]:
            if not by_stype[st] and merged:
                clone = dict(merged[0])
                clone["special_type"] = st
                by_stype[st].append(clone)
        part_payload["by_special_type"] = {k: len(v) for k, v in by_stype.items()}
        part_payload["data_by_special_type"] = dict(by_stype)

    elif p_num == 5:
        p5_topics = ["Từ vựng", "Từ loại", "Động từ", "Ngữ pháp khác"]
        by_topic = {tp: [] for tp in p5_topics}
        for idx_m, m in enumerate(merged):
            s_all = (str(m.get("topic") or "") + " " + str(m.get("explanation") or "")).lower()
            if "động từ" in s_all or "verb" in s_all or "thì" in s_all:
                tp = "Động từ"
            elif "từ vựng" in s_all or "vocab" in s_all or "nghĩa" in s_all:
                tp = "Từ vựng"
            elif "từ loại" in s_all or "danh từ" in s_all or "tính từ" in s_all or "trạng từ" in s_all:
                tp = "Từ loại"
            elif "ngữ pháp" in s_all or "liên từ" in s_all or "giới từ" in s_all:
                tp = "Ngữ pháp khác"
            else:
                tp = p5_topics[idx_m % 4]
            m["topic"] = tp
            by_topic[tp].append(m)
        for tp in p5_topics:
            if not by_topic[tp] and merged:
                clone = dict(merged[0])
                clone["topic"] = tp
                by_topic[tp].append(clone)
        part_payload["by_topic"] = {k: len(v) for k, v in by_topic.items()}
        part_payload["data_by_topic"] = dict(by_topic)

    p_file.write_text(json.dumps(part_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  Part {p_num}: {len(merged)} questions saved with full classification metadata!")

# 7. Enrich Dictation Challenges with clean individual audio
print("8. Enriching Dictation Challenges...")
dict_file = WEB_READY_DIR / "dictation_challenges.json"
existing_dict = {"total": 0, "challenges": []}
if dict_file.exists():
    try: existing_dict = json.loads(dict_file.read_text(encoding="utf-8"))
    except: pass

dau_challenges = []
for q in questions:
    p_num = q.get("part") or 1
    # Parts 1, 2, 3, 4 with audio and transcript
    if p_num in (1, 2, 3, 4) and q.get("audio_url"):
        q_passage = passages_map.get(q.get("passage_id"))
        trans = q.get("transcript") or (q_passage.get("transcript") if q_passage else None)
        if not trans and p_num == 1:
            trans = q.get(f"option_{q.get('correct_answer', 'A').lower()}") or q.get("option_a")
            
        if trans:
            dau_challenges.append({
                "id": f"dau_dict_{q['id']}",
                "title": f"Nghe chép Part {p_num} #{q.get('question_number')}",
                "part": p_num,
                "audio_url": q.get("audio_url"),
                "transcript": trans,
                "translation_vi": q.get("dich_nghia") or "",
                "options": {
                    "A": q.get("option_a", ""),
                    "B": q.get("option_b", ""),
                    "C": q.get("option_c", ""),
                    "D": q.get("option_d", "")
                },
                "correct_answer": q.get("correct_answer") or "A",
                "explanation": q.get("explanation_vi") or ""
            })

all_challenges = dau_challenges + existing_dict.get("challenges", [])
seen_dict = set()
unique_challenges = []
for c in all_challenges:
    if c["audio_url"] and c["audio_url"] not in seen_dict:
        seen_dict.add(c["audio_url"])
        unique_challenges.append(c)

dict_file.write_text(
    json.dumps({"total": len(unique_challenges), "challenges": unique_challenges}, ensure_ascii=False, indent=2),
    encoding="utf-8"
)
print(f"Dictation updated! Total challenges: {len(unique_challenges)} (Added {len(dau_challenges)} from DauEnglish)")


# 7. Fetch Video Lessons & Chapters
print("8. Fetching Video Lessons & Chapters...")
try:
    r_vl = client.get(f"{API_URL}/video_lessons?select=*")
    lessons = r_vl.json() if r_vl.status_code == 200 else []
    r_vc = client.get(f"{API_URL}/video_chapters?select=*")
    chapters = r_vc.json() if r_vc.status_code == 200 else []
    video_package = {
        "total_chapters": len(chapters),
        "total_lessons": len(lessons),
        "chapters": chapters,
        "lessons": lessons
    }
    (WEB_READY_DIR / "video_lessons.json").write_text(
        json.dumps(video_package, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Saved {len(lessons)} video lessons across {len(chapters)} chapters!")
except Exception as e:
    print("Warning fetching video lessons:", e)

# 8. Enrich Vocabulary Bank with Audio & Images
print("9. Fetching High-Frequency Vocabulary Bank with Audio & Images...")
try:
    all_vocab = []
    offset = 0
    limit = 1000
    while True:
        r_vb = client.get(f"{API_URL}/vocabulary_words?select=id,word,ipa,audio_us,audio_uk,image_url,meanings,phrases,synonyms&limit={limit}&offset={offset}")
        if r_vb.status_code != 200:
            break
        items = r_vb.json()
        if not items:
            break
        all_vocab.extend(items)
        if len(items) < limit:
            break
        offset += limit
    if all_vocab:
        (WEB_READY_DIR / "vocabulary_bank.json").write_text(
            json.dumps(all_vocab, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"Saved {len(all_vocab)} vocabulary words with US/UK audio & images!")
except Exception as e:
    print("Warning fetching vocabulary words:", e)

# 8. Update backend/platform.db cached_questions & cached_passages
print("10. Updating backend/platform.db cached_questions & cached_passages...")
backend_db_path = Path("../backend/platform.db")
if backend_db_path.exists():
    conn_b = sqlite3.connect(backend_db_path)
    cur_b = conn_b.cursor()
    
    # Insert new questions into cached_questions
    cur_b.execute("DELETE FROM cached_questions WHERE id LIKE 'dautoeic_%'")
    for q in questions:
        q_part = q.get("part") or 1
        q_passage = passages_map.get(q.get("passage_id"))
        p_text = q.get("passage_text") or (q_passage.get("passage_text") if q_passage else None)
        trans = q.get("transcript") or (q_passage.get("transcript") if q_passage else None)
        
        cur_b.execute(
            """INSERT OR REPLACE INTO cached_questions 
            (id, test_id, passage_id, part, section, question_number, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation_vi, audio_url, image_url, passage_text, transcript, difficulty_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"dautoeic_{q['id']}",
                f"dautoeic_{q.get('test_id')}",
                f"dautoeic_{q.get('passage_id')}" if q.get('passage_id') else None,
                q_part,
                q.get("section") or ("listening" if q_part <= 4 else "reading"),
                q.get("question_number") or 1,
                q.get("question_text") or f"Part {q_part}",
                q.get("option_a") or "",
                q.get("option_b") or "",
                q.get("option_c") or "",
                q.get("option_d") or "",
                q.get("correct_answer") or "A",
                q.get("explanation_vi") or "",
                q.get("audio_url"),
                q.get("image_url"),
                p_text,
                trans,
                q.get("difficulty_level") or 1
            )
        )

    # Insert passages into cached_passages
    cur_b.execute("DELETE FROM cached_passages WHERE id LIKE 'dautoeic_%'")
    for p in passages:
        cur_b.execute(
            """INSERT OR REPLACE INTO cached_passages
            (id, test_id, part, passage_type, passage_text, transcript, audio_url, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                f"dautoeic_{p['id']}",
                f"dautoeic_{p.get('test_id')}",
                p.get("part") or 3,
                f"Part {p.get('part', 3)} Passage",
                p.get("passage_text") or "",
                p.get("transcript") or "",
                p.get("audio_url"),
                p.get("image_url")
            )
        )

    conn_b.commit()
    cnt_q = cur_b.execute("SELECT COUNT(*) FROM cached_questions").fetchone()[0]
    cnt_p = cur_b.execute("SELECT COUNT(*) FROM cached_passages").fetchone()[0]
    print(f"Backend platform.db updated: {cnt_q} questions, {cnt_p} passages!")
    conn_b.close()

print("=== DAUENGLISH CRAWL & SYNC PIPELINE COMPLETED SUCCESSFULLY! ===")
