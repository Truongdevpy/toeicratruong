import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
import sqlite3
from pathlib import Path
from collections import defaultdict

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

OUT_DIR = Path("data/web_ready")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Load downloads map for local path resolution
c.execute("SELECT url, local_path FROM downloads WHERE status='completed'")
downloads_map = dict(c.fetchall())

def resolve_local_media(url):
    if not url:
        return ""
    if url in downloads_map:
        return downloads_map[url]
    return url

print("1. Building Full Mock Tests (Exam Mode)...")
MOCK_DIR = OUT_DIR / "mock_tests"
MOCK_DIR.mkdir(parents=True, exist_ok=True)

c.execute("SELECT * FROM tests ORDER BY site, id")
all_tests = [dict(r) for r in c.fetchall()]

# Load all questions & passages
c.execute("SELECT * FROM questions ORDER BY site, test_id, part, question_number")
all_questions = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM passages ORDER BY site, test_id, part, order_index")
all_passages = [dict(r) for r in c.fetchall()]

passages_by_test = defaultdict(list)
for p in all_passages:
    passages_by_test[p["test_id"]].append(p)

questions_by_test = defaultdict(list)
for q in all_questions:
    questions_by_test[q["test_id"]].append(q)

test_catalog = []
for t in all_tests:
    t_id = t["id"]
    t_num_id = t["test_id"]
    q_list = questions_by_test.get(t_id, []) or questions_by_test.get(t_num_id, [])
    p_list = passages_by_test.get(t_id, []) or passages_by_test.get(t_num_id, [])
    
    test_type = "lr_full"
    if "speaking" in t["slug"].lower():
        test_type = "sw_speaking"
    elif "writing" in t["slug"].lower():
        test_type = "sw_writing"
    elif len(q_list) < 50:
        test_type = "mini_test"

    meta = {
        "id": t_id,
        "test_id": t["test_id"],
        "site": t["site"],
        "name": t["name"],
        "slug": t["slug"],
        "collection_id": t["collection_id"],
        "total_questions": len(q_list),
        "duration_minutes": t["duration_minutes"] or (120 if test_type == "lr_full" else (20 if test_type == "sw_speaking" else 60)),
        "test_type": test_type,
        "file_name": f"{t_id}.json"
    }
    test_catalog.append(meta)

    # Save detailed test package
    packaged_test = {
        "meta": meta,
        "passages": p_list,
        "questions": [
            {
                "id": q["id"],
                "part": q["part"],
                "question_number": q["question_number"],
                "question_type": q["question_type"],
                "question_text": q["question_text"],
                "passage_text": q["passage_text"],
                "options": {
                    "A": q["option_a"],
                    "B": q["option_b"],
                    "C": q["option_c"],
                    "D": q["option_d"]
                },
                "correct_answer": q["correct_answer"],
                "explanation": q["explanation"],
                "instruction_translation": q["instruction"],
                "audio_url": q["audio_url"],
                "local_audio": resolve_local_media(q["audio_url"]),
                "image_url": q["image_url"],
                "local_image": resolve_local_media(q["image_url"])
            }
            for q in q_list
        ]
    }
    (MOCK_DIR / f"{t_id}.json").write_text(json.dumps(packaged_test, ensure_ascii=False, indent=2), encoding="utf-8")
    if t.get("slug"):
        (MOCK_DIR / f"{t['slug']}.json").write_text(json.dumps(packaged_test, ensure_ascii=False, indent=2), encoding="utf-8")

test_catalog.sort(key=lambda t: t.get("name", "").lower())
(OUT_DIR / "tests_catalog.json").write_text(json.dumps(test_catalog, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Exported {len(test_catalog)} individual test packages to {MOCK_DIR}")

print("2. Building Practice by Part & Level (Dau TOEIC Style)...")
PRACTICE_DIR = OUT_DIR / "practice_by_part"
PRACTICE_DIR.mkdir(parents=True, exist_ok=True)

questions_by_part = defaultdict(list)
for q in all_questions:
    if q["site"] == "dautoeic":
        questions_by_part[q["part"]].append(q)

# Part 1 Practice Builder
p1_questions = questions_by_part[1]
p1_by_level = defaultdict(list)
p1_by_photo_type = defaultdict(list)

for q in p1_questions:
    raw = {}
    try: raw = json.loads(q["raw_json"])
    except: pass
    level = raw.get("difficulty_level") or 1
    ptype = str(raw.get("photo_type") or raw.get("main_subject") or "single").lower()
    if any(k in ptype for k in ["multi", "people", "group", "two", "several", "crowd"]):
        p_label = "Tranh nhiều người"
    elif any(k in ptype for k in ["one", "single", "person", "man", "woman"]):
        p_label = "Tranh một người"
    elif any(k in ptype for k in ["scene", "landscape", "outdoors", "nature"]):
        p_label = "Tranh tả cảnh"
    else:
        p_label = "Tranh tả vật"

    q_data = {
        "id": q["id"],
        "test_id": q["test_id"],
        "question_number": q["question_number"],
        "level": level,
        "photo_type": p_label,
        "audio_url": q["audio_url"],
        "local_audio": resolve_local_media(q["audio_url"]),
        "image_url": q["image_url"],
        "local_image": resolve_local_media(q["image_url"]),
        "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]},
        "correct_answer": q["correct_answer"],
        "vietnamese_translation": q["instruction"],
        "vocabulary": raw.get("tu_vung")
    }
    p1_by_level[f"Level {level}"].append(q_data)
    p1_by_photo_type[p_label].append(q_data)

part1_package = {
    "title": "Chinh phục TOEIC Listening - Part 1",
    "total_questions": len(p1_questions),
    "by_level": {k: len(v) for k, v in p1_by_level.items()},
    "by_photo_type": {k: len(v) for k, v in p1_by_photo_type.items()},
    "data_by_level": p1_by_level,
    "data_by_photo_type": p1_by_photo_type
}
(PRACTICE_DIR / "part1_practice.json").write_text(json.dumps(part1_package, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Part 1: {len(p1_questions)} questions categorized by 4 levels and 4 photo types.")

# Part 2 Practice Builder
p2_questions = questions_by_part[2]
p2_by_level = defaultdict(list)
p2_by_qtype = defaultdict(list)

for q in p2_questions:
    raw = {}
    try: raw = json.loads(q["raw_json"])
    except: pass
    full_text = f"{q.get('question_text') or ''} {q.get('instruction') or ''} {raw.get('transcript') or ''}".lower()
    if " or " in full_text: qtype = "Câu hỏi lựa chọn"
    elif "who" in full_text: qtype = "Câu hỏi Who"
    elif "when" in full_text: qtype = "Câu hỏi When"
    elif "where" in full_text: qtype = "Câu hỏi Where"
    elif "why" in full_text: qtype = "Câu hỏi Why"
    elif "how" in full_text: qtype = "Câu hỏi How"
    elif "what" in full_text or "which" in full_text: qtype = "Câu hỏi What / Which"
    elif any(w in full_text for w in ["is ", "are ", "do ", "does ", "did ", "have ", "has "]): qtype = "Câu hỏi Be/Do/Have"
    elif any(w in full_text for w in ["can ", "could ", "should ", "would ", "will "]): qtype = "Câu hỏi Modal verb"
    elif any(tag in full_text for tag in [", right", "right?", "isn't it", "haven't you", "doesn't it", "won't you", "tag"]): qtype = "Câu hỏi đuôi"
    elif "n't" in full_text or "not" in full_text: qtype = "Câu hỏi phủ định"
    else: qtype = "Câu khẳng định"

    raw_lvl = raw.get("difficulty_level")
    if raw_lvl in (1, 2, 4):
        level = raw_lvl
    else:
        q_num = q.get("question_number") or 7
        if q_num <= 12 or qtype in ("Câu hỏi Who", "Câu hỏi When", "Câu hỏi Where"):
            level = 1
        elif q_num <= 18 or qtype in ("Câu hỏi Be/Do/Have", "Câu hỏi What / Which"):
            level = 2
        elif q_num <= 25 or qtype in ("Câu hỏi Modal verb", "Câu hỏi Why", "Câu hỏi How", "Câu hỏi lựa chọn"):
            level = 3
        else:
            level = 4

    q_data = {
        "id": q["id"],
        "test_id": q["test_id"],
        "question_number": q["question_number"],
        "level": level,
        "question_type": qtype,
        "audio_url": q["audio_url"],
        "local_audio": resolve_local_media(q["audio_url"]),
        "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"]},
        "correct_answer": q["correct_answer"],
        "vietnamese_translation": q["instruction"],
        "vocabulary": raw.get("tu_vung")
    }
    p2_by_level[f"Level {level}"].append(q_data)
    p2_by_qtype[qtype].append(q_data)

part2_package = {
    "title": "Chinh phục TOEIC Listening - Part 2",
    "total_questions": len(p2_questions),
    "by_level": {k: len(v) for k, v in p2_by_level.items()},
    "by_question_type": {k: len(v) for k, v in p2_by_qtype.items()},
    "data_by_level": p2_by_level,
    "data_by_question_type": p2_by_qtype
}
(PRACTICE_DIR / "part2_practice.json").write_text(json.dumps(part2_package, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Part 2: {len(p2_questions)} questions categorized by 4 levels and 12 question types.")

# Part 3 & 4 Practice Builder
for p_num in [3, 4]:
    p_questions = questions_by_part[p_num]
    p_by_level = defaultdict(list)
    p_special = defaultdict(list)
    for q in p_questions:
        raw = {}
        try: raw = json.loads(q["raw_json"])
        except: pass
        level = raw.get("difficulty_level") or 1
        has_graphic = bool(q["image_url"] or raw.get("image_url"))
        q_text_l = (q["question_text"] or "").lower()
        is_inference = "mean" in q_text_l or "imply" in q_text_l or "most likely" in q_text_l
        
        stype = "Tiêu chuẩn"
        if has_graphic: stype = "Có hình / bảng biểu"
        elif is_inference: stype = "Câu hỏi hàm ý người nói"
        elif p_num == 3 and "three" in str(raw).lower(): stype = "Hội thoại 3 người nói"

        q_data = {
            "id": q["id"],
            "test_id": q["test_id"],
            "question_number": q["question_number"],
            "level": level,
            "special_type": stype,
            "audio_url": q["audio_url"],
            "local_audio": resolve_local_media(q["audio_url"]),
            "image_url": q["image_url"],
            "local_image": resolve_local_media(q["image_url"]),
            "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]},
            "correct_answer": q["correct_answer"],
            "vietnamese_translation": q["instruction"],
            "vocabulary": raw.get("tu_vung")
        }
        p_by_level[f"Level {level}"].append(q_data)
        p_special[stype].append(q_data)

    p_package = {
        "title": f"Chinh phục TOEIC Listening - Part {p_num}",
        "total_questions": len(p_questions),
        "by_level": {k: len(v) for k, v in p_by_level.items()},
        "by_special_type": {k: len(v) for k, v in p_special.items()},
        "data_by_level": p_by_level,
        "data_by_special_type": p_special
    }
    (PRACTICE_DIR / f"part{p_num}_practice.json").write_text(json.dumps(p_package, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"   Part {p_num}: {len(p_questions)} questions categorized by levels and special types.")

# Part 5 Practice Builder
p5_questions = questions_by_part[5]
p5_by_level = defaultdict(list)
p5_by_topic = defaultdict(list)
for q in p5_questions:
    raw = {}
    try: raw = json.loads(q["raw_json"])
    except: pass
    level = raw.get("difficulty_level") or 1
    domain = str(raw.get("topic_domain") or "").lower()
    raw_s = str(raw).lower()
    if "grammar" in domain or "other" in domain or "liên từ" in raw_s or "giới từ" in raw_s or "đại từ" in raw_s:
        topic = "Ngữ pháp khác"
    elif "vocab" in domain or "từ vựng" in raw_s:
        topic = "Từ vựng"
    elif "pos" in domain or "từ loại" in raw_s or "word form" in raw_s or "noun" in raw_s or "adj" in raw_s:
        topic = "Từ loại"
    elif "verb" in domain or "động từ" in raw_s or "tense" in raw_s:
        topic = "Động từ"
    else:
        topic = "Ngữ pháp khác"

    q_data = {
        "id": q["id"],
        "test_id": q["test_id"],
        "question_number": q["question_number"],
        "level": level,
        "topic": topic,
        "question_text": q["question_text"],
        "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]},
        "correct_answer": q["correct_answer"],
        "vietnamese_translation": q["instruction"],
        "vocabulary": raw.get("tu_vung")
    }
    p5_by_level[f"Level {level}"].append(q_data)
    p5_by_topic[topic].append(q_data)

p5_package = {
    "title": "Chinh phục TOEIC Reading - Part 5",
    "total_questions": len(p5_questions),
    "by_level": {k: len(v) for k, v in p5_by_level.items()},
    "by_topic": {k: len(v) for k, v in p5_by_topic.items()},
    "data_by_level": p5_by_level,
    "data_by_topic": p5_by_topic
}
(PRACTICE_DIR / "part5_practice.json").write_text(json.dumps(p5_package, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Part 5: {len(p5_questions)} questions categorized by levels and 4 core topics.")

# Part 6 & 7 Practice Builder
for p_num in [6, 7]:
    p_questions = questions_by_part[p_num]
    p_by_level = defaultdict(list)
    for q in p_questions:
        raw = {}
        try: raw = json.loads(q["raw_json"])
        except: pass
        level = raw.get("difficulty_level") or 1
        q_data = {
            "id": q["id"],
            "test_id": q["test_id"],
            "question_number": q["question_number"],
            "level": level,
            "passage_text": q["passage_text"],
            "question_text": q["question_text"],
            "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]},
            "correct_answer": q["correct_answer"],
            "vietnamese_translation": q["instruction"],
            "vocabulary": raw.get("tu_vung")
        }
        p_by_level[f"Level {level}"].append(q_data)

    p_package = {
        "title": f"Chinh phục TOEIC Reading - Part {p_num}",
        "total_questions": len(p_questions),
        "by_level": {k: len(v) for k, v in p_by_level.items()},
        "data_by_level": p_by_level
    }
    (PRACTICE_DIR / f"part{p_num}_practice.json").write_text(json.dumps(p_package, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"   Part {p_num}: {len(p_questions)} questions categorized by 4 levels.")

print("3. Building Grammar Mastery System (38 Topics, 174 Subtopics, 1,843 Questions)...")
c.execute("SELECT * FROM grammar_topics ORDER BY order_index")
topics = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM grammar_subtopics ORDER BY order_index")
subtopics = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM lessons")
lessons = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM grammar_questions")
g_questions = [dict(r) for r in c.fetchall()]

grammar_groups = {
    "Từ loại": ["Danh từ", "Tính từ", "Trạng từ"],
    "Động từ": ["Thì", "Hòa hợp chủ ngữ – động từ", "Chủ động – bị động", "Danh động từ", "Câu mệnh lệnh", "Dạng động từ"],
    "Ngữ pháp khác": ["Đại từ", "So sánh", "Liên từ giới từ", "Mệnh đề quan hệ", "Câu điều kiện", "Mệnh đề trạng ngữ"]
}

sub_by_topic = defaultdict(list)
for s in subtopics:
    sub_by_topic[s["topic_id"]].append(s)

lessons_by_sub = defaultdict(list)
for l in lessons:
    lessons_by_sub[l.get("subtopic_id")].append(l)

q_by_sub = defaultdict(list)
for gq in g_questions:
    q_by_sub[gq.get("subtopic_id")].append(gq)

grammar_curriculum = []
for t in topics:
    t_name = t.get("title_vi") or t.get("title_en") or "Chuyên đề"
    group = "Ngữ pháp khác"
    for grp, members in grammar_groups.items():
        if any(m.lower() in t_name.lower() for m in members):
            group = grp
            break

    subs_packaged = []
    t_qs = []
    for s in sub_by_topic.get(t["id"], []):
        sub_qs = q_by_sub.get(s["id"], [])
        t_qs.extend(sub_qs)
        subs_packaged.append({
            "id": s["id"],
            "title_vi": s.get("title_vi") or s.get("title_en") or "",
            "title_en": s.get("title_en") or "",
            "lessons": lessons_by_sub.get(s["id"], []),
            "practice_questions": sub_qs,
            "total_questions": len(sub_qs)
        })

    if not t_qs:
        t_qs = [gq for gq in g_questions if gq.get("topic_id") == t["id"]]

    grammar_curriculum.append({
        "id": t["id"],
        "title_vi": t.get("title_vi") or t.get("title_en") or "",
        "title_en": t.get("title_en") or "",
        "group": group,
        "description_vi": t.get("description_vi", ""),
        "practice_questions": t_qs,
        "subtopics": subs_packaged
    })

grammar_package = {
    "total_topics": len(topics),
    "total_subtopics": len(subtopics),
    "total_lessons": len(lessons),
    "total_questions": len(g_questions),
    "groups": grammar_groups,
    "curriculum": grammar_curriculum
}
(OUT_DIR / "grammar_curriculum.json").write_text(json.dumps(grammar_package, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Exported {len(topics)} grammar topics with {len(g_questions)} questions to grammar_curriculum.json.")

print("4. Building TOEIC Speaking & Writing Module (Study4 Dataset)...")
c.execute("SELECT * FROM tests WHERE site='study4' AND (slug LIKE '%speaking%' OR slug LIKE '%writing%') ORDER BY slug")
sw_tests = [dict(r) for r in c.fetchall()]

speaking_tests = []
writing_tests = []

for t in sw_tests:
    q_list = questions_by_test.get(t["id"], []) or questions_by_test.get(t["test_id"], [])
    t_entry = {
        "id": t["id"],
        "name": t["name"],
        "slug": t["slug"],
        "total_questions": len(q_list),
        "questions": [
            {
                "question_number": q["question_number"],
                "question_type": q["question_type"],
                "prompt": q["question_text"],
                "context": q["passage_text"],
                "image_url": q["image_url"],
                "local_image": resolve_local_media(q["image_url"]),
                "options": {"A": q["option_a"], "B": q["option_b"], "C": q["option_c"], "D": q["option_d"]}
            }
            for q in q_list
        ]
    }
    if "speaking" in t["slug"].lower():
        speaking_tests.append(t_entry)
    else:
        writing_tests.append(t_entry)

# Merge shadowing lessons
shadowing_file = OUT_DIR / "speaking_shadowing_lessons.json"
if shadowing_file.exists():
    try:
        sh_data = json.loads(shadowing_file.read_text(encoding="utf-8"))
        sh_lessons = sh_data.get("lessons", [])
        seen_sp = {sp["id"] for sp in speaking_tests}
        for sl in sh_lessons:
            if sl["id"] not in seen_sp:
                speaking_tests.append(sl)
                seen_sp.add(sl["id"])
    except Exception as e:
        print("Warning loading shadowing lessons:", e)

sw_package = {
    "speaking_tests_count": len(speaking_tests),
    "writing_tests_count": len(writing_tests),
    "speaking_tests": speaking_tests,
    "writing_tests": writing_tests
}
(OUT_DIR / "speaking_and_writing_tests.json").write_text(json.dumps(sw_package, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Exported {len(speaking_tests)} Speaking Tests & {len(writing_tests)} Writing Tests to speaking_and_writing_tests.json.")

print("5. Building Dictation (Nghe Chép) Module...")
c.execute("SELECT * FROM listening_sets ORDER BY name")
sets = [dict(r) for r in c.fetchall()]
(OUT_DIR / "listening_dictation_sets.json").write_text(json.dumps(sets, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Exported {len(sets)} listening sets to listening_dictation_sets.json.")

print("6. Building High-Frequency Vocabulary Bank...")
c.execute("SELECT * FROM vocabulary_words ORDER BY order_index")
words = [dict(r) for r in c.fetchall()]
(OUT_DIR / "vocabulary_bank.json").write_text(json.dumps(words, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"   Exported {len(words)} vocabulary words to vocabulary_bank.json.")

# Master index file
master_index = {
    "platform_name": "TOEIC Ra Trường - Core Learning & Exam Engine",
    "version": "2.0.0",
    "total_full_tests": len(test_catalog),
    "total_questions": len(all_questions),
    "total_passages": len(all_passages),
    "total_grammar_questions": len(g_questions),
    "total_vocabulary_words": len(words),
    "total_speaking_tests": len(speaking_tests),
    "total_writing_tests": len(writing_tests),
    "modules": {
        "full_mock_tests": "mock_tests/{test_id}.json",
        "mock_tests_catalog": "tests_catalog.json",
        "practice_part1": "practice_by_part/part1_practice.json",
        "practice_part2": "practice_by_part/part2_practice.json",
        "practice_part3": "practice_by_part/part3_practice.json",
        "practice_part4": "practice_by_part/part4_practice.json",
        "practice_part5": "practice_by_part/part5_practice.json",
        "practice_part6": "practice_by_part/part6_practice.json",
        "practice_part7": "practice_by_part/part7_practice.json",
        "grammar_curriculum": "grammar_curriculum.json",
        "speaking_and_writing": "speaking_and_writing_tests.json",
        "listening_dictation": "listening_dictation_sets.json",
        "vocabulary_bank": "vocabulary_bank.json"
    }
}
(OUT_DIR / "index.json").write_text(json.dumps(master_index, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\nSUCCESS: Generated complete web-ready platform data in {OUT_DIR}!")
