from fastapi import APIRouter, HTTPException, Query
import json
from pathlib import Path
from media_resolver import resolve_media_url

router = APIRouter(prefix="/api/sw", tags=["speaking-writing"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
SW_FILE = WEB_READY_DIR / "speaking_and_writing_tests.json"

_sw_cache = None

def get_sw_data():
    global _sw_cache
    if _sw_cache is None:
        if SW_FILE.exists():
            try:
                _sw_cache = json.loads(SW_FILE.read_text(encoding="utf-8"))
            except Exception:
                _sw_cache = {"speaking_tests": [], "writing_tests": []}
        else:
            _sw_cache = {"speaking_tests": [], "writing_tests": []}
    return _sw_cache

@router.get("/tests")
def list_sw_tests(test_type: str = Query(None)):
    data = get_sw_data()
    sp_tests = data.get("speaking_tests", [])
    wr_tests = data.get("writing_tests", [])

    results = []
    if test_type != "writing":
        for t in sp_tests:
            results.append({
                "id": t["id"],
                "name": t.get("name"),
                "slug": t.get("slug"),
                "test_type": "sw_speaking",
                "total_questions": t.get("total_questions", 11),
                "duration_minutes": 20
            })
    if test_type != "speaking":
        for t in wr_tests:
            results.append({
                "id": t["id"],
                "name": t.get("name"),
                "slug": t.get("slug"),
                "test_type": "sw_writing",
                "total_questions": t.get("total_questions", 8),
                "duration_minutes": 60
            })

    return {
        "speaking_count": len(sp_tests),
        "writing_count": len(wr_tests),
        "total": len(results),
        "tests": results
    }

@router.get("/tests/{test_id}")
def get_sw_test_detail(test_id: str):
    data = get_sw_data()
    all_tests = data.get("speaking_tests", []) + data.get("writing_tests", [])
    found = next((t for t in all_tests if t["id"] == test_id or t.get("slug") == test_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài thi Speaking/Writing")

    questions = []
    for q in found.get("questions", []):
        img_url = resolve_media_url(q.get("local_image") or q.get("image_url"))
        questions.append({
            "question_number": q.get("question_number"),
            "question_type": q.get("question_type"),
            "prompt": q.get("prompt"),
            "context": q.get("context"),
            "image_url": img_url,
            "options": q.get("options", {})
        })

    return {
        "id": found["id"],
        "name": found.get("name"),
        "slug": found.get("slug"),
        "total_questions": len(questions),
        "questions": questions
    }

from typing import Optional, List, Dict, Any
from fastapi import Depends
from auth import get_current_user_optional
import models
from ai_grading import (
    grade_speaking_question,
    grade_writing_question,
    grade_sw_full_session
)

@router.post("/grade-question")
def grade_single_sw_question(
    payload: Dict[str, Any],
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Grades an individual Speaking or Writing question using Gemini AI + Gia sư AI logic.
    Provides detailed score (0-200), criterion ratings (0-5.0), Gia sư AI comments, corrections, and model sample answer.
    """
    test_type = payload.get("test_type", "speaking").lower()
    user_name = user.full_name if user else "Học viên"
    target_score = user.profile.target_score if (user and user.profile) else 160
    user_answer = payload.get("user_answer", "").strip()

    question_data = {
        "question_number": payload.get("question_number", 1),
        "prompt": payload.get("prompt", ""),
        "context": payload.get("context", "")
    }

    if "speaking" in test_type:
        result = grade_speaking_question(
            question_data=question_data,
            user_transcript_or_notes=user_answer,
            user_name=user_name,
            target_score=target_score
        )
    else:
        result = grade_writing_question(
            question_data=question_data,
            user_text=user_answer,
            user_name=user_name,
            target_score=target_score
        )

    return result

@router.post("/grade-test")
def grade_full_sw_test(
    payload: Dict[str, Any],
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    """
    Grades the full Speaking or Writing test session using Gemini AI + Gia sư AI.
    """
    test_type = payload.get("test_type", "speaking")
    test_name = payload.get("test_name", "Bài thi Speaking/Writing")
    answers = payload.get("answers", [])
    user_name = user.full_name if user else "Học viên"
    target_score = user.profile.target_score if (user and user.profile) else 160

    result = grade_sw_full_session(
        test_type=test_type,
        test_name=test_name,
        answers=answers,
        user_name=user_name,
        target_score=target_score
    )

    return result


SHADOWING_FILE = WEB_READY_DIR / "speaking_shadowing_lessons.json"

_shadowing_cache = None

def get_shadowing_data():
    global _shadowing_cache
    if _shadowing_cache is None:
        if SHADOWING_FILE.exists():
            try:
                _shadowing_cache = json.loads(SHADOWING_FILE.read_text(encoding="utf-8"))
            except Exception:
                _shadowing_cache = {"total": 0, "lessons": []}
        else:
            _shadowing_cache = {"total": 0, "lessons": []}
    return _shadowing_cache

import re
import difflib

@router.get("/shadowing-lessons")
def list_shadowing_lessons(
    category: Optional[str] = Query(None),
    accent: Optional[str] = Query(None),
    level: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=1000)
):
    raw_data = get_shadowing_data()
    all_lessons = raw_data.get("lessons", [])

    filtered = all_lessons

    if category and category.lower() != "all":
        c_low = category.lower()
        if c_low == "business english":
            c_low = "business"
        filtered = [l for l in filtered if (l.get("category") or "").lower() == c_low]

    if accent and accent.lower() != "all":
        a_low = accent.lower()
        if "anh" in a_low or "uk" in a_low:
            filtered = [l for l in filtered if (l.get("accent") or "").upper() == "UK"]
        elif "mỹ" in a_low or "my" in a_low or "us" in a_low:
            filtered = [l for l in filtered if (l.get("accent") or "").upper() == "US"]
        else:
            filtered = [l for l in filtered if (l.get("accent") or "").lower() == a_low]

    if level and level.lower() != "all":
        lvl_up = level.strip().upper()
        filtered = [l for l in filtered if (l.get("level") or "").upper() == lvl_up]

    if search and search.strip():
        s_low = search.strip().lower()
        filtered = [
            l for l in filtered
            if s_low in (l.get("title") or "").lower()
            or s_low in (l.get("title_vi") or "").lower()
            or s_low in (l.get("channel_name") or "").lower()
            or s_low in (l.get("name") or "").lower()
        ]

    cat_counts = {
        "all": len(all_lessons),
        "pronunciation": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "pronunciation"),
        "toeic": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "toeic"),
        "conversation": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "conversation"),
        "movie": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "movie"),
        "vlog": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "vlog"),
        "business": sum(1 for l in all_lessons if (l.get("category") or "").lower() == "business")
    }

    accent_counts = {
        "all": len(all_lessons),
        "UK": sum(1 for l in all_lessons if (l.get("accent") or "").upper() == "UK"),
        "US": sum(1 for l in all_lessons if (l.get("accent") or "").upper() == "US")
    }

    total_matched = len(filtered)
    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    summaries = []
    for l in paged:
        yt_id = l.get("youtube_id")
        summaries.append({
            "id": l.get("id"),
            "raw_id": l.get("raw_id"),
            "title": l.get("title") or l.get("name"),
            "title_vi": l.get("title_vi"),
            "name": l.get("name"),
            "slug": l.get("slug"),
            "category": l.get("category") or "conversation",
            "channel_name": l.get("channel_name") or "BBC Learning English",
            "level": l.get("level") or "B1",
            "accent": l.get("accent") or "US",
            "youtube_id": yt_id,
            "thumbnail_url": l.get("thumbnail_url") or (f"https://img.youtube.com/vi/{yt_id}/mqdefault.jpg" if yt_id else None),
            "duration_seconds": l.get("duration_seconds") or 180,
            "duration_formatted": l.get("duration_formatted") or "3:00",
            "sentence_count": l.get("sentence_count") or len(l.get("sentences") or []) or len(l.get("questions") or [])
        })

    return {
        "total": total_matched,
        "page": page,
        "limit": limit,
        "category_counts": cat_counts,
        "accent_counts": accent_counts,
        "lessons": summaries
    }

@router.get("/shadowing-lessons/{lesson_id}")
def get_shadowing_lesson_detail(lesson_id: str):
    raw_data = get_shadowing_data()
    all_lessons = raw_data.get("lessons", [])
    found = next((l for l in all_lessons if l.get("id") == lesson_id or l.get("slug") == lesson_id or l.get("raw_id") == lesson_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài học Shadowing")
    return found

@router.post("/shadowing-evaluate")
def evaluate_shadowing(payload: Dict[str, Any]):
    target_text = payload.get("target_text", "").strip()
    user_speech = payload.get("user_speech", "").strip()

    def clean_tokens(text):
        clean = re.sub(r"[^\w\s']", " ", text or "").lower()
        return [t.strip() for t in clean.split() if t.strip()]

    target_tokens = clean_tokens(target_text)
    user_tokens = clean_tokens(user_speech)

    if not target_tokens:
        return {
            "accuracy": 0,
            "status": "retry",
            "feedback_vi": "Vui lòng chọn câu để luyện nói.",
            "words": []
        }

    matcher = difflib.SequenceMatcher(None, target_tokens, user_tokens)
    words_result = []
    correct_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for idx in range(i1, i2):
                words_result.append({
                    "word": target_tokens[idx],
                    "status": "correct"
                })
                correct_count += 1
        elif tag == "replace":
            for idx in range(i1, i2):
                spoken = user_tokens[j1 + (idx - i1)] if (j1 + (idx - i1)) < j2 else ""
                words_result.append({
                    "word": target_tokens[idx],
                    "spoken": spoken,
                    "status": "incorrect"
                })
        elif tag == "delete":
            for idx in range(i1, i2):
                words_result.append({
                    "word": target_tokens[idx],
                    "status": "missing"
                })
        elif tag == "insert":
            for idx in range(j1, j2):
                words_result.append({
                    "word": user_tokens[idx],
                    "status": "extra"
                })

    accuracy = round((correct_count / max(1, len(target_tokens))) * 100)

    if accuracy >= 90:
        feedback = "Xuất sắc! Phát âm và ngữ điệu rất chuẩn xác, tự nhiên như người bản xứ."
        status = "excellent"
    elif accuracy >= 70:
        feedback = "Khá tốt! Bạn đã phát âm đúng hầu hết các từ chính, hãy chú ý các từ bị thiếu/chưa rõ."
        status = "good"
    elif accuracy >= 40:
        feedback = "Cố gắng lên! Hãy nghe lại câu mẫu và nhại theo từng cụm ngắn 2-3 từ trước nhé."
        status = "needs_work"
    else:
        feedback = "Chưa nhận diện rõ âm thanh. Vui lòng nói to, rõ ràng và gần micro hơn."
        status = "retry"

    return {
        "accuracy": accuracy,
        "status": status,
        "feedback_vi": feedback,
        "words": words_result,
        "target_tokens_count": len(target_tokens),
        "user_tokens_count": len(user_tokens)
    }
