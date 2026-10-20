import json
import time
from pathlib import Path
from typing import Any, Dict
import httpx
from config import DATA_DIR
from core.utils import logger, sanitize_path_segment

def safe_get_json(client, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            r = client.get(url)
            if r.status_code in (200, 206):
                return r.json()
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"Failed to fetch {url} after {max_retries} attempts: {e}")
                raise
            time.sleep(1.0)
    return []

def crawl_grammar(self) -> Dict[str, Any]:
    logger.info("[DAUTOEIC] Crawling Grammar & Lessons...")
    grammar_dir = DATA_DIR / self.site_name / "grammar"
    grammar_dir.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": self.api_key, "Authorization": f"Bearer {self.api_key}"}

    with httpx.Client(headers=headers, timeout=30.0) as client:
        topics = safe_get_json(client, f"{self.api_url}/grammar_topics?select=*&order=order_index.asc&limit=100")
        subtopics = safe_get_json(client, f"{self.api_url}/grammar_subtopics?select=*&order=order_index.asc&limit=300")
        lessons = safe_get_json(client, f"{self.api_url}/lessons?select=*&limit=300")

        all_questions = []
        offset = 0
        limit = 500
        while True:
            url = f"{self.api_url}/questions?select=*&limit={limit}&offset={offset}"
            rows = safe_get_json(client, url)
            if not rows:
                break
            all_questions.extend(rows)
            if len(rows) < limit:
                break
            offset += limit

    logger.info(f"[DAUTOEIC] Retrieved {len(topics)} topics, {len(subtopics)} subtopics, {len(lessons)} lessons, {len(all_questions)} questions.")

    for top in topics:
        self.db.upsert_grammar_topic(
            id_val=top["id"],
            title_en=top.get("title_en") or "",
            title_vi=top.get("title_vi") or "",
            description_en=top.get("description_en"),
            description_vi=top.get("description_vi"),
            order_index=top.get("order_index") or 0
        )

    for sub in subtopics:
        self.db.upsert_grammar_subtopic(
            id_val=sub["id"],
            topic_id=sub.get("topic_id") or "",
            title_en=sub.get("title_en") or "",
            title_vi=sub.get("title_vi") or "",
            description_en=sub.get("description_en"),
            description_vi=sub.get("description_vi"),
            order_index=sub.get("order_index") or 0
        )

    for les in lessons:
        self.db.upsert_lesson(
            id_val=les["id"],
            subtopic_id=les.get("subtopic_id") or "",
            title_en=les.get("title_en") or "",
            title_vi=les.get("title_vi") or "",
            video_url=les.get("video_url"),
            theory_content_en=les.get("theory_content_en"),
            theory_content_vi=les.get("theory_content_vi")
        )

    for q in all_questions:
        self.db.upsert_grammar_question(
            id_val=q["id"],
            lesson_id=q.get("lesson_id"),
            topic_id=q.get("topic_id"),
            subtopic_id=q.get("subtopic_id"),
            question_text=q.get("question_text") or "",
            option_a=q.get("option_a"),
            option_b=q.get("option_b"),
            option_c=q.get("option_c"),
            option_d=q.get("option_d"),
            correct_answer=q.get("correct_answer"),
            explanation=q.get("explanation"),
            raw_json=json.dumps(q, ensure_ascii=False)
        )

    catalog = {"topics": topics, "subtopics": subtopics, "lessons": lessons, "total_questions": len(all_questions)}
    (grammar_dir / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    (grammar_dir / "grammar_all.json").write_text(json.dumps({
        "topics": topics, "subtopics": subtopics, "lessons": lessons, "questions": all_questions
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    for top in topics:
        t_name = sanitize_path_segment(top.get("title_en") or top.get("title_vi") or top["id"])
        t_dir = grammar_dir / t_name
        t_dir.mkdir(parents=True, exist_ok=True)
        t_subs = [s for s in subtopics if s.get("topic_id") == top["id"]]
        for sub in t_subs:
            sub_name = sanitize_path_segment(sub.get("title_en") or sub.get("title_vi") or sub["id"])
            sub_lessons = [l for l in lessons if l.get("subtopic_id") == sub["id"]]
            sub_questions = [q for q in all_questions if q.get("subtopic_id") == sub["id"]]
            (t_dir / f"{sub_name}.json").write_text(json.dumps({
                "subtopic": sub, "lessons": sub_lessons, "questions": sub_questions
            }, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"topics": len(topics), "subtopics": len(subtopics), "lessons": len(lessons), "questions": len(all_questions)}

def crawl_videos(self) -> Dict[str, Any]:
    logger.info("[DAUTOEIC] Crawling Video Lessons...")
    videos_dir = DATA_DIR / self.site_name / "videos"
    videos_dir.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": self.api_key, "Authorization": f"Bearer {self.api_key}"}
    with httpx.Client(headers=headers, timeout=25.0) as client:
        chapters = safe_get_json(client, f"{self.api_url}/video_chapters?select=*&order=order_index.asc")
        chap_map = {c["id"]: c.get("name") or "Chapter" for c in chapters}
        videos = safe_get_json(client, f"{self.api_url}/video_lessons?select=*&order=order_index.asc")

    for v in videos:
        chap_name = chap_map.get(v.get("chapter_id"), "General")
        self.db.upsert_video_lesson(
            id_val=v["id"],
            chapter_id=v.get("chapter_id"),
            chapter_name=chap_name,
            title=v.get("title") or "Lesson",
            video_url=v.get("video_url"),
            thumbnail_url=v.get("thumbnail_url"),
            duration_seconds=v.get("duration_seconds") or 0,
            linked_content_id=v.get("linked_content_id")
        )

    (videos_dir / "video_lessons.json").write_text(json.dumps({"chapters": chapters, "videos": videos}, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"chapters": len(chapters), "videos": len(videos)}

def crawl_listening(self) -> Dict[str, Any]:
    logger.info("[DAUTOEIC] Crawling Listening Sets...")
    listen_dir = DATA_DIR / self.site_name / "listening"
    listen_dir.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": self.api_key, "Authorization": f"Bearer {self.api_key}"}
    with httpx.Client(headers=headers, timeout=25.0) as client:
        sets = safe_get_json(client, f"{self.api_url}/listening_sets?select=*&order=order_index.asc&limit=200")
        collections = safe_get_json(client, f"{self.api_url}/listening_collection_order?select=*")
        chapters = safe_get_json(client, f"{self.api_url}/listening_chapter_order?select=*")

    for s in sets:
        self.db.upsert_listening_set(
            id_val=s["id"],
            name=s.get("name") or "Part",
            folder_path=s.get("folder_path"),
            toeic_part=s.get("toeic_part"),
            collection_name=s.get("collection_name"),
            chapter_name=s.get("chapter_name")
        )

    (listen_dir / "listening_sets.json").write_text(json.dumps({"sets": sets, "collections": collections, "chapters": chapters}, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"listening_sets": len(sets)}

def crawl_skills_overview(self) -> Dict[str, Any]:
    speak_dir = DATA_DIR / self.site_name / "speaking"
    write_dir = DATA_DIR / self.site_name / "writing"
    read_dir = DATA_DIR / self.site_name / "reading"
    for d in [speak_dir, write_dir, read_dir]:
        d.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": self.api_key, "Authorization": f"Bearer {self.api_key}"}
    with httpx.Client(headers=headers, timeout=20.0) as client:
        modules = safe_get_json(client, f"{self.api_url}/platform_modules?select=*&order=order_index.asc")

    speaking_info = {
        "module": "mod-speak",
        "name": "Kỹ năng Nói (Speaking)",
        "status": "In Development (Đang phát triển / Sắp ra mắt)",
        "sub_parts": [
            {"slug": "pronunciation", "label": "Luyện phát âm căn bản"},
            {"slug": "1", "label": "Part 1: Đọc to một đoạn văn", "question_count_target": 2},
            {"slug": "2", "label": "Part 2: Miêu tả một bức tranh", "question_count_target": 2},
            {"slug": "3", "label": "Part 3: Trả lời câu hỏi với thông tin cho trước", "question_count_target": 3},
            {"slug": "4", "label": "Part 4: Trả lời câu hỏi dùng thông tin bảng biểu", "question_count_target": 3},
            {"slug": "5", "label": "Part 5: Đưa ra giải pháp", "question_count_target": 1}
        ],
        "storage_bucket": "speaking-media",
        "note": "Platform UI is ready; backend question tables are currently awaiting content deployment."
    }
    (speak_dir / "speaking_info.json").write_text(json.dumps(speaking_info, ensure_ascii=False, indent=2), encoding="utf-8")

    writing_info = {
        "module": "mod-write",
        "name": "Kỹ năng Viết (Writing)",
        "status": "In Development (Đang phát triển / Sắp ra mắt)",
        "sub_parts": [
            {"part": 1, "name": "Part 1: Viết câu dựa trên bức tranh", "table": "writing_part1_questions", "storage_bucket": "writing-part1-images"},
            {"part": 2, "name": "Part 2: Trả lời yêu cầu bằng văn bản (Email response)", "table": "writing_part2_questions"},
            {"part": 3, "name": "Part 3: Viết bài luận thể hiện quan điểm (Opinion essay)"}
        ],
        "schema_part1": ["id", "external_id", "image_path", "image_name", "words", "words_vi", "difficulty", "structure_suggestions", "sample_sentences", "sample_structures", "samples_en", "samples_vi", "ideas", "is_hidden", "pattern"],
        "note": "UI interactive components for Part 1 and Part 2 are built in frontend; backend tables currently contain 0 published rows."
    }
    (write_dir / "writing_info.json").write_text(json.dumps(writing_info, ensure_ascii=False, indent=2), encoding="utf-8")

    reading_info = {
        "module": "mod-reading",
        "name": "Luyện đọc (Reading)",
        "status": "Active in Mock Tests (1,000 reading questions in Parts 5, 6, 7 across 10 tests)",
        "practice_table": "reading_passages",
        "mock_tests_reading_questions": 1000,
        "mock_tests_passages": 420
    }
    (read_dir / "reading_info.json").write_text(json.dumps(reading_info, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"modules": len(modules)}
