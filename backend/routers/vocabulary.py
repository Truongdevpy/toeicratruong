from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from media_resolver import resolve_media_url
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import json
from pathlib import Path
from database import get_db
import models
from auth import get_current_user_optional, GUEST_USER_ID

router = APIRouter(prefix="/api/vocabulary", tags=["vocabulary"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
VOCAB_FILE = WEB_READY_DIR / "vocabulary_bank.json"

_vocab_cache = None

def get_vocab_bank():
    global _vocab_cache
    if _vocab_cache is None:
        if VOCAB_FILE.exists():
            try:
                raw_list = json.loads(VOCAB_FILE.read_text(encoding="utf-8"))
                processed = []
                for item in raw_list:
                    # Parse meanings or meanings_json
                    meanings = []
                    meanings_raw = item.get("meanings") or item.get("meanings_json")
                    if meanings_raw:
                        if isinstance(meanings_raw, str):
                            try:
                                meanings = json.loads(meanings_raw)
                            except Exception:
                                meanings = []
                        elif isinstance(meanings_raw, list):
                            meanings = meanings_raw

                    first_meaning = meanings[0] if meanings and isinstance(meanings[0], dict) else {}

                    processed.append({
                        "id": item["id"],
                        "word": item.get("word", ""),
                        "ipa": item.get("ipa", ""),
                        "part_name": item.get("part_name", "All"),
                        "test_name": item.get("test_name", ""),
                        "set_name": item.get("set_name", ""),
                        "category": item.get("category") or item.get("topic") or "office",
                        "topic": item.get("topic") or item.get("category") or "office",
                        "level": item.get("level") or "TOEIC 650",
                        "meaning": first_meaning.get("meaning", ""),
                        "part_of_speech": first_meaning.get("part_of_speech", ""),
                        "example": first_meaning.get("example", ""),
                        "example_vi": first_meaning.get("example_vi", ""),
                        "toeic_tip": first_meaning.get("toeic_tip", ""),
                        "word_family": first_meaning.get("word_family") or item.get("word_family") or [],
                        "collocations": first_meaning.get("collocations") or item.get("phrases") or [],
                        "synonyms": item.get("synonyms") or first_meaning.get("synonyms") or [],
                        "antonyms": first_meaning.get("antonyms", []),
                        "audio_us": item.get("audio_us"),
                        "audio_uk": item.get("audio_uk"),
                        "audio_url": resolve_media_url(item.get("audio_url") or item.get("audio_us") or item.get("audio_uk"), media_type="audio") if (item.get("audio_url") or item.get("audio_us") or item.get("audio_uk")) else None
                    })
                _vocab_cache = processed
            except Exception as e:
                print("Error loading vocabulary_bank:", e)
                _vocab_cache = []
        else:
            _vocab_cache = []
    return _vocab_cache

TOPIC_ALIASES = {
    "contract": ["contract", "contracts", "hợp đồng", "đàm phán", "hợp đồng & đàm phán", "warranties", "legal"],
    "office": ["office", "văn phòng", "công sở", "văn phòng & công sở", "thủ tục", "họp hành", "bàn ghế", "stationery"],
    "finance": ["finance", "kinh doanh", "tài chính", "kinh doanh & tài chính", "ngân hàng", "kế toán", "thuế", "đầu tư", "chi phí", "banking", "taxes"],
    "personnel": ["personnel", "nhân sự", "tuyển dụng", "nhân sự & tuyển dụng", "phỏng vấn", "lương", "đãi ngộ", "thăng chức", "hiring"],
    "travel": ["travel", "du lịch", "khách sạn", "du lịch & khách sạn", "máy bay", "vé", "hành lý", "tour", "chuyến đi", "airlines", "hotels"],
    "dining": ["dining", "nhà hàng", "sự kiện", "nhà hàng & sự kiện", "ẩm thực", "ăn uống", "bữa trưa", "bữa tối", "tiệc", "cà phê", "restaurant"],
    "technology": ["technology", "kỹ thuật", "thiết bị", "kỹ thuật & thiết bị", "công nghệ", "máy tính", "phần mềm", "phần cứng", "bảo trì", "computers", "electronics"],
    "marketing": ["marketing", "tiếp thị", "bán hàng", "quảng cáo", "marketing & bán hàng", "thị trường", "khuyến mãi", "sản phẩm", "sales"]
}

TOPIC_PART_NAMES = {
    "contract": ["contract", "warranty", "warranties", "business planning", "agreement", "clause", "terms", "legal"],
    "office": ["office", "board meeting", "procedure", "supplies", "stationery", "correspondence", "department", "property"],
    "finance": ["bank", "banking", "account", "accounting", "finance", "financial", "tax", "taxes", "invoice", "invoices", "investment", "investments"],
    "personnel": ["hire", "hiring", "recruit", "interview", "salary", "salaries", "benefit", "benefits", "promotion", "promotions", "pension", "job advertising", "applying"],
    "travel": ["travel", "flight", "airline", "airlines", "hotel", "hotels", "car rental", "train", "trains", "tourism", "passenger"],
    "dining": ["dining", "eat", "eating", "restaurant", "lunch", "dinner", "cooking", "chef", "meal", "catering", "event", "events", "conference", "conferences"],
    "technology": ["electronic", "electronics", "computer", "computers", "technology", "device", "quality control", "inventory", "shipping"],
    "marketing": ["market", "marketing", "shopping", "media", "product development", "theater", "museum", "museums", "movies", "music", "advertising"]
}

TOPIC_KEYWORDS = {
    "contract": ["contract", "agree", "agreement", "negotiat", "clause", "term", "terms", "sign", "signat", "partner", "legal", "lawyer", "attorney", "warrant", "penalt", "obligat", "bind", "settle", "compromise", "commit", "provision", "stipulat", "breach"],
    "office": ["office", "desk", "photocopy", "stationer", "meeting", "colleague", "department", "manager", "memo", "report", "filing", "file", "supplies", "clerk", "cabinet", "cubicle", "fax", "stapler", "document", "agenda", "minutes", "schedule", "supervisor", "admin"],
    "finance": ["financ", "bank", "budget", "invoice", "payment", "pay", "revenue", "profit", "expense", "audit", "account", "tax", "cost", "fund", "invest", "loan", "credit", "debt", "cash", "money", "interest", "currency", "shareholder", "dividend", "balance", "fiscal"],
    "personnel": ["employ", "staff", "recruit", "interview", "resume", "cv", "salary", "wage", "promot", "train", "training", "hire", "candidat", "perform", "benefit", "retire", "pension", "qualificat", "applicant", "personnel", "payroll", "job"],
    "travel": ["flight", "hotel", "airport", "reserv", "luggage", "baggage", "ticket", "tour", "destinat", "itinerary", "passenger", "board", "boarding", "airline", "vacat", "trip", "train", "station", "transit", "passport", "visa", "check-in", "cruise", "subway"],
    "dining": ["restaurant", "menu", "chef", "meal", "food", "cater", "beverage", "drink", "dinner", "lunch", "breakfast", "banquet", "buffet", "recipe", "cook", "order", "waiter", "waitress", "dish", "dine", "dining", "table", "snack", "cafe", "coffee"],
    "technology": ["softwar", "hardwar", "comput", "system", "network", "data", "devic", "install", "mainten", "technic", "glitch", "error", "machine", "equip", "screen", "monitor", "digit", "program", "internet", "electronic", "repair", "wire", "cable", "battery", "tool"],
    "marketing": ["market", "client", "custom", "product", "launch", "campaign", "advertis", "survey", "brand", "sale", "sales", "discount", "strateg", "promot", "consum", "competit", "buyer", "distribut", "commercial", "publicit", "billboard", "sponsor"]
}

def resolve_topic_id(cat_input: str) -> str:
    if not cat_input or cat_input.lower() == "all":
        return "all"
    c_lower = cat_input.lower().strip()
    for tid, aliases in TOPIC_ALIASES.items():
        if tid == c_lower or any(a in c_lower for a in aliases):
            return tid
    return c_lower

def match_topic(item: dict, topic_id: str) -> bool:
    if not topic_id or topic_id == "all":
        return True
    target = topic_id.lower().strip()
    item_cat = (item.get("category") or item.get("topic") or "").lower().strip()
    if item_cat:
        resolved_cat = resolve_topic_id(item_cat)
        if resolved_cat in TOPIC_ALIASES:
            return resolved_cat == target
        if resolved_cat == target:
            return True
    pname = item.get("part_name", "").lower()
    if any(k in pname for k in TOPIC_PART_NAMES.get(target, [])):
        return True
    
    text = f"{item.get('word', '')} {item.get('meaning', '')} {item.get('example', '')}".lower()
    for kw in TOPIC_KEYWORDS.get(target, []):
        if kw in text:
            return True
    return False

def match_level(item: dict, lvl: str) -> bool:
    if not lvl or lvl.lower() == "all":
        return True
    item_lvl = (item.get("level") or "").lower().strip()
    req_lvl = lvl.lower().strip()
    if req_lvl in item_lvl or item_lvl in req_lvl:
        return True
    w = item.get("word", "").strip()
    if "500" in req_lvl:
        return "500" in item_lvl or len(w) <= 6
    elif "650" in req_lvl:
        return "650" in item_lvl or (7 <= len(w) <= 9)
    elif "750" in req_lvl or "900" in req_lvl:
        return "750" in item_lvl or len(w) >= 10
    return True

@router.get("/topic-stats")
def get_topic_stats():
    words = get_vocab_bank()
    counts = {tid: 0 for tid in TOPIC_ALIASES}
    counts["total"] = len(words)
    for w in words:
        cat = resolve_topic_id(w.get("category") or w.get("topic") or "office")
        if cat in counts:
            counts[cat] += 1
        else:
            counts["office"] += 1
    return counts

@router.get("")
def list_vocabulary(
    search: str = Query(None),
    part: str = Query(None),
    category: str = Query(None),
    level: str = Query(None),
    limit: int = Query(50, ge=1, le=10000),
    page: int = Query(1, ge=1)
):
    if not isinstance(page, int):
        page = 1
    if not isinstance(limit, int):
        limit = 50
    words = get_vocab_bank()
    filtered = words

    if search and isinstance(search, str):
        kw = search.lower().strip()
        filtered = [
            w for w in filtered
            if kw in w["word"].lower() or kw in w["meaning"].lower() or kw in w.get("example", "").lower()
        ]

    if part and isinstance(part, str) and part != "all":
        p_clean = part.upper()
        filtered = [w for w in filtered if p_clean in w["part_name"].upper()]

    if category and isinstance(category, str) and category != "all":
        tid = resolve_topic_id(category)
        if tid in TOPIC_ALIASES or tid in TOPIC_KEYWORDS:
            filtered = [w for w in filtered if match_topic(w, tid)]
        else:
            cat_clean = category.lower().strip()
            filtered = [
                w for w in filtered
                if cat_clean in w.get("part_name", "").lower()
                or cat_clean in w.get("set_name", "").lower()
                or cat_clean in w.get("word", "").lower()
                or cat_clean in w.get("meaning", "").lower()
            ]

    if level and isinstance(level, str) and level != "all":
        filtered = [w for w in filtered if match_level(w, level)]

    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    # Enrich words with category and level attributes for client UI
    for w in paged:
        if not w.get("level"):
            w_len = len(w.get("word", ""))
            w["level"] = "TOEIC 500" if w_len <= 6 else "TOEIC 650" if w_len <= 9 else "TOEIC 750+"
        if not w.get("category"):
            w["category"] = w.get("topic") or "office"
        if "audio_url" in w and not w.get("audio_us"):
            w["audio_us"] = w["audio_url"]

    return {
        "total": len(filtered),
        "total_bank": len(words),
        "page": page,
        "limit": limit,
        "words": paged
    }


# (Using primary TOPIC_KEYWORDS defined above)

def classify_word_topic(word: str, meaning: str, context: str) -> str:
    text = f"{word} {meaning} {context}".lower()
    for topic, kw_list in TOPIC_KEYWORDS.items():
        if any(kw in text for kw in kw_list):
            return topic
    return "general"

@router.get("/review-due")
def get_vocabulary_review_due(
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns words due for review via Spaced Repetition (SRS).
    If user has no cards, automatically seeds initial deck from bank.
    """
    user_id = user.id if user else GUEST_USER_ID
    now = datetime.utcnow()
    cards = db.query(models.UserFlashcard).filter(
        models.UserFlashcard.user_id == user_id,
        models.UserFlashcard.next_review_at <= now
    ).order_by(models.UserFlashcard.next_review_at.asc()).limit(30).all()

    # If empty, seed 15 high-frequency words for user
    if len(cards) < 5:
        bank = get_vocab_bank()
        existing_word_ids = {c.word_id for c in db.query(models.UserFlashcard.word_id).filter(models.UserFlashcard.user_id == user_id).all()}
        added = 0
        for item in bank:
            if item["id"] not in existing_word_ids and added < 12:
                new_card = models.UserFlashcard(
                    user_id=user_id,
                    word_id=item["id"],
                    word=item["word"],
                    ipa=item.get("ipa", ""),
                    meaning=item.get("meaning", ""),
                    part_of_speech=item.get("part_of_speech", ""),
                    example=item.get("example", ""),
                    audio_url=item.get("audio_url", ""),
                    srs_stage=1,
                    interval_days=1,
                    ease_factor=2.5,
                    repetitions=0,
                    lapses=0,
                    last_reviewed_at=now - timedelta(days=2),
                    next_review_at=now - timedelta(hours=1),
                    source_context=item.get("set_name", "Core TOEIC")
                )
                db.add(new_card)
                added += 1
        if added > 0:
            try:
                db.commit()
                cards = db.query(models.UserFlashcard).filter(
                    models.UserFlashcard.user_id == user_id,
                    models.UserFlashcard.next_review_at <= now
                ).order_by(models.UserFlashcard.next_review_at.asc()).limit(30).all()
            except Exception:
                db.rollback()

    return {
        "due_count": len(cards),
        "cards": [
            {
                "id": c.id,
                "word_id": c.word_id,
                "word": c.word,
                "ipa": c.ipa,
                "meaning": c.meaning,
                "part_of_speech": c.part_of_speech,
                "example": c.example,
                "audio_url": c.audio_url,
                "srs_stage": c.srs_stage,
                "interval_days": c.interval_days,
                "repetitions": c.repetitions,
                "next_review_at": c.next_review_at.isoformat() if c.next_review_at else ""
            }
            for c in cards
        ]
    }

@router.post("/review")
def submit_vocabulary_review(
    payload: dict,
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Updates flashcard review intervals using SM-2 Spaced Repetition Algorithm.
    Grade: 1=Again, 2=Hard, 3=Good, 4=Easy
    """
    user_id = user.id if user else GUEST_USER_ID
    word_id = payload.get("word_id")
    grade = int(payload.get("grade", 3))

    from sqlalchemy import func
    card = db.query(models.UserFlashcard).filter(
        models.UserFlashcard.user_id == user_id,
        (models.UserFlashcard.word_id == str(word_id)) |
        (func.lower(models.UserFlashcard.word) == str(word_id).strip().lower()) |
        (models.UserFlashcard.id == (int(word_id) if str(word_id).isdigit() else -1))
    ).first()

    if not card:
        # Create card if not exists
        bank = get_vocab_bank()
        found = next((w for w in bank if w["id"] == word_id or w["word"].lower() == str(word_id).lower()), None)
        if found:
            card = models.UserFlashcard(
                user_id=user_id,
                word_id=found["id"],
                word=found["word"],
                ipa=found.get("ipa", ""),
                meaning=found.get("meaning", ""),
                part_of_speech=found.get("part_of_speech", ""),
                example=found.get("example", ""),
                audio_url=found.get("audio_url", ""),
                srs_stage=1,
                interval_days=1,
                ease_factor=2.5
            )
            db.add(card)
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy thẻ từ vựng")

    now = datetime.utcnow()
    # SM-2 calculation
    if grade < 3:
        card.srs_stage = max(1, card.srs_stage - 1)
        card.repetitions = 0
        card.interval_days = 1
        card.lapses = (card.lapses or 0) + 1
    else:
        card.repetitions = (card.repetitions or 0) + 1
        # Ease factor adjustment
        ef = card.ease_factor or 2.5
        ef = max(1.3, ef + (0.1 - (4 - grade) * (0.08 + (4 - grade) * 0.02)))
        card.ease_factor = round(ef, 2)

        if card.repetitions == 1:
            card.interval_days = 1
        elif card.repetitions == 2:
            card.interval_days = 3
        else:
            card.interval_days = max(1, int((card.interval_days or 1) * card.ease_factor))

        card.srs_stage = min(5, (card.srs_stage or 1) + 1)

    card.last_reviewed_at = now
    card.next_review_at = now + timedelta(days=card.interval_days)

    db.commit()
    return {
        "status": "success",
        "word": card.word,
        "srs_stage": card.srs_stage,
        "interval_days": card.interval_days,
        "next_review_at": card.next_review_at.strftime("%d/%m/%Y")
    }

@router.get("/learned")
def get_learned_vocabulary(
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Returns all vocabulary words learned by the user with SRS status.
    """
    user_id = user.id if user else GUEST_USER_ID
    cards = db.query(models.UserFlashcard).filter(
        models.UserFlashcard.user_id == user_id
    ).order_by(models.UserFlashcard.last_reviewed_at.desc()).all()

    return {
        "total": len(cards),
        "words": [
            {
                "id": c.id,
                "word_id": c.word_id,
                "word": c.word,
                "ipa": c.ipa,
                "meaning": c.meaning,
                "part_of_speech": c.part_of_speech,
                "example": c.example,
                "audio_url": c.audio_url,
                "srs_stage": c.srs_stage,
                "interval_days": c.interval_days,
                "repetitions": c.repetitions,
                "last_reviewed": c.last_reviewed_at.strftime("%d/%m/%Y") if c.last_reviewed_at else "Mới thêm",
                "next_review": c.next_review_at.strftime("%d/%m/%Y") if c.next_review_at else ""
            }
            for c in cards
        ]
    }

@router.get("/{word_id}")
def get_word_detail(word_id: str):
    words = get_vocab_bank()
    found = next((w for w in words if w["id"] == word_id or w["word"].lower() == word_id.lower()), None)
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy từ vựng")
    return found
