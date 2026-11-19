import sqlite3
import random
from fastapi import APIRouter, HTTPException, Query
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

router = APIRouter(prefix="/api/grammar", tags=["grammar"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
GRAMMAR_FILE = WEB_READY_DIR / "grammar_curriculum.json"
CRAWLER_DB = DATA_DIR / "crawler.db"

_grammar_cache = None
_formatted_topics_cache = None
_topic_detail_cache = {}

CATEGORY_MAP = {
    "d62945da-345b-4dad-bc21-bc9f1f07cd74": ("Từ loại & Cấu tạo từ", "Nouns & Word Forms", "text-blue-600 bg-blue-50 border-blue-200", "Bắt buộc 100% đề ETS. Nhận diện đuôi chỉ người/vật và vị trí danh từ trong câu."),
    "91390352-861b-4499-8641-5bcba42d67c4": ("Từ loại & Cấu tạo từ", "Adjectives", "text-blue-600 bg-blue-50 border-blue-200", "Đứng trước danh từ hoặc sau linking verb. Phân biệt tính từ đuôi -ed và -ing."),
    "f2c80ee2-c12f-41c8-9bbd-e33b7c8fdfc8": ("Từ loại & Cấu tạo từ", "Adverbs", "text-blue-600 bg-blue-50 border-blue-200", "Bổ nghĩa cho động từ, tính từ hoặc toàn câu. Dấu hiệu đuôi -ly và trạng từ tần suất."),
    "7040de07-a601-40c7-9736-4e1ca9ebf62b": ("Từ loại & Cấu tạo từ", "Pronouns", "text-blue-600 bg-blue-50 border-blue-200", "Đại từ nhân xưng, tính từ sở hữu, đại từ phản thân (-self) và đại từ chỉ định."),

    "3293dd00-8a54-4341-9e5a-20ca900bc377": ("Động từ & Các thì", "Tenses & Time Markers", "text-emerald-600 bg-emerald-50 border-emerald-200", "12 thì tiếng Anh, tập trung thì Hiện tại hoàn thành, Quá khứ đơn, Tương lai đơn."),
    "33d90f95-9277-4f14-b9b5-f6dc9a9d30ab": ("Động từ & Các thì", "Verb Forms (To-V / V-bare)", "text-emerald-600 bg-emerald-50 border-emerald-200", "Động từ chính vs động từ phụ, cấu trúc To-V chỉ mục đích, V-bare sau modal verbs."),
    "22619c80-cb9b-4b5a-8885-d461a8047539": ("Động từ & Các thì", "Gerunds (V-ing)", "text-emerald-600 bg-emerald-50 border-emerald-200", "V-ing làm chủ ngữ, tân ngữ, và đi sau các giới từ hoặc động từ đặc biệt."),
    "42bdb627-d767-4c8a-a387-4c442b8bc6cd": ("Động từ & Các thì", "Imperatives", "text-emerald-600 bg-emerald-50 border-emerald-200", "Câu mệnh lệnh, hướng dẫn vận hành, bắt đầu bằng động từ nguyên thể không chia."),

    "b1956d6b-d149-405f-8776-63ebce5b01e7": ("Cấu trúc câu & Mối quan hệ", "Subject-Verb Agreement", "text-purple-600 bg-purple-50 border-purple-200", "Hòa hợp giữa chủ ngữ số ít/số nhiều, đại từ bất định và cụm giới từ chen ngang."),
    "7c45888d-f5ec-4483-94e4-0f8fdc96e57a": ("Cấu trúc câu & Mối quan hệ", "Passive Voice", "text-purple-600 bg-purple-50 border-purple-200", "Thể bị động: S + be + V3/ed. Nhận diện câu thiếu tân ngữ trực tiếp."),
    "666363f0-a9ea-44c1-ba35-95d83bc3ba6a": ("Cấu trúc câu & Mối quan hệ", "Comparisons", "text-purple-600 bg-purple-50 border-purple-200", "So sánh bằng (as...as), hơn (-er/more...than), nhất (-est/the most) và kép (the more...the more)."),
    "ff82cdcd-4a69-4c7f-b5c3-30e1c3775b9e": ("Cấu trúc câu & Mối quan hệ", "Conditionals (If / Unless)", "text-purple-600 bg-purple-50 border-purple-200", "Câu điều kiện loại 1, 2, 3 và đảo ngữ câu điều kiện hay bẫy trong Part 5."),

    "84507512-ab2d-4194-a976-51138ad24b1c": ("Mệnh đề & Từ nối", "Conjunctions & Prepositions", "text-amber-600 bg-amber-50 border-amber-200", "Phân biệt liên từ (+ mệnh đề) và giới từ (+ cụm danh từ): because vs because of, although vs despite."),
    "46b6b197-8fc6-49c4-8d82-f21968f0fe7a": ("Mệnh đề & Từ nối", "Relative Clauses", "text-amber-600 bg-amber-50 border-amber-200", "Đại từ quan hệ Who, Whom, Which, That, Whose và kỹ thuật rút gọn V-ing / V3-ed."),
    "0b1ae68b-c853-4028-8aec-7582e6f5e654": ("Mệnh đề & Từ nối", "Adverb Clauses & Reduction", "text-amber-600 bg-amber-50 border-amber-200", "Mệnh đề trạng ngữ chỉ thời gian, nguyên nhân, nhượng bộ và rút gọn chủ ngữ.")
}

DEFAULT_GRAMMAR_META = {
    "Danh từ": {
        "formula": "S + V + O / Noun + Noun (Compound) / Adj + Noun",
        "tips": [
            "Đứng sau mạo từ (a/an/the), tính từ sở hữu (my/our/their) hoặc giới từ.",
            "Nhận diện đuôi danh từ chỉ vật (-tion, -ment, -ance, -ity) và chỉ người (-er, -or, -ant, -ee)."
        ],
        "examples": [
            {"en": "The manager approved the annual budget.", "vi": "Người quản lý đã phê duyệt ngân sách hàng năm."},
            {"en": "Customer satisfaction is our top priority.", "vi": "Sự hài lòng của khách hàng là ưu tiên hàng đầu của chúng tôi."}
        ]
    },
    "Tính từ": {
        "formula": "Adj + Noun / Linking Verb (be/seem/become) + Adj",
        "tips": [
            "Bổ nghĩa cho danh từ đứng sau hoặc làm vị ngữ sau linking verbs.",
            "Nhận diện đuôi tính từ: -ful, -able, -ive, -ous, -ic, -al, -ent."
        ],
        "examples": [
            {"en": "The company reported impressive quarterly growth.", "vi": "Công ty đã báo cáo mức tăng trưởng quý đầy ấn tượng."}
        ]
    },
    "Trạng từ": {
        "formula": "S + Adv + V / V + Adv / Adv + Adj",
        "tips": [
            "Bổ nghĩa cho động từ, tính từ hoặc trạng từ khác.",
            "Đa số trạng từ có đuôi -ly (quick -> quickly), chú ý trạng từ đặc biệt như hard, fast, late."
        ],
        "examples": [
            {"en": "Please review the contract carefully before signing.", "vi": "Vui lòng xem lại hợp đồng cẩn thận trước khi ký."}
        ]
    },
    "Thì": {
        "formula": "Present Simple / Past Simple / Present Perfect / Future Simple",
        "tips": [
            "Dựa vào dấu hiệu thời gian (yesterday, since, already, next week) để chọn thì chính xác.",
            "Hòa hợp thì giữa mệnh đề chính và mệnh đề phụ."
        ],
        "examples": [
            {"en": "The director has already finalized the schedule.", "vi": "Giám đốc đã hoàn tất lịch trình rồi."}
        ]
    },
    "Hòa hợp chủ ngữ – động từ": {
        "formula": "Subject (Singular) + Verb (Singular) / Subject (Plural) + Verb (Plural)",
        "tips": [
            "Bỏ qua các cụm giới từ chen giữa chủ ngữ và động từ.",
            "Các đại từ bất định (everyone, each, neither) luôn đi với động từ số ít."
        ],
        "examples": [
            {"en": "Each of the participants receives a certificate.", "vi": "Mỗi người tham dự đều nhận được một chứng chỉ."}
        ]
    },
    "Chủ động – bị động": {
        "formula": "Passive: S + be + V3/ed (+ by O)",
        "tips": [
            "Nếu sau chỗ trống không có tân ngữ (object) trực tiếp, thường chọn câu bị động.",
            "Xem xét chủ ngữ là đối tượng thực hiện hành động hay bị tác động."
        ],
        "examples": [
            {"en": "The meeting room was reserved yesterday.", "vi": "Phòng họp đã được đặt từ hôm qua."}
        ]
    },
    "Danh động từ": {
        "formula": "V-ing (as Subject / Object / after Prepositions)",
        "tips": [
            "Đứng đầu câu làm chủ ngữ (số ít) hoặc đứng sau giới từ.",
            "Các động từ theo sau là V-ing: consider, suggest, avoid, postpone, enjoy."
        ],
        "examples": [
            {"en": "Upgrading our software improved team efficiency.", "vi": "Việc nâng cấp phần mềm đã cải thiện hiệu quả làm việc nhóm."}
        ]
    },
    "Câu mệnh lệnh": {
        "formula": "V (bare infinitive) + O / Please + V (bare infinitive)",
        "tips": [
            "Bắt đầu bằng động từ nguyên mẫu không chia to, thường dùng trong hướng dẫn, biển báo.",
            "Dùng 'Please do not + V' cho mệnh lệnh phủ định."
        ],
        "examples": [
            {"en": "Please submit your receipts to accounting by Friday.", "vi": "Vui lòng nộp hóa đơn cho kế toán trước thứ Sáu."}
        ]
    },
    "Dạng động từ": {
        "formula": "To-Infinitive vs Bare-Infinitive vs Gerund",
        "tips": [
            "Động từ chỉ mục đích thường dùng To-V (in order to / so as to).",
            "Động từ khuyết thiếu (modal verbs) luôn đi kèm V nguyên thể không 'to'."
        ],
        "examples": [
            {"en": "They decided to expand operations into Asia.", "vi": "Họ đã quyết định mở rộng hoạt động sang châu Á."}
        ]
    },
    "Đại từ": {
        "formula": "Subject Pronoun / Object Pronoun / Possessive Adjective / Reflexive Pronoun",
        "tips": [
            "Trước danh từ dùng tính từ sở hữu (their/our/its).",
            "Sau động từ/giới từ dùng tân ngữ (them/us/him) hoặc phản thân (-self) nếu chủ ngữ cùng đối tượng."
        ],
        "examples": [
            {"en": "The CEO congratulated all employees on their outstanding performance.", "vi": "Tổng giám đốc đã chúc mừng toàn thể nhân viên về thành tích xuất sắc của họ."}
        ]
    },
    "So sánh": {
        "formula": "Equality: as + Adj/Adv + as | Comparative: -er/more than | Superlative: the -est/most",
        "tips": [
            "Nhận diện 'than' để chọn so sánh hơn, nhận diện 'the' để chọn so sánh nhất.",
            "Trạng từ nhấn mạnh so sánh hơn: much, far, significantly, slightly."
        ],
        "examples": [
            {"en": "This quarter's sales were significantly higher than last year's.", "vi": "Doanh số quý này cao hơn đáng kể so với năm ngoái."}
        ]
    },
    "Liên từ giới từ": {
        "formula": "Conjunction + Clause (S + V) vs Preposition + Noun / Noun Phrase",
        "tips": [
            "Because / Although / While đi với mệnh đề (S + V).",
            "Because of / Despite / During đi với cụm danh từ (Noun Phrase)."
        ],
        "examples": [
            {"en": "The event was canceled because of inclement weather.", "vi": "Sự kiện đã bị hủy bỏ do thời tiết xấu."}
        ]
    },
    "Mệnh đề quan hệ": {
        "formula": "Who/Whom (person), Which (thing), That (person/thing), Whose (possession)",
        "tips": [
            "Who làm chủ ngữ, Whom làm tân ngữ, Whose thay cho tính từ sở hữu.",
            "Rút gọn chủ động -> V-ing, rút gọn bị động -> V3/ed."
        ],
        "examples": [
            {"en": "Applicants who meet all requirements will be contacted.", "vi": "Những ứng viên đáp ứng đủ yêu cầu sẽ được liên hệ."}
        ]
    },
    "Câu điều kiện": {
        "formula": "Type 1: If + S + V(s/es), S + will/can + V | Type 2: If + S + V2/ed, S + would + V",
        "tips": [
            "Unless = If not (trừ khi).",
            "Đảo ngữ loại 1: Should + S + V-inf, S + will + V."
        ],
        "examples": [
            {"en": "If you require further assistance, please contact customer support.", "vi": "Nếu quý khách cần thêm sự trợ giúp, vui lòng liên hệ bộ phận hỗ trợ khách hàng."}
        ]
    },
    "Mệnh đề trạng ngữ": {
        "formula": "Time: when/while/before/after | Reason: because/since | Concession: although/though",
        "tips": [
            "Mệnh đề trạng ngữ chỉ thời gian không dùng thì tương lai (will), dùng hiện tại đơn.",
            "Rút gọn mệnh đề trạng ngữ khi hai mệnh đề cùng chủ ngữ: V-ing hoặc V3/ed."
        ],
        "examples": [
            {"en": "Before submitting the proposal, make sure all figures are verified.", "vi": "Trước khi nộp đề xuất, hãy đảm bảo mọi số liệu đều đã được xác minh."}
        ]
    }
}

def get_curriculum():
    global _grammar_cache
    if _grammar_cache is not None:
        return _grammar_cache
    if GRAMMAR_FILE.exists():
        try:
            _grammar_cache = json.loads(GRAMMAR_FILE.read_text(encoding="utf-8"))
        except Exception:
            _grammar_cache = {"curriculum": []}
    else:
        _grammar_cache = {"curriculum": []}
    return _grammar_cache

def resolve_topic_questions(t):
    all_qs = list(t.get("practice_questions") or [])
    if not all_qs:
        for s in t.get("subtopics", []):
            all_qs.extend(s.get("practice_questions") or [])
    if CRAWLER_DB.exists():
        try:
            conn_g = sqlite3.connect(CRAWLER_DB)
            conn_g.row_factory = sqlite3.Row
            cur_g = conn_g.cursor()
            cur_g.execute("SELECT raw_json FROM grammar_questions WHERE topic_id=? ORDER BY id", (t["id"],))
            rows = cur_g.fetchall()
            if rows:
                db_qs = [json.loads(r[0]) for r in rows if r[0]]
                if db_qs:
                    all_qs = db_qs
            conn_g.close()
        except Exception:
            pass
    return all_qs

@router.get("")
def list_grammar_topics():
    global _formatted_topics_cache
    if _formatted_topics_cache is not None:
        return _formatted_topics_cache

    data = get_curriculum()
    topics = data.get("curriculum", [])
    
    # Filter only topics that have real practice questions in crawler.db / curriculum
    formatted = []
    
    for t in topics:
        tid = t["id"]
        # Only retain the 15 valid topics with full authentic question banks
        if tid not in CATEGORY_MAP and len(t.get("practice_questions") or []) == 0:
            continue

        cat_info = CATEGORY_MAP.get(tid, ("Ngữ pháp TOEIC", t.get("title_en") or "Grammar", "text-blue-600 bg-blue-50 border-blue-200", "Chuyên đề ngữ pháp thường gặp."))
        sub_list = t.get("subtopics", [])
        all_qs = resolve_topic_questions(t)
        total_q = len(all_qs) or t.get("questions_count", 0)
        t_title = t.get("title_vi") or ""
        meta = DEFAULT_GRAMMAR_META.get(t_title, {
            "formula": t.get("formula") or f"S + V + C ({t_title})",
            "tips": t.get("tips") or [
                f"Nắm vững vị trí và dấu hiệu nhận biết của {t_title} trong đề thi TOEIC.",
                "Loại trừ các phương án sai về ngữ pháp trước khi chọn đáp án."
            ],
            "examples": t.get("examples") or [
                {"en": f"Please pay attention to this rule regarding {t_title}.", "vi": f"Vui lòng chú ý quy tắc này liên quan đến {t_title}."}
            ]
        })

        formula = t.get("formula") or meta["formula"]
        tips = t.get("tips") or meta["tips"]
        examples = t.get("examples") or meta["examples"]

        formatted.append({
            "id": t["id"],
            "slug": t.get("slug"),
            "title_vi": t.get("title_vi"),
            "title_en": t.get("title_en"),
            "category": cat_info[0],
            "group": cat_info[0],
            "subtitle": cat_info[1],
            "badge_color": cat_info[2],
            "description_vi": cat_info[3] or t.get("description_vi"),
            "formula": formula,
            "theory_html": t.get("theory_html", ""),
            "tips": tips,
            "examples": examples,
            "subtopics_count": len(sub_list),
            "lessons_count": len(sub_list),
            "questions_count": total_q,
            "practice_questions": all_qs[:10],
            "subtopics": [
                {
                    "id": s["id"],
                    "title_vi": s.get("title_vi"),
                    "title_en": s.get("title_en"),
                    "questions_count": len(s.get("practice_questions", []))
                }
                for s in sub_list
            ]
        })

    unique_groups = ["Tất cả", "Từ loại & Cấu tạo từ", "Động từ & Các thì", "Cấu trúc câu & Mối quan hệ", "Mệnh đề & Từ nối"]
    
    res = {
        "total": len(formatted),
        "total_topics": len(formatted),
        "total_lessons": sum(t.get("lessons_count", 0) for t in formatted),
        "total_questions": sum(t["questions_count"] for t in formatted),
        "groups": unique_groups,
        "topics": formatted
    }
    _formatted_topics_cache = res
    return res

@router.get("/random-practice")
def get_random_grammar_practice(
    topic_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=5, le=100)
):
    """
    Returns randomized TOEIC grammar questions for self-practice sessions.
    Can be filtered by specific topic_id or cross-topic mix.
    """
    questions = []
    if CRAWLER_DB.exists():
        try:
            conn = sqlite3.connect(CRAWLER_DB)
            cur = conn.cursor()
            if topic_id and topic_id != "all":
                cur.execute(
                    "SELECT raw_json FROM grammar_questions WHERE topic_id=? ORDER BY RANDOM() LIMIT ?",
                    (topic_id, limit)
                )
            else:
                cur.execute(
                    "SELECT raw_json FROM grammar_questions ORDER BY RANDOM() LIMIT ?",
                    (limit,)
                )
            rows = cur.fetchall()
            conn.close()

            for r in rows:
                try:
                    q = json.loads(r[0])
                    opts = [
                        f"A. {q.get('option_a') or ''}",
                        f"B. {q.get('option_b') or ''}",
                        f"C. {q.get('option_c') or ''}",
                        f"D. {q.get('option_d') or ''}"
                    ]
                    questions.append({
                        "id": q.get("id"),
                        "topic_id": q.get("topic_id"),
                        "question_text": q.get("question_text"),
                        "options": opts,
                        "option_a": q.get("option_a"),
                        "option_b": q.get("option_b"),
                        "option_c": q.get("option_c"),
                        "option_d": q.get("option_d"),
                        "correct_answer": (q.get("correct_answer") or "A").strip().upper(),
                        "explanation_vi": q.get("explanation_vi") or "",
                        "translation_vi": q.get("translation_vi") or "",
                        "vocabulary": q.get("vocabulary")
                    })
                except Exception:
                    pass
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "total": len(questions),
        "limit": limit,
        "topic_id": topic_id or "all",
        "questions": questions
    }

@router.get("/{topic_id}")
def get_topic_detail(topic_id: str):
    data = get_curriculum()
    topics = data.get("curriculum", [])
    found = next((t for t in topics if t["id"] == topic_id or t.get("slug") == topic_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyên đề ngữ pháp")

    all_qs = resolve_topic_questions(found)
    t_title = found.get("title_vi") or ""
    meta = DEFAULT_GRAMMAR_META.get(t_title, {
        "formula": found.get("formula") or f"S + V + C ({t_title})",
        "tips": found.get("tips") or [
            f"Nắm vững vị trí và dấu hiệu nhận biết của {t_title} trong đề thi TOEIC.",
            "Loại trừ các phương án sai về ngữ pháp trước khi chọn đáp án."
        ],
        "examples": found.get("examples") or [
            {"en": f"Please pay attention to this rule regarding {t_title}.", "vi": f"Vui lòng chú ý quy tắc này liên quan đến {t_title}."}
        ]
    })

    detail = dict(found)
    cat_info = CATEGORY_MAP.get(found["id"], ("Ngữ pháp TOEIC", found.get("title_en") or "Grammar", "text-blue-600 bg-blue-50 border-blue-200", "Chuyên đề ngữ pháp thường gặp."))
    detail["category"] = cat_info[0]
    detail["group"] = cat_info[0]
    detail["subtitle"] = cat_info[1]
    detail["badge_color"] = cat_info[2]
    detail["formula"] = found.get("formula") or meta["formula"]
    detail["tips"] = found.get("tips") or meta["tips"]
    detail["examples"] = found.get("examples") or meta["examples"]
    detail["practice_questions"] = all_qs
    detail["questions_count"] = len(all_qs)
    return detail

from pydantic import BaseModel

class GrammarAIExplainRequest(BaseModel):
    question: str
    options: List[str] = []
    correct_answer: str = ""
    user_choice: Optional[str] = None
    topic_title: Optional[str] = None

@router.post("/ai-explain")
def explain_grammar_with_ai(payload: GrammarAIExplainRequest):
    """
    Sử dụng Gemini API (thông qua unified ai service / gemini_pool) để giải thích chi tiết
    câu hỏi ngữ pháp, cung cấp mẹo giải 5 giây và chỉ ra bẫy ETS.
    """
    try:
        from ai_service_unified import ai_generate_explanation_and_tip
        
        # Chuyển options dạng list thành dictionary A, B, C, D
        opts_dict = {}
        for opt in payload.options:
            letter = opt.strip()[:1].upper()
            if letter in ["A", "B", "C", "D"]:
                opts_dict[letter] = opt.strip()
            else:
                idx = len(opts_dict)
                if idx < 4:
                    l = ["A", "B", "C", "D"][idx]
                    opts_dict[l] = opt.strip()

        result = ai_generate_explanation_and_tip(
            question_text=payload.question,
            options=opts_dict,
            correct_answer=payload.correct_answer or "A",
            user_choice=payload.user_choice or ""
        )

        return {
            "success": True,
            "explanation": result.get("explanation_vi", ""),
            "tip": result.get("toeic_tip", ""),
            "trap": result.get("trap_warning", ""),
            "source": "gemini_ai"
        }
    except Exception as e:
        return {
            "success": False,
            "explanation": f"Đáp án chuẩn là ({payload.correct_answer}). Hãy phân tích kỹ các thành phần ngữ pháp đứng trước và sau chỗ trống.",
            "tip": "Nhận diện từ loại (N/V/Adj/Adv) hoặc thì câu từ các dấu hiệu nhận biết.",
            "trap": "Cảnh giác các đuôi từ dễ gây nhầm lẫn.",
            "source": "fallback_rule"
        }
