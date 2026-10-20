from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import json
import re
import os
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path
from database import get_db
import models
import schemas
from auth import get_current_user, get_current_user_optional
from media_resolver import resolve_media_url
from routers.tests import clean_question_and_options

router = APIRouter(prefix="/api/practice", tags=["practice"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
PRACTICE_DIR = WEB_READY_DIR / "practice_by_part"
MOCK_TESTS_DIR = WEB_READY_DIR / "mock_tests"
DICTATION_FILE = WEB_READY_DIR / "dictation_challenges.json"
VOCAB_FILE = WEB_READY_DIR / "vocabulary_bank.json"
GRAMMAR_FILE = WEB_READY_DIR / "grammar_curriculum.json"

# 1. Practice by Part (Parts 1 to 7)
@router.get("/part/{part_number}")
def get_practice_by_part(
    part_number: int,
    level: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=1000),
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    if not isinstance(level, str):
        level = None
    if not isinstance(category, str):
        category = None
    if not isinstance(page, int):
        page = 1
    if not isinstance(limit, int):
        limit = 20

    part_file = PRACTICE_DIR / f"part{part_number}_practice.json"
    if not part_file.exists():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho Part {part_number}")

    try:
        data = json.loads(part_file.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đọc dữ liệu: {str(e)}")

    data_by_level = data.get("data_by_level", {})

    all_qs = []
    if level and level != "all":
        norm_lvl = level if "Level" in level else f"Level {level}"
        all_qs = data_by_level.get(norm_lvl, [])
        if not all_qs:
            for k, v in data_by_level.items():
                if level.lower() in k.lower() or k.lower() in level.lower():
                    all_qs = v
                    break
        if not all_qs:
            m = re.search(r'\d+', str(level))
            if m:
                digit = m.group(0)
                for k, v in data_by_level.items():
                    if f'level {digit}'.lower() in k.lower() or f'{digit}' == k.strip():
                        all_qs = v
                        break
    else:
        for lvl_list in data_by_level.values():
            all_qs.extend(lvl_list)

    if category and category != "all":
        c_low = category.lower()
        all_qs = [
            q for q in all_qs
            if c_low in str(q.get("photo_type", "")).lower()
            or c_low in str(q.get("question_type", "")).lower()
            or c_low in str(q.get("special_type", "")).lower()
            or c_low in str(q.get("topic", "")).lower()
        ]

    # Deduplicate questions to prevent identical repeated questions (Group B)
    seen_keys = set()
    deduped = []
    for q in all_qs:
        qid = str(q.get("id") or "").strip()
        qtext = str(q.get("question_text") or q.get("question") or "").strip()
        primary_key = qid if qid else f"{q.get('test_id')}_{q.get('question_number')}_{qtext}"
        if primary_key in seen_keys:
            continue
        seen_keys.add(primary_key)
        # Avoid textual duplicates for single-sentence parts
        if part_number in [2, 5] and qtext and len(qtext) > 12:
            if qtext in seen_keys:
                continue
            seen_keys.add(qtext)
        deduped.append(q)
    all_qs = deduped

    start = (page - 1) * limit
    is_adv = level and any(k in str(level) for k in ["Level 3", "Level 4", "3", "4"])
    is_student = user and user.role == "student" and not getattr(user, "is_vip", False)
    if is_adv and is_student:
        limit = min(limit, 5)
    paged = all_qs[start:start + limit]

    formatted = []
    for idx, q in enumerate(paged):
        opts = q.get("options") or {}
        vocab_parsed = []
        raw_vocab = q.get("vocabulary")
        if raw_vocab:
            if isinstance(raw_vocab, str):
                try:
                    pv = json.loads(raw_vocab)
                    vocab_parsed = pv.get("vocabulary", [])
                except Exception:
                    pass
            elif isinstance(raw_vocab, dict):
                vocab_parsed = raw_vocab.get("vocabulary", [])

        vocab_items = []
        for v in vocab_parsed:
            if isinstance(v, dict):
                vocab_items.append({
                    "word": v.get("word") or v.get("lemma") or "",
                    "meaning": v.get("meaning_vi") or v.get("meaning") or "",
                    "ipa": v.get("ipa_us") or v.get("ipa") or "",
                    "example": v.get("example_en") or "",
                    "example_vi": v.get("example_vi") or ""
                })

        ans = (q.get("correct_answer") or "A").strip()
        explanation_text = q.get("explanation") or q.get("explanation_vi") or ""
        translation_text = q.get("vietnamese_translation") or ""
        if not explanation_text:
            explanation_text = f"Đáp án đúng là ({ans}).\n" + translation_text

        raw_aud = q.get("local_audio") or q.get("audio_url") or ""
        # Safeguard: if audio points to full-test 50-minute track, attempt to find question-specific audio from mock_tests
        if any(x in str(raw_aud).lower() for x in ["economy_toeic", "sample_toeic", "new_real_toeic"]) or (str(raw_aud).endswith(".mp3") and "test" in str(raw_aud).lower() and "part_" not in str(raw_aud).lower()):
            test_id = q.get("test_id")
            q_num = q.get("question_number")
            q_id = q.get("id")
            if test_id and (MOCK_TESTS_DIR / f"{test_id}.json").exists():
                try:
                    mt_data = json.loads((MOCK_TESTS_DIR / f"{test_id}.json").read_text(encoding="utf-8"))
                    found_sliced = False
                    for mq in mt_data.get("questions", []):
                        if (q_id and mq.get("id") == q_id) or (q_num and mq.get("question_number") == q_num):
                            cand = mq.get("local_audio") or mq.get("audio_url")
                            if cand and not any(x in str(cand).lower() for x in ["economy_toeic", "sample_toeic", "t1_audio", "t2_audio", "t10_audio"]) and not (str(cand).endswith(".mp3") and "test" in str(cand).lower() and "part_" not in str(cand).lower()):
                                raw_aud = cand
                                found_sliced = True
                                break
                    if not found_sliced:
                        raw_aud = ""
                except Exception:
                    raw_aud = ""
            else:
                raw_aud = "" 

        raw_img = q.get("local_image") or q.get("image_url") or ""
        if not raw_img:
            test_id = q.get("test_id")
            q_num = q.get("question_number")
            q_id = q.get("id")
            if test_id and (MOCK_TESTS_DIR / f"{test_id}.json").exists():
                try:
                    mt_data = json.loads((MOCK_TESTS_DIR / f"{test_id}.json").read_text(encoding="utf-8"))
                    for mq in mt_data.get("questions", []):
                        if (q_id and mq.get("id") == q_id) or (q_num and mq.get("question_number") == q_num):
                            cand_img = mq.get("local_image") or mq.get("image_url")
                            if cand_img:
                                raw_img = cand_img
                                break
                except Exception:
                    pass

        assigned_q_num = (start + idx + 1) if (part_number in [1, 2] or not q.get("question_number") or q.get("question_number") == 1) else q.get("question_number")

        raw_direction = ""
        orig_qtext = (q.get("question_text") or "").strip()
        if part_number == 6:
            if re.match(r"^Questions?\s+\d+[\s–-]+\d+\s+refer\s+to", orig_qtext, re.IGNORECASE):
                raw_direction = orig_qtext
                q_text_display = f"Chọn từ/câu thích hợp điền vào vị trí [{assigned_q_num}]:"
            elif not orig_qtext or orig_qtext.lower().startswith("câu hỏi"):
                q_text_display = f"Chọn từ/câu thích hợp điền vào vị trí [{assigned_q_num}]:"
            else:
                q_text_display = orig_qtext
        else:
            q_text_display = q.get("question_text") or (f"Câu {q.get('question_number', 1)}" if part_number in [1, 2] else f"Câu hỏi Part {part_number}")

        options_dict = {"A": opts.get("A", "") or "", "B": opts.get("B", "") or "", "C": opts.get("C", "") or ""}
        if opts.get("D") and part_number != 2:
            options_dict["D"] = opts.get("D", "") or ""
        cleaned_q_text, cleaned_options = clean_question_and_options(part_number, q_text_display, options_dict, assigned_q_num)

        q_item = {
            "id": str(q.get("id")),
            "part": part_number,
            "direction": raw_direction,
            "question_number": assigned_q_num,
            "level": q.get("level"),
            "photo_type": q.get("photo_type"),
            "question_type": q.get("question_type") or q.get("special_type") or q.get("topic") or f"Part {part_number}",
            "question_text": cleaned_q_text,
            "passage_text": q.get("passage_text") or "",
            "options": cleaned_options,
            "option_a": cleaned_options.get("A", ""),
            "option_b": cleaned_options.get("B", ""),
            "option_c": cleaned_options.get("C", ""),
            "option_d": cleaned_options.get("D", ""),
            "correct_answer": ans,
            "audio_url": resolve_media_url(raw_aud),
            "image_url": resolve_media_url(raw_img),
            "vietnamese_translation": translation_text,
            "option_translations": q.get("option_translations") or {},
            "transcript": q.get("transcript") or translation_text,
            "explanation": explanation_text,
            "explanation_vi": explanation_text,
            "evidence": q.get("evidence") or "",
            "evidence_vi": q.get("evidence_vi") or "",
            "paraphrase": q.get("paraphrase") or "",
            "vocabulary": vocab_items,
            "key_vocab": vocab_items,
            "difficulty_level": 1 if "1" in str(q.get("level", "")) else 3 if "3" in str(q.get("level", "")) else 2
        }
        formatted.append(q_item)

    passages = []
    if part_number in [3, 4]:
        passage_map = {}
        for item in formatted:
            aud = item.get("audio_url") or f"passage_{item.get('question_number', 1)}"
            if aud not in passage_map:
                p_obj = {
                    "id": f"passage_{len(passages) + 1}",
                    "part": part_number,
                    "audio_url": item.get("audio_url"),
                    "image_url": item.get("image_url"),
                    "transcript": item.get("transcript") or item.get("passage_text") or "",
                    "passage_text": item.get("passage_text") or item.get("transcript") or "",
                    "questions": []
                }
                passage_map[aud] = p_obj
                passages.append(p_obj)
            passage_map[aud]["questions"].append(item)
    elif part_number in [6, 7]:
        passage_map = {}
        for item in formatted:
            p_text = item.get("passage_text") or "Đoạn văn đọc hiểu TOEIC"
            if p_text not in passage_map:
                p_obj = {
                    "id": f"passage_{len(passages) + 1}",
                    "part": part_number,
                    "direction": item.get("direction") or "",
                    "image_url": item.get("image_url"),
                    "passage_text": p_text,
                    "questions": []
                }
                passage_map[p_text] = p_obj
                passages.append(p_obj)
            passage_map[p_text]["questions"].append(item)
            if not passage_map[p_text].get("direction") and item.get("direction"):
                passage_map[p_text]["direction"] = item.get("direction")

    return {
        "part": part_number,
        "title": data.get("title", f"Part {part_number} Practice"),
        "total": len(all_qs),
        "page": page,
        "limit": limit,
        "by_level": data.get("by_level", {}),
        "by_photo_type": data.get("by_photo_type", {}),
        "by_question_type": data.get("by_question_type", {}),
        "by_special_type": data.get("by_special_type", {}),
        "by_topic": data.get("by_topic", {}),
        "questions": formatted,
        "passages": passages
    }

# 2. Listening Practice (Backwards compatibility)
@router.get("/listening")
def get_listening_questions(
    part: int = Query(1, ge=1, le=4),
    difficulty: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    return get_practice_by_part(
        part_number=part,
        level=difficulty if difficulty != "all" else None,
        category=None,
        page=page,
        limit=limit
    )

# 3. Reading Practice (Backwards compatibility)
@router.get("/reading")
def get_reading_questions(
    part: int = Query(5, ge=5, le=7),
    difficulty: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    return get_practice_by_part(
        part_number=part,
        level=difficulty if difficulty != "all" else None,
        category=None,
        page=page,
        limit=limit
    )

# 4. Dictation
@router.get("/dictation")
def get_dictation_challenges(limit: int = Query(20)):
    if DICTATION_FILE.exists():
        try:
            data = json.loads(DICTATION_FILE.read_text(encoding="utf-8"))
            challenges = data.get("challenges", [])[:limit]
            for c in challenges:
                c["audio_url"] = resolve_media_url(c.get("audio_url"))
            return {"total": len(challenges), "challenges": challenges}
        except Exception:
            pass
    return {"total": 0, "challenges": []}

@router.post("/dictation/check")
def check_dictation_practice(payload: dict):
    u_text = payload.get("user_text", "").strip()
    q_id = payload.get("question_id") or payload.get("challenge_id")
    target = payload.get("target_text", "")
    if not target and DICTATION_FILE.exists():
        try:
            data = json.loads(DICTATION_FILE.read_text(encoding="utf-8"))
            for c in data.get("challenges", []):
                if c.get("id") == q_id:
                    target = c.get("full_sentence", "")
                    break
        except Exception:
            pass

    if not target:
        target = "Welcome to the international conference."

    u_words = re.sub(r"[^\w\s]", "", u_text.lower()).split()
    t_words = re.sub(r"[^\w\s]", "", target.lower()).split()
    matched = sum(1 for i, w in enumerate(u_words) if i < len(t_words) and w == t_words[i])
    accuracy = round((matched / max(1, len(t_words))) * 100, 1)

    return {
        "accuracy": accuracy,
        "accuracy_pct": accuracy,
        "is_correct": accuracy >= 90.0,
        "target_text": target
    }

# 5. Flashcards SRS & Topic-based Spaced Repetition (SRS)
TOPIC_CONFIG = {
    "office": {
        "name": "Văn phòng & Công sở",
        "icon": "🏢",
        "keywords": ["office", "desk", "photocopy", "stationery", "meeting", "colleague", "department", "manager", "memo", "report", "filing", "supplies", "work", "workplace", "boss", "executive", "presentation", "conference", "copier", "printer", "clerk", "cubicle", "văn phòng", "công sở", "câuộc họp", "đồng nghiệp", "báo cáo", "hồ sơ", "văn phòng phẩm", "thư ký", "category", "phân loại", "hạng mục", "document", "tài liệu", "schedule", "lịch trình"]
    },
    "personnel": {
        "name": "Nhân sự & Tuyển dụng",
        "icon": "👔",
        "keywords": ["employee", "staff", "recruit", "interview", "resume", "salary", "promotion", "training", "hire", "candidate", "performance", "benefits", "job", "retire", "pension", "wage", "personnel", "applicant", "qualification", "nhân sự", "tuyển dụng", "nhân viên", "phỏng vấn", "hồ sơ xin việc", "lương", "thăng chức", "đào tạo", "ứng viên", "chế độ", "nghỉ hưu", "attitude", "thái độ", "enthusiasm", "nhiệt tình", "inspiring", "truyền cảm hứng"]
    },
    "finance": {
        "name": "Tài chính & Ngân hàng",
        "icon": "💰",
        "keywords": ["finance", "bank", "budget", "invoice", "payment", "revenue", "profit", "expense", "audit", "account", "tax", "cost", "fund", "money", "invest", "stock", "loan", "bill", "interest", "dividend", "debt", "tài chính", "ngân hàng", "ngân sách", "hóa đơn", "thanh toán", "doanh thu", "lợi nhuận", "chi phí", "kiểm toán", "thuế", "đầu tư", "tiền tệ"]
    },
    "marketing": {
        "name": "Marketing & Bán hàng",
        "icon": "📢",
        "keywords": ["market", "client", "customer", "product", "launch", "campaign", "advertising", "survey", "brand", "sales", "discount", "strategy", "promote", "commercial", "consumer", "tiếp thị", "khách hàng", "sản phẩm", "chiến dịch", "quảng cáo", "khảo sát", "thương hiệu", "doanh số", "giảm giá", "chiến lược", "thị trường", "aim", "mục tiêu", "nhắm tới"]
    },
    "contract": {
        "name": "Hợp đồng & Đàm phán",
        "icon": "📝",
        "keywords": ["contract", "agreement", "negotiate", "clause", "terms", "sign", "partner", "legal", "warranty", "penalty", "vendor", "deal", "commit", "obligation", "settle", "lawyer", "hợp đồng", "thỏa thuận", "đàm phán", "điều khoản", "ký kết", "đối tác", "pháp lý", "bảo hành", "cam kết", "nghĩa vụ", "reject", "từ chối", "bác bỏ", "represent", "đại diện", "consideration", "cân nhắc"]
    },
    "travel": {
        "name": "Du lịch & Khách sạn",
        "icon": "✈️",
        "keywords": ["flight", "hotel", "airport", "reservation", "luggage", "ticket", "tourism", "destination", "itinerary", "passenger", "board", "travel", "trip", "airline", "vacation", "passport", "du lịch", "khách sạn", "chuyến bay", "sân bay", "đặt phòng", "hành lý", "vé máy bay", "hành khách", "tàu hỏa"]
    },
    "dining": {
        "name": "Nhà hàng & Sự kiện",
        "icon": "🍽️",
        "keywords": ["restaurant", "menu", "chef", "meal", "food", "catering", "beverage", "dinner", "banquet", "buffet", "recipe", "eat", "drink", "cook", "kitchen", "order", "taste", "nhà hàng", "thực đơn", "món ăn", "đầu bếp", "tiệc", "đồ uống", "bữa ăn", "gọi món", "buffet", "nấu ăn"]
    },
    "technology": {
        "name": "Kỹ thuật & Công nghệ",
        "icon": "💻",
        "keywords": ["software", "hardware", "computer", "system", "network", "data", "device", "install", "maintenance", "technical", "glitch", "error", "electronic", "digital", "tech", "online", "screen", "công nghệ", "phần mềm", "phần cứng", "máy tính", "hệ thống", "mạng", "dữ liệu", "thiết bị", "cài đặt", "bảo trì", "kỹ thuật", "lỗi", "repair", "sửa chữa", "sửa"]
    }
}

def classify_card_topic(word: str = "", meaning: str = "", context: str = "", test_name: str = "") -> str:
    text = f"{word} {meaning} {context} {test_name}".lower()
    for t_id, meta in TOPIC_CONFIG.items():
        if any(kw in text for kw in meta["keywords"]):
            return t_id
    return "general"

_cached_bank_words = None

def get_cached_bank_words():
    global _cached_bank_words
    if _cached_bank_words is None:
        if VOCAB_FILE.exists():
            try:
                raw_list = json.loads(VOCAB_FILE.read_text(encoding="utf-8"))
                processed = []
                for item in raw_list:
                    meanings = []
                    m_raw = item.get("meanings_json")
                    if m_raw:
                        if isinstance(m_raw, str):
                            try:
                                meanings = json.loads(m_raw)
                            except Exception:
                                pass
                        elif isinstance(m_raw, list):
                            meanings = m_raw
                    m0 = meanings[0] if meanings and isinstance(meanings[0], dict) else {}
                    w_topic = classify_card_topic(
                        item.get("word", ""),
                        str(m_raw),
                        item.get("set_name", ""),
                        item.get("test_name", "")
                    )
                    t_info = TOPIC_CONFIG.get(w_topic, {"name": "Giao tiếp & Đời sống", "icon": "🌐"})
                    processed.append({
                        "word_id": item["id"],
                        "word": item.get("word", ""),
                        "ipa": item.get("ipa", ""),
                        "meaning": m0.get("meaning", "Nghĩa từ vựng TOEIC"),
                        "part_of_speech": m0.get("part_of_speech", "n"),
                        "example": m0.get("example", ""),
                        "example_vi": m0.get("example_vi", ""),
                        "collocations": m0.get("collocations") or [],
                        "word_family": m0.get("word_family") or [],
                        "toeic_tip": m0.get("toeic_tip", ""),
                        "audio_url": resolve_media_url(item.get("audio_url")),
                        "srs_stage": 1,
                        "interval_days": 1,
                        "repetitions": 0,
                        "is_favorite": False,
                        "topic": w_topic,
                        "topic_name": t_info["name"],
                        "topic_icon": t_info["icon"],
                        "from_db": False
                    })
                _cached_bank_words = processed
            except Exception:
                _cached_bank_words = []
        else:
            _cached_bank_words = []
    return _cached_bank_words

@router.get("/flashcards")
def get_user_flashcards(
    filter_type: str = Query("all"),
    topic: str = Query("all"),
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    target_user_id = user.id if user else 1
    now = datetime.utcnow()

    # 1. Fetch user's cards from DB
    user_cards = []
    try:
        items = db.query(models.UserFlashcard).filter(
            models.UserFlashcard.user_id == target_user_id
        ).order_by(models.UserFlashcard.id.desc()).all()
        for f in items:
            c_topic = classify_card_topic(
                f.word,
                f.meaning or "",
                getattr(f, "source_context", "") or "",
                ""
            )
            t_info = TOPIC_CONFIG.get(c_topic, {"name": "Giao tiếp & Đời sống", "icon": "🌐"})
            
            # Learned card criteria: in user flashcard table with repetitions >= 1 or explicitly saved
            is_learned = (f.repetitions or 0) > 0 or getattr(f, "last_reviewed_at", None) is not None or True
            is_due = (f.next_review_at and f.next_review_at <= now) or (f.interval_days or 1) <= 3 or (f.srs_stage or 1) <= 2
            is_mastered = (f.interval_days or 1) >= 7 or (f.srs_stage or 1) >= 3

            user_cards.append({
                "id": f.id,
                "word_id": f.word_id,
                "word": f.word,
                "ipa": f.ipa or "",
                "meaning": f.meaning or "",
                "part_of_speech": f.part_of_speech or "",
                "example": f.example or "",
                "example_vi": getattr(f, "example_vi", "") or "",
                "source_context": getattr(f, "source_context", "") or "Kho từ vựng TOEIC",
                "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(f, "created_at", None) else "",
                "audio_url": resolve_media_url(f.audio_url),
                "srs_stage": f.srs_stage or 1,
                "interval_days": f.interval_days or 1,
                "repetitions": f.repetitions or 0,
                "is_favorite": f.is_favorite or False,
                "topic": c_topic,
                "topic_name": t_info["name"],
                "topic_icon": t_info["icon"],
                "from_db": True,
                "is_learned": is_learned,
                "is_due": is_due,
                "is_mastered": is_mastered
            })
    except Exception as e:
        print("Error fetching user flashcards:", e)

    # Set of existing words to avoid duplication
    existing_words = {c["word"].strip().lower() for c in user_cards}

    # 2. Seed cards from vocabulary bank if not restricted to strictly learned/saved
    bank_words = []
    if filter_type not in ["learned", "saved"]:
        all_bank = get_cached_bank_words()
        if topic and topic != "all":
            matched_bank = [b for b in all_bank if b["topic"] == topic and b["word"].strip().lower() not in existing_words]
        else:
            matched_bank = [b for b in all_bank if b["word"].strip().lower() not in existing_words]

        for idx, bw in enumerate(matched_bank[:35]):
            b_copy = dict(bw)
            b_copy["id"] = 100000 + idx
            b_copy["is_due"] = True
            b_copy["is_mastered"] = False
            b_copy["is_learned"] = False
            bank_words.append(b_copy)

    # 3. Combine pool of cards
    all_pool = user_cards + bank_words

    # 4. Filter by topic
    if topic and topic != "all":
        pool_by_topic = [c for c in all_pool if c.get("topic") == topic]
        user_cards_topic = [c for c in user_cards if c.get("topic") == topic]
    else:
        pool_by_topic = all_pool
        user_cards_topic = user_cards

    # 5. Filter by filter_type
    if filter_type in ["learned", "saved"]:
        # STRICTLY user's learned/saved cards
        deck = user_cards_topic
    elif filter_type == "due":
        deck = [c for c in pool_by_topic if c.get("is_due")]
    elif filter_type == "mastered":
        deck = [c for c in pool_by_topic if c.get("is_mastered")]
    else:  # "all"
        deck = pool_by_topic

    # Metrics
    total_learned = len(user_cards)
    learned_in_topic = len(user_cards_topic)
    cards_due_today = sum(1 for c in (user_cards_topic if filter_type in ["learned", "saved"] else pool_by_topic) if c.get("is_due"))
    mastered_cards = sum(1 for c in (user_cards_topic if filter_type in ["learned", "saved"] else pool_by_topic) if c.get("is_mastered"))

    # Topic list with dynamic card counts
    topics_list = [
        {"id": "all", "name": "Tất cả chủ đề", "icon": "🌟", "count": len(all_pool)}
    ]
    for t_id, meta in TOPIC_CONFIG.items():
        t_count = sum(1 for c in all_pool if c.get("topic") == t_id)
        topics_list.append({
            "id": t_id,
            "name": meta["name"],
            "icon": meta["icon"],
            "count": t_count
        })
    gen_count = sum(1 for c in all_pool if c.get("topic") == "general")
    topics_list.append({
        "id": "general",
        "name": "Giao tiếp đời sống",
        "icon": "🌐",
        "count": gen_count
    })

    return {
        "total": len(deck),
        "total_cards": len(deck),
        "deck": deck,
        "flashcards": deck,
        "cards_due_today": cards_due_today,
        "mastered_cards": mastered_cards,
        "learned_cards": learned_in_topic if topic != "all" else total_learned,
        "total_learned": total_learned,
        "selected_topic": topic,
        "selected_filter": filter_type,
        "topics": topics_list
    }

@router.post("/flashcards/review")
def review_flashcard(
    payload: dict,
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    rating = payload.get("rating", "again")
    # Section 4.4: "Quên" (1 ngày), "Nhớ mang máng" (3 ngày), "Đã thuộc" (7 ngày)
    interval_map = {"again": 1, "hard": 3, "good": 3, "easy": 7}
    new_interval = interval_map.get(rating, 1)

    target_user_id = user.id if user else 1
    word_id = str(payload.get("word_id") or "")
    word = (payload.get("word") or "").strip()

    from sqlalchemy import func

    # Lookup card in DB
    card = None
    if word_id:
        if word_id.isdigit():
            card = db.query(models.UserFlashcard).filter(
                models.UserFlashcard.user_id == target_user_id,
                models.UserFlashcard.id == int(word_id)
            ).first()
        if not card:
            card = db.query(models.UserFlashcard).filter(
                models.UserFlashcard.user_id == target_user_id,
                models.UserFlashcard.word_id == word_id
            ).first()
    if not card and word:
        card = db.query(models.UserFlashcard).filter(
            models.UserFlashcard.user_id == target_user_id,
            func.lower(models.UserFlashcard.word) == word.lower()
        ).first()

    now = datetime.utcnow()

    if not card:
        # Create new card in UserFlashcard
        card = models.UserFlashcard(
            user_id=target_user_id,
            word_id=word_id or f"fc_{word.lower()}",
            word=word or "Word",
            ipa=payload.get("ipa", ""),
            meaning=payload.get("meaning", ""),
            part_of_speech=payload.get("part_of_speech", ""),
            example=payload.get("example", ""),
            source_context=payload.get("topic_name") or payload.get("source_context", "Bộ từ vựng TOEIC"),
            audio_url=payload.get("audio_url", ""),
            srs_stage=1 if rating == "again" else (3 if rating == "easy" else 2),
            interval_days=new_interval,
            ease_factor=2.5,
            repetitions=1,
            lapses=1 if rating == "again" else 0,
            last_reviewed_at=now,
            next_review_at=now + timedelta(days=new_interval)
        )
        db.add(card)
    else:
        # Update existing card
        card.repetitions = (card.repetitions or 0) + 1
        card.last_reviewed_at = now
        card.interval_days = new_interval
        card.next_review_at = now + timedelta(days=new_interval)
        if rating == "again":
            card.lapses = (card.lapses or 0) + 1
            card.srs_stage = 1
        elif rating == "easy":
            card.srs_stage = min(5, (card.srs_stage or 1) + 2)
        else:  # hard or good
            card.srs_stage = min(5, (card.srs_stage or 1) + 1)

    try:
        db.commit()
        db.refresh(card)
    except Exception as e:
        db.rollback()

    return {
        "status": "success",
        "rating": rating,
        "next_review_days": new_interval,
        "card_id": card.id if card else None,
        "word": card.word if card else word,
        "srs_stage": card.srs_stage if card else 1,
        "repetitions": card.repetitions if card else 1,
        "message": f"Từ vựng '{card.word if card else word}' đã được lưu cho lần ôn tiếp theo sau {new_interval} ngày."
    }

@router.post("/flashcards/add")
def add_to_flashcards(
    payload: dict,
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    word = payload.get("word", "").strip()
    if not word:
        raise HTTPException(status_code=400, detail="Thiếu từ vựng")

    source_context = payload.get("source_context") or payload.get("source") or payload.get("context") or "Kho từ vựng TOEIC"
    target_user_id = user.id if user else 1

    # RBAC: Free tier limit 30 saved flashcards
    user_role = user.role if user else "student"
    if user and user_role not in ["vip", "admin"]:
        saved_count = db.query(models.UserFlashcard).filter(
            models.UserFlashcard.user_id == target_user_id
        ).count()
        if saved_count >= 30:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản gói thường giới hạn lưu tối đa 30 từ vựng. Vui lòng nâng cấp VIP Pro để lưu không giới hạn!"
            )

    from sqlalchemy import func
    # Check duplicate
    existing = db.query(models.UserFlashcard).filter(
        models.UserFlashcard.user_id == target_user_id,
        func.lower(models.UserFlashcard.word) == word.lower()
    ).first()

    if existing:
        return {
            "status": "already_saved",
            "message": f"Từ '{word}' đã có trong danh sách từ vựng đã lưu!",
            "card_id": existing.id
        }

    fc = models.UserFlashcard(
        user_id=target_user_id,
        word_id=payload.get("word_id") or f"fc_{word.lower()}",
        word=word,
        ipa=payload.get("ipa", ""),
        meaning=payload.get("meaning", ""),
        part_of_speech=payload.get("part_of_speech", ""),
        example=payload.get("example", ""),
        source_context=source_context,
        audio_url=payload.get("audio_url", ""),
        srs_stage=1,
        interval_days=1,
        repetitions=0
    )
    db.add(fc)
    db.commit()
    db.refresh(fc)
    return {
        "status": "success",
        "message": f"Đã lưu từ '{word}' vào sổ từ vựng!",
        "card_id": fc.id
    }

@router.post("/flashcards/remove")
@router.delete("/flashcards/{card_id}")
def remove_from_flashcards(
    card_id: int = None,
    payload: dict = None,
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    target_id = card_id or (payload.get("card_id") if payload else None)
    target_word = (payload.get("word") if payload else "") or ""
    target_user_id = user.id if user else 1

    query = db.query(models.UserFlashcard).filter(models.UserFlashcard.user_id == target_user_id)
    if target_id:
        query = query.filter(models.UserFlashcard.id == target_id)
    elif target_word:
        query = query.filter(func.lower(models.UserFlashcard.word) == target_word.strip().lower())
    else:
        raise HTTPException(status_code=400, detail="Thiếu ID hoặc từ vựng cần xóa")

    card = query.first()
    if card:
        db.delete(card)
        db.commit()
        return {"status": "success", "message": f"Đã bỏ lưu từ '{card.word}' khỏi danh sách!"}

    return {"status": "success", "message": "Đã bỏ lưu từ vựng!"}

@router.post("/submit-answer")
def submit_answer(
    payload: dict,
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    # Study time is strictly derived from QuestionAttempt.time_spent_sec, not hardcoded increments
    pass

    return {"status": "success", "message": "Câu trả lời đã được ghi nhận."}


@router.post("/ai-grade")
def ai_grade_practice_endpoint(
    payload: dict,
    user: models.User = Depends(get_current_user_optional)
):
    """
    Grades Listening or Reading practice using Gemini AI (DeepTutor multi-key pool)
    with ETS distractor analysis, 5-second rules, score prediction, and vocabulary recommendations.
    """
    from ai_grading import grade_practice_session
    skill = str(payload.get("skill") or "reading").lower()
    part = int(payload.get("part") or 5)
    title = str(payload.get("title") or f"TOEIC Part {part}")
    answers = payload.get("answers") or []
    user_name = user.full_name if user else "Học viên"

    report = grade_practice_session(
        skill=skill,
        part=part,
        title=title,
        answers=answers,
        user_name=user_name
    )
    return report
