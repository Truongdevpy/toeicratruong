import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import json
from pathlib import Path
from database import get_db
import models
from typing import Optional
from auth import get_current_user, get_current_user_optional
from personalization_engine import calculate_toeic_score
from media_resolver import resolve_media_url

router = APIRouter(tags=["tests"])

def clean_question_and_options(part: int, q_text: str, options: dict, q_num: int = None):
    cleaned_q = (q_text or "").strip()
    
    if part == 1:
        if not cleaned_q or re.match(r"^[A-D.\s]+$", cleaned_q) or cleaned_q.startswith("Câu"):
            cleaned_q = "Nghe 4 phương án và chọn câu miêu tả đúng nhất cho bức tranh."
    elif part == 2:
        if not cleaned_q or re.match(r"^[A-D.\s]+$", cleaned_q) or cleaned_q.startswith("Câu"):
            cleaned_q = "Nghe câu hỏi và chọn câu phản hồi phù hợp nhất trong 3 đáp án."
    elif part == 5:
        m = re.search(r"\s+[A-D][\.\)]\s+.*$", cleaned_q)
        if m:
            cleaned_q = cleaned_q[:m.start()].strip()
        if not cleaned_q or re.match(r"^[A-D.\s]+$", cleaned_q):
            cleaned_q = f"Chọn từ thích hợp nhất để hoàn thành câu."
    elif part == 6:
        if re.match(r"^\(?[A-D][\.\)\:\-]", cleaned_q) or not cleaned_q or re.match(r"^[A-D.\s]+$", cleaned_q):
            cleaned_q = f"Chọn từ hoặc câu thích hợp nhất để điền vào chỗ trống [{q_num or ''}]:".replace("[]", "").strip()
        else:
            m = re.search(r"\s+[A-D][\.\)]\s+.*$", cleaned_q)
            if m:
                cleaned_q = cleaned_q[:m.start()].strip()
    elif part == 7:
        m = re.search(r"\s+[A-D][\.\)]\s+.*$", cleaned_q)
        if m:
            cleaned_q = cleaned_q[:m.start()].strip()

    cleaned_opts = {}
    for letter, opt_val in options.items():
        if part == 2 and letter == "D":
            continue
        if not opt_val:
            cleaned_opts[letter] = ""
            continue
        val = str(opt_val).strip()
        val = re.sub(rf"^\(?{letter}[\.\)\:\-]?\s*", "", val, flags=re.I).strip()
        cleaned_opts[letter] = val

    return cleaned_q, cleaned_opts


BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
CATALOG_PATH = WEB_READY_DIR / "tests_catalog.json"
MOCK_DIR = WEB_READY_DIR / "mock_tests"

_catalog_cache = None

def get_catalog(force_reload: bool = False):
    global _catalog_cache
    if _catalog_cache is None or force_reload:
        if CATALOG_PATH.exists():
            try:
                _catalog_cache = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
            except Exception as e:
                print("Error loading tests_catalog:", e)
                _catalog_cache = []
        else:
            _catalog_cache = []
    return _catalog_cache



def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s or '')]

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


def is_full_tape_audio(url: str, overall: str = None) -> bool:
    if not url:
        return False
    from pathlib import Path
    u_base = Path(url).name.lower()
    if overall:
        if url == overall:
            return True
        o_base = Path(overall).name.lower()
        if u_base and o_base and u_base == o_base:
            return True
    # If the filename is a known full continuous tape pattern without question/passage slicing
    if (
        re.match(r"^t\d+_audio", u_base)
        or re.match(r"^test\d+\.mp3", u_base)
        or "economy_toeic" in u_base
        or "sample_toeic" in u_base
        or "new_real_toeic" in u_base
        or "eco_toeic" in u_base
    ):
        if not any(k in u_base for k in ["part_", "q0", "passage_"]):
            return True
    return False

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

@router.get("")
def list_tests(
    site: str = Query(None),
    test_type: str = Query(None),
    collection_id: str = Query(None),
    difficulty: str = Query(None),
    part: int = Query(None),
    search: str = Query(None),
    sort: str = Query("name_asc"),
    limit: int = Query(20, ge=1, le=300),
    page: int = Query(1, ge=1)
):
    catalog = get_catalog()
    filtered = catalog

    if site and site != "all":
        filtered = [t for t in filtered if t.get("site") == site]

    if test_type and test_type != "all":
        filtered = [t for t in filtered if t.get("test_type") == test_type]

    if collection_id and collection_id != "all":
        filtered = [t for t in filtered if t.get("collection_id") == collection_id]

    if difficulty and difficulty != "all":
        filtered = [
            t for t in filtered
            if compute_difficulty(t.get("name", ""), t.get("test_type", "lr_full"), t["id"]).lower() == difficulty.lower()
        ]

    if part:
        if part in range(1, 8):
            filtered = [t for t in filtered if t.get("test_type", "lr_full") == "lr_full"]
        elif part == 11:
            filtered = [t for t in filtered if t.get("test_type") == "sw_speaking"]
        elif part == 8:
            filtered = [t for t in filtered if t.get("test_type") == "sw_writing"]

    if search:
        kw = search.lower().strip()
        def matches(t):
            t_name = t.get("name", "").lower()
            slug = t.get("slug", "").lower()
            t_id = t.get("id", "").lower()
            topic = get_topic_title(t.get("collection_id"), t.get("name", "")).lower()
            diff = compute_difficulty(t.get("name", ""), t.get("test_type", "lr_full"), t["id"]).lower()
            return kw in t_name or kw in slug or kw in t_id or kw in topic or kw in diff
        filtered = [t for t in filtered if matches(t)]

    # Apply natural A-Z sorting
    if sort == "name_desc":
        filtered = sorted(filtered, key=lambda t: natural_sort_key(t.get("name", "")), reverse=True)
    elif sort == "newest":
        filtered = sorted(filtered, key=lambda t: t.get("year", 2026), reverse=True)
    elif sort == "oldest":
        filtered = sorted(filtered, key=lambda t: t.get("year", 2020))
    else:
        # Default: natural A-Z sort
        filtered = sorted(filtered, key=lambda t: natural_sort_key(t.get("name", "")))

    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    result = []
    for idx, t in enumerate(paged):
        t_name = t.get("name", "TOEIC Test")
        t_type = t.get("test_type", "lr_full")
        year = 2026
        if "2024" in t_name or "2024" in t.get("slug", ""):
            year = 2024
        elif "2023" in t_name or "2023" in t.get("slug", ""):
            year = 2023
        elif "old" in t.get("slug", "").lower():
            year = 2020

        sections = ["Listening (100 câu)", "Reading (100 câu)"]
        parts = [1, 2, 3, 4, 5, 6, 7]
        if t_type == "sw_speaking":
            sections = ["Speaking (11 câu)"]
            parts = [11]
        elif t_type == "sw_writing":
            sections = ["Writing (8 câu)"]
            parts = [8]

        has_audio = bool(t.get("has_listening_audio") or t.get("overall_audio") or t_type in ("lr_full", "sw_speaking"))
        has_image = bool(t_type in ("lr_full", "reading_practice", "sw_speaking") or any(p in parts for p in (1, 3, 4, 7)))

        result.append({
            "id": t["id"],
            "test_id": t.get("test_id", t["id"]),
            "title": t_name,
            "site": t.get("site", "study4"),
            "test_type": t_type,
            "collection_id": t.get("collection_id"),
            "topic": get_topic_title(t.get("collection_id"), t_name),
            "year": year,
            "total_questions": t.get("total_questions", 200),
            "duration_minutes": t.get("duration_minutes", 120),
            "difficulty": compute_difficulty(t_name, t_type, t["id"]),
            "is_vip": not (idx == 0 or "test 01" in t_name.lower() or "test 1" in t_name.lower() or "sample" in t_name.lower()),
            "sections": sections,
            "parts": parts,
            "has_audio": has_audio,
            "has_image": has_image,
            "attempts": 850 + (abs(hash(t["id"])) % 650)
        })

    return {
        "total": len(filtered),
        "page": page,
        "limit": limit,
        "tests": result
    }

def find_test_file(test_id: str):
    clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(test_id or "").removesuffix(".json"))
    if not clean_id:
        return None

    def _safe_mock_file(path_obj: Path):
        try:
            if path_obj.exists() and path_obj.resolve().is_relative_to(MOCK_DIR.resolve()):
                return path_obj
        except (ValueError, RuntimeError):
            pass
        return None

    # 1. Direct file check
    p = _safe_mock_file(MOCK_DIR / f"{clean_id}.json")
    if p:
        return p

    # 2. Match by catalog entry
    catalog = get_catalog()
    for t in catalog:
        if (
            t.get("id") == clean_id
            or t.get("test_id") == clean_id
            or t.get("slug") == clean_id
            or t.get("file_name", "").removesuffix(".json") == clean_id
        ):
            candidate = _safe_mock_file(MOCK_DIR / t.get("file_name", f"{t['id']}.json"))
            if candidate:
                return candidate
            p2 = _safe_mock_file(MOCK_DIR / f"{t['id']}.json")
            if p2:
                return p2

    # 3. Handle numeric index like test-1
    if clean_id.startswith("test-"):
        parts = clean_id.split("-")
        if len(parts) >= 2 and parts[1].isdigit():
            idx = int(parts[1]) - 1
            if 0 <= idx < len(catalog):
                entry = catalog[idx]
                p3 = _safe_mock_file(MOCK_DIR / entry.get("file_name", f"{entry['id']}.json"))
                if p3:
                    return p3

    return None

@router.get("/{test_id}")
def get_test_detail(
    test_id: str,
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

    file_path = find_test_file(test_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đề thi: {test_id}")

    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc dữ liệu đề thi: {str(e)}")

    meta = data.get("meta", {})
    raw_questions = data.get("questions", [])
    raw_passages = data.get("passages", [])

    # Map passages by id if present
    passages_map = {}
    if isinstance(raw_passages, list):
        for p in raw_passages:
            if isinstance(p, dict) and "id" in p:
                passages_map[p["id"]] = {
                    "text": p.get("passage_text") or p.get("text") or "",
                    "audio": p.get("local_audio") or p.get("audio_url") or p.get("audio"),
                    "image": p.get("local_image") or p.get("image_url") or p.get("image")
                }

    resolved_questions = []
    # Identify overall test audio if available
    pkg_overall_audio = data.get("overall_audio") or meta.get("overall_audio")
    overall_audio = resolve_media_url(pkg_overall_audio) if pkg_overall_audio else None

    seen_q_signatures = set()
    for q in raw_questions:
        part_num = q.get("part", 1)
        q_num = q.get("question_number", len(resolved_questions) + 1)
        q_id = str(q.get("id") or f"{test_id}_{q_num}").strip()
        q_text = str(q.get("question_text") or q.get("question") or "").strip()
        sig = f"{q_id}_{q_num}"
        if sig in seen_q_signatures:
            continue
        seen_q_signatures.add(sig)
        if part_num in [2, 5] and q_text and len(q_text) > 15:
            if q_text in seen_q_signatures:
                continue
            seen_q_signatures.add(q_text)
        q_num = q.get("question_number", len(resolved_questions) + 1)
        section = "listening" if part_num <= 4 else "reading"

        p_obj = passages_map.get(q.get("passage_id"))
        passage = q.get("passage_text") or ""
        if not passage and p_obj:
            passage = p_obj.get("text", "")

        # Resolve media: reading sections (Part 5, 6, 7) must NEVER have audio
        if part_num >= 5:
            q_audio = None
        else:
            raw_aud = q.get("local_audio") or q.get("audio_url") or q.get("audio")
            if not raw_aud and p_obj:
                raw_aud = p_obj.get("audio")
            q_audio = resolve_media_url(raw_aud) if raw_aud else None
            # Safeguard: Do not assign full continuous 45-min test tape to single questions
            if q_audio and is_full_tape_audio(q_audio, overall_audio):
                q_audio = None

        raw_img = q.get("local_image") or q.get("image_url") or q.get("image")
        if not raw_img and p_obj:
            raw_img = p_obj.get("image")
        q_image = resolve_media_url(raw_img) or None

        opts = q.get("options") or {}

        opt_a = opts.get("A") or q.get("option_a") or ""
        opt_b = opts.get("B") or q.get("option_b") or ""
        opt_c = opts.get("C") or q.get("option_c") or ""
        opt_d = opts.get("D") or q.get("option_d") or ""
        options_dict = {"A": opt_a, "B": opt_b, "C": opt_c}
        if opt_d:
            options_dict["D"] = opt_d

        raw_q_text = q.get("question_text") or q.get("question") or f"Câu hỏi {q_num}"
        cleaned_q_text, cleaned_options = clean_question_and_options(part_num, raw_q_text, options_dict, q_num)

        resolved_questions.append({
            "id": q.get("id") or f"{test_id}_{q_num}",
            "question_number": q_num,
            "part": part_num,
            "section": section,
            "question_text": cleaned_q_text,
            "options": cleaned_options,
            "option_a": cleaned_options.get("A", ""),
            "option_b": cleaned_options.get("B", ""),
            "option_c": cleaned_options.get("C", ""),
            "option_d": cleaned_options.get("D", ""),
            "correct_answer": q.get("correct_answer") or q.get("answer") or "A",
            "audio_url": q_audio,
            "image_url": q_image,
            "passage_text": passage,
            "transcript": q.get("transcript") or "",
            "evidence": q.get("evidence") or "",
            "evidence_vi": q.get("evidence_vi") or "",
            "paraphrase": q.get("paraphrase") or "",
            "explanation": q.get("explanation") or "",
            "vietnamese_translation": q.get("instruction_translation") or q.get("vietnamese_translation") or ""
        })

    catalog = get_catalog()
    catalog_entry = next((t for t in catalog if t.get("id") == clean_id or t.get("test_id") == clean_id or t.get("slug") == clean_id), None)
    test_title = meta.get("name") or (catalog_entry.get("name") if catalog_entry else None) or f"Đề thi TOEIC {test_id}"
    duration_min = meta.get("duration_minutes") or (catalog_entry.get("duration_minutes") if catalog_entry else 120)
    test_type = meta.get("test_type") or (catalog_entry.get("test_type") if catalog_entry else "lr_full")

    return {
        "test_id": test_id,
        "title": test_title,
        "test_type": test_type,
        "total_questions": len(resolved_questions),
        "duration_minutes": meta.get("duration_minutes", 120),
        "duration_seconds": meta.get("duration_minutes", 120) * 60,
        "overall_audio": overall_audio,
        "passages": raw_passages,
        "questions": resolved_questions
    }

@router.post("/{test_id}/submit")
def submit_test(
    test_id: str,
    payload: dict,
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    file_path = find_test_file(test_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đề thi: {test_id}")

    data = json.loads(file_path.read_text(encoding="utf-8"))
    raw_questions = data.get("questions", [])
    raw_passages = data.get("passages", [])
    meta = data.get("meta", {})
    pkg_overall_audio = data.get("overall_audio") or meta.get("overall_audio")
    overall_audio = resolve_media_url(pkg_overall_audio) if pkg_overall_audio else None

    passages_map = {}
    if isinstance(raw_passages, list):
        for p in raw_passages:
            if isinstance(p, dict) and "id" in p:
                passages_map[p["id"]] = {
                    "text": p.get("passage_text") or p.get("text") or "",
                    "audio": p.get("local_audio") or p.get("audio_url") or p.get("audio"),
                    "image": p.get("local_image") or p.get("image_url") or p.get("image")
                }

    mode = payload.get("mode", "full")
    target_part = payload.get("target_part")
    question_ids = payload.get("question_ids") or []

    # Filter target questions if user practiced a specific section or part
    target_questions = raw_questions
    if mode == "listening":
        target_questions = [q for q in raw_questions if q.get("part", 1) <= 4]
    elif mode == "reading":
        target_questions = [q for q in raw_questions if q.get("part", 1) >= 5]
    elif mode == "part" and target_part:
        target_questions = [q for q in raw_questions if q.get("part") == int(target_part)]
    elif question_ids:
        q_id_set = set(str(qid) for qid in question_ids)
        target_questions = [
            q for idx, q in enumerate(raw_questions)
            if str(q.get("id")) in q_id_set or str(q.get("question_number", idx + 1)) in q_id_set
        ]

    answers = payload.get("user_answers") or payload.get("answers") or {}
    time_spent = payload.get("time_spent_seconds", 7200)

    listening_correct = 0
    reading_correct = 0
    part_counts = {p: {"correct": 0, "total": 0} for p in range(1, 8)}

    review_answers = []
    for idx, q in enumerate(target_questions):
        part_num = q.get("part", 1)
        q_num = q.get("question_number", idx + 1)
        section = "listening" if part_num <= 4 else "reading"
        
        q_id = q.get("id") or f"{test_id}_{q_num}"
        user_choice = (
            answers.get(q_id) or
            answers.get(str(q_num)) or
            answers.get(q_num) or
            answers.get(f"q_{q_num}") or
            answers.get(f"sim-{test_id}-q{q_num}") or
            ""
        ).strip().upper()
        correct_ans = (q.get("correct_answer") or q.get("answer") or "A").strip().upper()

        is_correct = (user_choice.strip().upper() == correct_ans)
        
        part_counts[part_num]["total"] += 1
        if is_correct:
            part_counts[part_num]["correct"] += 1
            if section == "listening":
                listening_correct += 1
            else:
                reading_correct += 1

        opts = q.get("options") or {}
        opt_a = opts.get("A") or q.get("option_a") or ""
        opt_b = opts.get("B") or q.get("option_b") or ""
        opt_c = opts.get("C") or q.get("option_c") or ""
        opt_d = opts.get("D") or q.get("option_d") or ""
        options_dict = {"A": opt_a, "B": opt_b, "C": opt_c}
        if opt_d:
            options_dict["D"] = opt_d

        p_obj = passages_map.get(q.get("passage_id"))
        sub_passage = q.get("passage_text") or ""
        if not sub_passage and p_obj:
            sub_passage = p_obj.get("text", "")

        if part_num >= 5:
            sub_audio = None
        else:
            raw_aud = q.get("local_audio") or q.get("audio_url") or q.get("audio")
            if not raw_aud and p_obj:
                raw_aud = p_obj.get("audio")
            sub_audio = resolve_media_url(raw_aud) if raw_aud else None
            if sub_audio and is_full_tape_audio(sub_audio, overall_audio):
                sub_audio = None

        raw_img = q.get("local_image") or q.get("image_url") or q.get("image")
        if not raw_img and p_obj:
            raw_img = p_obj.get("image")
        sub_image = resolve_media_url(raw_img) or None

        review_answers.append({
            "question_number": q_num,
            "part": part_num,
            "section": section,
            "question_text": q.get("question_text") or q.get("question") or f"Câu hỏi {q_num}",
            "options": options_dict,
            "passage_text": sub_passage,
            "transcript": q.get("transcript") or "",
            "user_choice": user_choice,
            "correct_answer": correct_ans,
            "is_correct": is_correct,
            "explanation": q.get("explanation") or f"Đáp án đúng là {correct_ans}.",
            "evidence": q.get("evidence") or "",
            "evidence_vi": q.get("evidence_vi") or "",
            "paraphrase": q.get("paraphrase") or "",
            "vietnamese_translation": q.get("instruction_translation") or q.get("vietnamese_translation") or "",
            "audio_url": sub_audio,
            "image_url": sub_image
        })

    meta = data.get("meta", {})
    catalog = get_catalog()
    catalog_entry = next((t for t in catalog if t.get("id") == test_id or t.get("test_id") == test_id or t.get("slug") == test_id), None)
    test_type = meta.get("test_type") or (catalog_entry.get("test_type") if catalog_entry else "lr_full")

    if test_type in ("sw_speaking", "sw_writing"):
        completed_count = sum(1 for q in review_answers if q.get("user_choice"))
        sw_score = min(200, max(40, int((completed_count / max(1, len(raw_questions))) * 160) + 40))
        level_str = "Level 8 (190-200)" if sw_score >= 190 else ("Level 7 (160-180)" if sw_score >= 160 else ("Level 6 (130-150)" if sw_score >= 130 else "Level 5 (110-120)"))
        return {
            "test_id": test_id,
            "test_type": test_type,
            "total_score": sw_score,
            "sw_score": sw_score,
            "sw_level": level_str,
            "tasks_completed": f"{completed_count}/{len(raw_questions)}",
            "time_spent_minutes": round(time_spent / 60, 1),
            "ai_recommendation": "Phần phát âm, cấu trúc diễn đạt và phản xạ của bạn đã hoàn thành tốt các câu hỏi tiêu chuẩn ETS. Hãy tiếp tục luyện mở rộng collocations để tăng điểm mượt mà.",
            "review_answers": review_answers,
            "overall_audio": overall_audio
        }

    l_total = sum(part_counts[p]["total"] for p in [1, 2, 3, 4])
    r_total = sum(part_counts[p]["total"] for p in [5, 6, 7])

    part_breakdown = {}
    for p in range(1, 8):
        c = part_counts[p]
        if c["total"] > 0:
            pct = round((c["correct"] / c["total"]) * 100, 1)
            part_breakdown[f"part_{p}"] = {
                "part": p,
                "correct": c["correct"],
                "total": c["total"],
                "accuracy": pct
            }

    sorted_parts = sorted(part_breakdown.values(), key=lambda x: x["accuracy"])
    weakest = sorted_parts[0] if sorted_parts else {"part": 5, "accuracy": 0}
    strongest = sorted_parts[-1] if sorted_parts else {"part": 1, "accuracy": 100}

    # Handle scores according to practice mode
    if mode == "listening":
        _, l_score, _ = calculate_toeic_score(listening_correct, max(1, l_total), 0, 0)
        res_data = {
            "test_id": test_id,
            "mode": mode,
            "total_score": l_score,
            "listening_score": l_score,
            "reading_score": None,
            "listening_correct": f"{listening_correct}/{l_total}",
            "reading_correct": None,
            "time_spent_minutes": round(time_spent / 60, 1),
            "part_breakdown": part_breakdown,
            "strongest_part": f"Part {strongest['part']} ({strongest['accuracy']}%)",
            "weakest_part": f"Part {weakest['part']} ({weakest['accuracy']}%)",
            "ai_recommendation": f"Kỹ năng Listening của bạn đạt {l_score}/495 điểm. Hãy tiếp tục luyện nghe thêm các hội thoại Part 3 và bài nói Part 4.",
            "review_answers": review_answers,
            "overall_audio": overall_audio
        }
    elif mode == "reading":
        _, _, r_score = calculate_toeic_score(0, 0, reading_correct, max(1, r_total))
        res_data = {
            "test_id": test_id,
            "mode": mode,
            "total_score": r_score,
            "listening_score": None,
            "reading_score": r_score,
            "listening_correct": None,
            "reading_correct": f"{reading_correct}/{r_total}",
            "time_spent_minutes": round(time_spent / 60, 1),
            "part_breakdown": part_breakdown,
            "strongest_part": f"Part {strongest['part']} ({strongest['accuracy']}%)",
            "weakest_part": f"Part {weakest['part']} ({weakest['accuracy']}%)",
            "ai_recommendation": f"Kỹ năng Reading của bạn đạt {r_score}/495 điểm. Hãy chú trọng nâng cao tốc độ đọc hiểu ở Part 7.",
            "review_answers": review_answers,
            "overall_audio": overall_audio
        }
    elif mode == "part" and target_part:
        p_num = int(target_part)
        p_data = part_breakdown.get(f"part_{p_num}", {"correct": listening_correct + reading_correct, "total": len(target_questions), "accuracy": 0})
        res_data = {
            "test_id": test_id,
            "mode": mode,
            "target_part": p_num,
            "total_score": f"{p_data['correct']}/{p_data['total']} ({p_data.get('accuracy', 0)}%)",
            "listening_score": None,
            "reading_score": None,
            "listening_correct": f"{p_data['correct']}/{p_data['total']}" if p_num <= 4 else None,
            "reading_correct": f"{p_data['correct']}/{p_data['total']}" if p_num >= 5 else None,
            "time_spent_minutes": round(time_spent / 60, 1),
            "part_breakdown": part_breakdown,
            "strongest_part": f"Part {p_num} ({p_data.get('accuracy', 0)}%)",
            "weakest_part": f"Part {p_num} ({p_data.get('accuracy', 0)}%)",
            "ai_recommendation": f"Bạn đã hoàn thành Part {p_num} với độ chính xác {p_data.get('accuracy', 0)}%. Hãy xem lại các câu sai bên dưới.",
            "review_answers": review_answers,
            "overall_audio": None
        }
    else:
        # Full exam mode
        total_score, l_score, r_score = calculate_toeic_score(
            listening_correct, l_total or 100,
            reading_correct, r_total or 100
        )
        res_data = {
            "test_id": test_id,
            "mode": "full",
            "total_score": total_score,
            "listening_score": l_score,
            "reading_score": r_score,
            "listening_correct": f"{listening_correct}/{l_total or 100}",
            "reading_correct": f"{reading_correct}/{r_total or 100}",
            "time_spent_minutes": round(time_spent / 60, 1),
            "part_breakdown": part_breakdown,
            "strongest_part": f"Part {strongest['part']} ({strongest['accuracy']}%)",
            "weakest_part": f"Part {weakest['part']} ({weakest['accuracy']}%)",
            "ai_recommendation": f"Kỹ năng Part {weakest['part']} của bạn đạt {weakest['accuracy']}%, hãy tập trung luyện thêm các bài tập dạng này trên Practice Hub.",
            "review_answers": review_answers,
            "overall_audio": overall_audio
        }

    # Persist attempt and questions to database
    try:
        tot_correct = listening_correct + reading_correct
        tot_q = len(target_questions) or 200
        raw_tot = res_data.get("total_score")
        numeric_total_score = raw_tot if isinstance(raw_tot, int) else (int(res_data.get("listening_score") or 0) + int(res_data.get("reading_score") or 0))

        test_attempt = models.TestAttempt(
            user_id=user.id if user else 1,
            test_id=test_id,
            test_title=meta.get("title") or (catalog_entry.get("name") if catalog_entry else test_id),
            test_type=test_type,
            mode=mode,
            target_part=int(target_part) if target_part else None,
            total_score=numeric_total_score,
            listening_score=res_data.get("listening_score"),
            reading_score=res_data.get("reading_score"),
            listening_correct=res_data.get("listening_correct"),
            reading_correct=res_data.get("reading_correct"),
            total_correct=tot_correct,
            total_questions=tot_q,
            accuracy=round((tot_correct / max(1, tot_q)) * 100, 1),
            time_spent_seconds=int(time_spent),
            answers_json=json.dumps(answers),
            review_json=json.dumps(review_answers),
            created_at=datetime.utcnow()
        )
        db.add(test_attempt)

        # Save individual question attempts
        for rev in review_answers:
            q_num = rev.get("question_number")
            q_attempt = models.QuestionAttempt(
                user_id=user.id if user else 1,
                question_id=str(f"{test_id}_{q_num}"),
                test_id=test_id,
                question_number=q_num,
                part=rev.get("part", 1),
                section=rev.get("section", "listening"),
                question_text=rev.get("question_text", ""),
                selected_option=rev.get("user_choice", ""),
                correct_option=rev.get("correct_answer", ""),
                is_correct=bool(rev.get("is_correct")),
                created_at=datetime.utcnow()
            )
            db.add(q_attempt)

        if user and user.profile:
            if numeric_total_score > (user.profile.current_score or 0):
                user.profile.current_score = numeric_total_score
            user.profile.today_minutes_completed = (user.profile.today_minutes_completed or 0) + max(1, int(time_spent / 60))

        db.commit()
        db.refresh(test_attempt)
        res_data["attempt_id"] = test_attempt.id
    except Exception as e:
        print("Error saving test attempt:", e)
        if hasattr(db, "rollback"):
            db.rollback()

    return res_data
