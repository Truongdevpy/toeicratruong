import sqlite3
from fastapi import APIRouter, HTTPException, Query
import json
from pathlib import Path

router = APIRouter(prefix="/api/grammar", tags=["grammar"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
GRAMMAR_FILE = WEB_READY_DIR / "grammar_curriculum.json"

_grammar_cache = None

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
        "formula": "Subject Pronoun / Object Pronoun / Possessive Pronoun / Reflexive",
        "tips": [
            "Đại từ phản thân (myself, himself) dùng để nhấn mạnh hoặc khi chủ ngữ và tân ngữ là một.",
            "Tính từ sở hữu cần đi với danh từ, đại từ sở hữu đứng độc lập."
        ],
        "examples": [
            {"en": "The CEO drafted the speech himself.", "vi": "Đích thân Tổng giám đốc đã soạn thảo bài phát biểu."}
        ]
    },
    "So sánh": {
        "formula": "Comparative: Adj-er / more + Adj than; Superlative: the Adj-est / the most + Adj",
        "tips": [
            "Chú ý từ nhận biết: 'than' cho so sánh hơn, 'the' cho so sánh nhất.",
            "So sánh bằng: as + adj/adv + as."
        ],
        "examples": [
            {"en": "The new model is more efficient than the older version.", "vi": "Mẫu máy mới hoạt động hiệu quả hơn phiên bản cũ."}
        ]
    },
    "Liên từ giới từ": {
        "formula": "Conjunction + Clause (S + V) vs Preposition + Noun Phrase / V-ing",
        "tips": [
            "Phân biệt cặp từ nghĩa giống nhau: Because (liên từ) vs Because of (giới từ).",
            "Although/Even though (liên từ) vs Despite/In spite of (giới từ)."
        ],
        "examples": [
            {"en": "Despite the severe storm, shipments arrived on time.", "vi": "Bất chấp cơn bão dữ dội, các chuyến hàng vẫn đến đúng giờ."}
        ]
    },
    "Mệnh đề quan hệ": {
        "formula": "Noun + Who / Whom / Which / That / Whose + Clause",
        "tips": [
            "Who thay thế cho người làm chủ ngữ, Whom làm tân ngữ, Which cho vật.",
            "Whose chỉ sở hữu, sau whose luôn là danh từ không có mạo từ."
        ],
        "examples": [
            {"en": "The engineer who designed the blueprint won an award.", "vi": "Kỹ sư người thiết kế bản vẽ đã đoạt giải thưởng."}
        ]
    },
    "Câu điều kiện": {
        "formula": "Type 1: If + V(s/es), will + V / Type 2: If + V2/ed, would + V / Type 3: If + had + V3/ed, would have + V3/ed",
        "tips": [
            "Xác định đúng loại câu điều kiện dựa vào mệnh đề chính hoặc mệnh đề If.",
            "Đảo ngữ câu điều kiện: Should (Type 1), Were (Type 2), Had (Type 3)."
        ],
        "examples": [
            {"en": "If you require assistance, our support team will help you.", "vi": "Nếu bạn cần hỗ trợ, đội ngũ kỹ thuật của chúng tôi sẽ giúp bạn."}
        ]
    },
    "Mệnh đề trạng ngữ": {
        "formula": "Subordinating Conjunction (When/While/Although/Since) + S + V, S + V",
        "tips": [
            "Rút gọn mệnh đề trạng ngữ: dùng V-ing khi chủ động, V3/ed khi bị động.",
            "Chú ý hòa hợp thì giữa 2 mệnh đề."
        ],
        "examples": [
            {"en": "While attending the conference, she met several clients.", "vi": "Trong khi tham dự hội nghị, cô ấy đã gặp nhiều khách hàng."}
        ]
    }
}

def get_curriculum():
    global _grammar_cache
    if _grammar_cache is None:
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
    if not all_qs and (DATA_DIR / "crawler.db").exists():
        try:
            conn_g = sqlite3.connect(DATA_DIR / "crawler.db")
            conn_g.row_factory = sqlite3.Row
            cur_g = conn_g.cursor()
            cur_g.execute("SELECT * FROM grammar_questions WHERE topic_id=? ORDER BY id LIMIT 30", (t["id"],))
            rows = cur_g.fetchall()
            if not rows and t.get("title_vi"):
                cur_g.execute("""
                    SELECT gq.* FROM grammar_questions gq 
                    JOIN grammar_topics gt ON gt.id = gq.topic_id 
                    WHERE gt.title_vi = ? ORDER BY gq.id LIMIT 30
                """, (t["title_vi"],))
                rows = cur_g.fetchall()
            all_qs = [dict(r) for r in rows]
            conn_g.close()
        except Exception:
            pass
    return all_qs

@router.get("")
def list_grammar_topics():
    data = get_curriculum()
    topics = data.get("curriculum", [])
    
    formatted = []
    for t in topics:
        sub_list = t.get("subtopics", [])
        all_qs = resolve_topic_questions(t)
        total_q = t.get("questions_count") or len(all_qs) or sum(len(s.get("practice_questions", [])) for s in sub_list)
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
            "category": t.get("category") or t.get("group") or "Ngữ pháp TOEIC",
            "group": t.get("group") or t.get("category") or "Ngữ pháp TOEIC",
            "description_vi": t.get("description_vi"),
            "formula": formula,
            "theory_html": t.get("theory_html", ""),
            "tips": tips,
            "examples": examples,
            "subtopics_count": t.get("subtopics_count", len(sub_list)),
            "lessons_count": t.get("lessons_count", 0),
            "questions_count": total_q if total_q > 0 else len(all_qs),
            "practice_questions": all_qs[:10],
            "subtopics": [
                {
                    "id": s["id"],
                    "title_vi": s.get("title_vi"),
                    "title_en": s.get("title_en"),
                    "lessons_count": s.get("lessons_count", len(s.get("lessons", []))),
                    "questions_count": s.get("questions_count", len(s.get("practice_questions", [])))
                }
                for s in sub_list
            ]
        })

    return {
        "total": len(formatted),
        "total_topics": data.get("total_topics", len(formatted)),
        "total_lessons": data.get("total_lessons", sum(t.get("lessons_count", 0) for t in formatted)),
        "total_questions": data.get("total_questions", sum(t["questions_count"] for t in formatted)),
        "groups": data.get("groups", ["Từ loại", "Động từ", "Ngữ pháp khác"]),
        "topics": formatted
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
    detail["formula"] = found.get("formula") or meta["formula"]
    detail["tips"] = found.get("tips") or meta["tips"]
    detail["examples"] = found.get("examples") or meta["examples"]
    detail["practice_questions"] = all_qs
    return detail
