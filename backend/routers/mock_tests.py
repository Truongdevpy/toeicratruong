import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json
import os
from pathlib import Path
from database import get_db
import models
from typing import Optional
from auth import get_current_user, get_current_user_optional
from personalization_engine import calculate_toeic_score

router = APIRouter(prefix="/api/mock-tests", tags=["mock-tests"])

WEB_READY_DIR = (Path(__file__).resolve().parent.parent.parent / "data" / "data" / "web_ready").resolve()
CATALOG_PATH = WEB_READY_DIR / "tests_catalog.json"
MOCK_DIR = WEB_READY_DIR / "mock_tests"

def load_catalog():
    if CATALOG_PATH.exists():
        try:
            return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def compute_difficulty(t_name: str, t_type: str, t_id: str) -> str:
    name_lower = (t_name or "").lower()
    if "hard" in name_lower or "2024" in name_lower or "vol 2" in name_lower:
        return "Hard"
    if "old" in name_lower or t_type in ("sw_speaking", "sw_writing") or "sample" in name_lower:
        return "Easy"
    h = abs(hash(t_id or t_name)) % 3
    if h == 0:
        return "Easy"
    elif h == 1:
        return "Medium"
    else:
        return "Hard"

def get_topic_title(collection_id: str, name: str) -> str:
    col = (collection_id or "").lower()
    nm = (name or "").lower()
    if "2024" in nm or "2024" in col:
        return "ETS TOEIC 2024"
    if "vol 2" in nm:
        return "Crack TOEIC Series"
    if "speaking" in col or "speaking" in nm:
        return "TOEIC Speaking"
    if "writing" in col or "writing" in nm:
        return "TOEIC Writing"
    if "collection_2" in col:
        return "L&R Đề thi tổng hợp 2"
    if "collection_1" in col:
        return "L&R Đề thi tổng hợp 1"
    if "collection_3" in col:
        return "L&R Đề thi tổng hợp 3"
    if "ets" in col or "dautoeic" in col:
        return "ETS Authentic Practice"
    return "ETS Format Practice"

def resolve_media_url(local_rel_path, remote_url):
    if local_rel_path:
        clean = local_rel_path.replace("\\", "/")
        if clean.startswith("data/"):
            return f"/{clean}"
        return f"/data/{clean}"
    return remote_url or None

@router.get("")
def get_mock_tests(
    site: str = Query(None),
    test_type: str = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db)
):
    catalog = load_catalog()
    
    if not catalog:
        # Fallback to simulated tests if catalog missing
        catalog = [
            {"id": f"test-{i}", "name": f"Crack TOEIC Vol 2 - Test {String(i).padStart(2, '0')}", "site": "dautoeic", "total_questions": 200, "duration_minutes": 120, "test_type": "lr_full"}
            for i in range(1, 11)
        ]

    # Filter
    filtered = catalog
    if isinstance(site, str) and site:
        filtered = [t for t in filtered if t.get("site") == site]
    if isinstance(test_type, str) and test_type:
        filtered = [t for t in filtered if t.get("test_type") == test_type]
    if isinstance(search, str) and search:
        s_lower = search.lower()
        filtered = [t for t in filtered if s_lower in t.get("name", "").lower() or s_lower in t.get("slug", "").lower()]

    tests_summary = []
    for idx, t in enumerate(filtered):
        t_id = t["id"]
        t_name = t.get("name") or f"Test {idx + 1}"
        t_type = t.get("test_type", "lr_full")
        
        year = 2026
        if "2024" in t_name or "2024" in t.get("slug", ""):
            year = 2024
        elif "2023" in t_name or "2023" in t.get("slug", ""):
            year = 2023
        elif "old" in t.get("slug", "").lower():
            year = 2020

        sections = ["Listening (100 câu)", "Reading (100 câu)"]
        if t_type == "sw_speaking":
            sections = ["Speaking (11 câu)"]
        elif t_type == "sw_writing":
            sections = ["Writing (8 câu)"]

        tests_summary.append({
            "id": t_id,
            "title": t_name,
            "site": t.get("site", "study4"),
            "test_type": t_type,
            "year": year,
            "attempts": 750 + ((hash(t_id) % 500) if t_id else 0),
            "avg_score": 615 + ((hash(t_name) % 60) if t_name else 0),
            "total_questions": t.get("total_questions", 200),
            "duration_minutes": t.get("duration_minutes", 120),
            "topic": get_topic_title(t.get("collection_id"), t_name),
            "parts": [1, 2, 3, 4, 5, 6, 7] if t_type == "lr_full" else ([11] if t_type == "sw_speaking" else [8]),
            "difficulty": compute_difficulty(t_name, t_type, t_id),
            "is_vip": not (idx == 0 or "test 01" in t_name.lower() or "test 1" in t_name.lower() or "sample" in t_name.lower()),
            "sections": sections
        })

    tests_summary.sort(key=lambda t: t["title"].lower())

    return {
        "series": "TOEIC Ra Trường - Kho đề thi chuẩn ETS toàn diện",
        "total_tests": len(tests_summary),
        "tests": tests_summary
    }

@router.get("/{test_id}")
def get_mock_test_detail(
    test_id: str,
    db: Session = Depends(get_db),
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    if not user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để vào phòng thi thử TOEIC.")

    clean_id = test_id.removesuffix('.json').lower()
    is_vip_user = user.role in ["vip", "admin"] or getattr(user, "is_vip", False)
    is_basic_test = (
        clean_id in ["test-1", "test_01", "test-01", "ets-2024-test-01"]
        or "test 01" in clean_id
        or "test 1" in clean_id
        or "test1" in clean_id
        or "sample" in clean_id
    )
    if not is_vip_user and not is_basic_test:
        raise HTTPException(
            status_code=403,
            detail="Gói Thường chỉ được thi thử Đề cơ bản Test 01. Vui lòng nâng cấp VIP Pro để mở khóa toàn bộ đề thi!"
        )
    clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(test_id or "").removesuffix(".json"))
    if not clean_id:
        raise HTTPException(status_code=404, detail="Đề thi không tồn tại")

    from routers.tests import find_test_file
    target_file = find_test_file(clean_id)

    if target_file and target_file.exists():
        try:
            pkg = json.loads(target_file.read_text(encoding="utf-8"))
            meta = pkg.get("meta", {})
            raw_qs = pkg.get("questions", [])
            
            # Format questions
            questions = []
            for q in raw_qs:
                opts = q.get("options") or {}
                part_num = q.get("part", 1)
                section = "listening" if part_num <= 4 else "reading"
                
                audio_url = resolve_media_url(q.get("local_audio"), q.get("audio_url"))
                image_url = resolve_media_url(q.get("local_image"), q.get("image_url"))

                questions.append({
                    "id": q.get("id"),
                    "question_number": q.get("question_number"),
                    "part": part_num,
                    "section": section,
                    "question_text": q.get("question_text") or f"Câu hỏi {q.get('question_number')}",
                    "option_a": opts.get("A"),
                    "option_b": opts.get("B"),
                    "option_c": opts.get("C"),
                    "option_d": opts.get("D"),
                    "audio_url": audio_url,
                    "image_url": image_url,
                    "passage_text": q.get("passage_text"),
                    "transcript": q.get("transcript") or "",
                    "evidence": q.get("evidence") or "",
                    "evidence_vi": q.get("evidence_vi") or "",
                    "paraphrase": q.get("paraphrase") or "",
                    "explanation": q.get("explanation"),
                    "correct_answer": q.get("correct_answer")
                })

            return {
                "test_id": test_id,
                "title": meta.get("name") or f"Đề thi TOEIC {test_id}",
                "total_questions": len(questions),
                "duration_seconds": meta.get("duration_minutes", 120) * 60,
                "questions": questions
            }
        except Exception as e:
            pass

    # Fallback to cached questions in database
    cached_qs = db.query(models.CachedQuestion).order_by(models.CachedQuestion.question_number.asc()).all()
    questions = []
    for i in range(1, 201):
        part_num = 1 if i <= 6 else (2 if i <= 31 else (3 if i <= 70 else (4 if i <= 100 else (5 if i <= 130 else (6 if i <= 146 else 7)))))
        section = "listening" if i <= 100 else "reading"
        matched = next((q for q in cached_qs if q.question_number == i or (q.part == part_num and q.section == section)), None)
        questions.append({
            "id": matched.id if matched else f"sim-{test_id}-q{i}",
            "question_number": i,
            "part": part_num,
            "section": section,
            "question_text": matched.question_text if matched else f"Question {i}",
            "option_a": matched.option_a if matched else "Option A",
            "option_b": matched.option_b if matched else "Option B",
            "option_c": matched.option_c if matched else "Option C",
            "option_d": matched.option_d if matched else ("Option D" if part_num != 2 else None),
            "audio_url": matched.audio_url if matched else None,
            "image_url": matched.image_url if matched else None,
            "passage_text": None,
            "correct_answer": matched.correct_answer if matched else "A"
        })

    return {
        "test_id": test_id,
        "title": f"TOEIC Practice Test - {test_id.upper()}",
        "total_questions": len(questions),
        "duration_seconds": 7200,
        "questions": questions
    }

@router.post("/{test_id}/submit")
def submit_mock_test(
    test_id: str,
    data: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answers = data.get("answers", {})  # question_id or number -> choice
    time_spent = data.get("time_spent_seconds", 7200)

    # Load test detail to grade accurately
    clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(test_id or "").removesuffix(".json"))
    from routers.tests import find_test_file
    target_file = find_test_file(clean_id) if clean_id else None

    real_qs = []
    if target_file and target_file.exists():
        try:
            pkg = json.loads(target_file.read_text(encoding="utf-8"))
            real_qs = pkg.get("questions", [])
        except Exception:
            pass

    listening_correct = 0
    reading_correct = 0
    part_counts = {p: {"correct": 0, "total": 0} for p in range(1, 8)}
    review_items = []

    total_q_count = len(real_qs) if real_qs else 200

    for idx in range(total_q_count):
        if real_qs:
            q = real_qs[idx]
            q_id = q.get("id")
            q_num = q.get("question_number", idx + 1)
            part_num = q.get("part", 1)
            section = "listening" if part_num <= 4 else "reading"
            correct_key = (q.get("correct_answer") or "A").strip().upper()
            expl = q.get("explanation") or f"Đáp án đúng là {correct_key}."
            q_audio = resolve_media_url(q.get("local_audio"), q.get("audio_url"))
            q_image = resolve_media_url(q.get("local_image"), q.get("image_url"))
            opts = q.get("options") or {}
            opt_a = opts.get("A") or q.get("option_a") or ""
            opt_b = opts.get("B") or q.get("option_b") or ""
            opt_c = opts.get("C") or q.get("option_c") or ""
            opt_d = opts.get("D") or q.get("option_d") or ""
            options_dict = {"A": opt_a, "B": opt_b, "C": opt_c}
            if opt_d:
                options_dict["D"] = opt_d
            q_text = q.get("question_text") or f"Câu hỏi {q_num}"
            passage = q.get("passage_text") or ""
            trans = q.get("transcript") or ""
            v_trans = q.get("instruction_translation") or q.get("vietnamese_translation") or ""
        else:
            q_num = idx + 1
            part_num = 1 if q_num <= 6 else (2 if q_num <= 31 else (3 if q_num <= 70 else (4 if q_num <= 100 else (5 if q_num <= 130 else (6 if q_num <= 146 else 7)))))
            section = "listening" if q_num <= 100 else "reading"
            q_id = f"sim-{test_id}-q{q_num}"
            correct_key = ["A", "B", "C", "D"][(q_num * 3 + 1) % (3 if part_num == 2 else 4)]
            expl = f"Đáp án đúng là {correct_key}."
            q_audio = None
            q_image = None
            options_dict = {"A": "Option A", "B": "Option B", "C": "Option C"}
            if part_num != 2:
                options_dict["D"] = "Option D"
            q_text = f"Question {q_num}"
            passage = ""
            trans = ""
            v_trans = ""

        user_choice = (answers.get(q_id) or answers.get(str(q_num)) or answers.get(f"q_{q_num}") or "").strip().upper()
        is_correct = (user_choice == correct_key and bool(user_choice))

        if part_num in part_counts:
            part_counts[part_num]["total"] += 1
            if is_correct:
                part_counts[part_num]["correct"] += 1

        if is_correct:
            if section == "listening":
                listening_correct += 1
            else:
                reading_correct += 1

        review_items.append({
            "question_number": q_num,
            "part": part_num,
            "section": section,
            "question_text": q_text,
            "options": options_dict,
            "passage_text": passage,
            "transcript": trans,
            "user_choice": user_choice,
            "correct_answer": correct_key,
            "is_correct": is_correct,
            "explanation": expl,
            "evidence": (q.get("evidence") or "") if real_qs else "",
            "evidence_vi": (q.get("evidence_vi") or "") if real_qs else "",
            "paraphrase": (q.get("paraphrase") or "") if real_qs else "",
            "vietnamese_translation": v_trans,
            "audio_url": q_audio,
            "image_url": q_image
        })

    l_total = sum(part_counts[p]["total"] for p in [1, 2, 3, 4]) or 100
    r_total = sum(part_counts[p]["total"] for p in [5, 6, 7]) or 100

    total_score, l_score, r_score = calculate_toeic_score(
        listening_correct, l_total,
        reading_correct, r_total
    )

    part_breakdown = {}
    for p in range(1, 8):
        cnt = part_counts[p]
        pct = round((cnt["correct"] / max(1, cnt["total"])) * 100, 1)
        part_breakdown[f"part_{p}"] = {
            "part": p,
            "correct": cnt["correct"],
            "total": cnt["total"],
            "accuracy": pct
        }

    sorted_parts = sorted(part_breakdown.values(), key=lambda x: x["accuracy"])
    weakest = sorted_parts[0] if sorted_parts else {"part": 5, "accuracy": 0}
    strongest = sorted_parts[-1] if sorted_parts else {"part": 1, "accuracy": 100}

    if user and user.profile:
        user.profile.current_score = total_score
        user.profile.today_minutes_completed += min(120, int(time_spent / 60))
        db.commit()

    return {
        "test_id": test_id,
        "total_score": total_score,
        "listening_score": l_score,
        "reading_score": r_score,
        "listening_correct": f"{listening_correct}/{l_total}",
        "reading_correct": f"{reading_correct}/{r_total}",
        "time_spent_minutes": round(time_spent / 60, 1),
        "part_breakdown": part_breakdown,
        "strongest_part": f"Part {strongest['part']} ({strongest['accuracy']}%)",
        "weakest_part": f"Part {weakest['part']} ({weakest['accuracy']}%)",
        "ai_recommendation": f"Tập trung cải thiện Part {weakest['part']} ({weakest['accuracy']}% đúng) trên Practice Hub.",
        "review_answers": review_items
    }
