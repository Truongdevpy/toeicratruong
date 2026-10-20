# -*- coding: utf-8 -*-
import json
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import models
from gemini_pool import gemini_pool

DEEPTUTOR_SYSTEM_PROMPT = """Bạn là Gia sư AI cá nhân hóa của nền tảng TOEIC Ra Trường (chuẩn kiến trúc Socratic AI & khảo thí ETS).
Bạn đóng vai trò là một gia sư dạy kèm 1-kèm-1 thông minh, kiên nhẫn, sắc sảo, am hiểu tường tận bẫy đề thi TOEIC format mới của Viện Khảo thí Giáo dục Hoa Kỳ (ETS).

## NGUYÊN TẮC GIẢNG DẠY BẮT BUỘC:

1. PHƯƠNG PHÁP GỢI MỞ SOCRATIC (TUYỆT ĐỐI KHÔNG GIẢI HỘ NGAY):
   - Khi học viên hỏi một câu bài tập hoặc hỏi bẫy, KHÔNG đưa ngay đáp án A, B, C, D.
   - Luôn đặt 1 câu hỏi gợi mở manh mối: "Trước chỗ trống là từ loại gì?", "Em có nghe thấy từ nào bị lặp lại âm ở câu hỏi không?", "Động từ chính của mệnh đề này đã có chưa?".
   - Hướng dẫn học viên tự tư duy và loại trừ các phương án gây nhiễu (distractors).

2. MẸO PHẢN XẠ 5 GIÂY ETS:
   - Part 5 & 6: Luôn chỉ ra dấu hiệu nhận biết trước/sau chỗ trống (đuôi từ -tion, -ment, -ive, -ly, thì động từ, liên từ).
   - Part 1 & 2: Nhắc lại quy tắc loại trừ tức thì (bẫy lặp âm Echo, bẫy hành động being + V3 với tranh chỉ đồ vật tĩnh).
   - Part 3 & 4: Kỹ thuật nhận diện từ khóa bị paraphrase (từ đồng nghĩa).
   - Part 7: Kỹ thuật Scan & Skim tìm dẫn chứng (evidence).

3. ĐỒNG CẢM & BÁM SÁT MỤC TIÊU HỌC VIÊN:
   - Dùng văn phong tự nhiên, thân thiện, khích lệ tinh thần học viên.
   - Luôn liên kết kiến thức giải đáp với mục tiêu điểm số và các lỗ hổng kiến thức đã chẩn đoán từ bài test.

4. HỖ TRỢ MINI-QUIZ TỰ ĐỘNG:
   - Khi học viên hiểu bài, hoặc khi học viên yêu cầu "bài tập", "kiểm tra", "quiz", hãy xuất đúng 1 câu hỏi mini-quiz kiểm tra phản xạ dạng JSON kèm theo:
```json
{
  "has_quiz": true,
  "quiz": {
    "question": "Nội dung câu hỏi tiếng Anh...",
    "options": {
      "A": "phương án A",
      "B": "phương án B",
      "C": "phương án C",
      "D": "phương án D"
    },
    "correct_answer": "A",
    "explanation": "Giải thích chi tiết vì sao phương án A đúng và cách loại trừ bẫy..."
  }
}
```
"""

def build_profile_context(user: models.User) -> str:
    if not user or not user.profile:
        return "Người học TOEIC mục tiêu 650."
    p = user.profile
    weak_areas = []
    if p.weak_areas:
        try:
            import json as _json
            weak_raw = _json.loads(p.weak_areas) if isinstance(p.weak_areas, str) and p.weak_areas.startswith("[") else [p.weak_areas]
            for item in weak_raw:
                if isinstance(item, dict):
                    weak_areas.append(item.get("weakness_title", str(item)))
                else:
                    weak_areas.append(str(item))
        except Exception:
            weak_areas = [str(p.weak_areas)]
    weak_str = ", ".join(weak_areas[:4]) if weak_areas else "Part 5 (Word Form), Part 2 (Bẫy lặp âm)"
    notes = getattr(p, "ai_memory_notes", "") or ""
    return (
        f"=== HỒ SƠ NHẬN THỨC CỦA HỌC VIÊN (TỪ BÀI ĐÁNH GIÁ NĂNG LỰC) ===\n"
        f"- Học viên: {user.full_name or 'Học viên'}\n"
        f"- Mục tiêu: {p.target_score or 650} TOEIC (Điểm hiện tại: {p.current_score or 450})\n"
        f"- Điểm yếu ưu tiên cần trị dứt điểm: {weak_str}\n"
        f"- Trí nhớ chẩn đoán: {notes or 'Ưu tiên khắc phục bẫy ngữ pháp Part 5 và bẫy phản xạ Part 2.'}\n"
        f"=================================================================="
    )

def answer_tutor_query(
    db: Session,
    user: models.User,
    message: str,
    action: Optional[str] = None,
    conversation_id: Optional[int] = None
) -> Dict[str, Any]:
    profile_ctx = build_profile_context(user)
    target_score = user.profile.target_score if (user and user.profile) else 650
    user_name = user.full_name if user else "Bạn"

    # Multi-turn conversational memory (DeepTutor Short-Term Context Trace)
    history_ctx = ""
    if conversation_id:
        try:
            recent_msgs = db.query(models.AIMessage).filter(
                models.AIMessage.conversation_id == conversation_id
            ).order_by(models.AIMessage.created_at.desc()).limit(6).all()
            if recent_msgs:
                recent_msgs = list(reversed(recent_msgs))
                formatted_turns = []
                for m in recent_msgs:
                    sender_label = "Học viên" if m.sender == "user" else "DeepTutor"
                    formatted_turns.append(f"{sender_label}: {m.content[:350]}")
                history_ctx = "\n".join(formatted_turns)
        except Exception as e:
            print("Warning loading conversation history for AI Tutor:", e)

    # Construct DeepTutor user prompt with Multi-tier context
    user_prompt = (
        "=== HỒ SƠ & TRÍ NHỚ HỌC VIÊN (DEEPTUTOR LONG-TERM COGNITIVE PROFILE) ===\n"
        + f"{profile_ctx}\n\n"
        + (f"=== LỊCH SỬ TRAO ĐỔI TRƯỚC ĐÓ TRONG PHIÊN (CONVERSATION TRACE) ===\n{history_ctx}\n\n" if history_ctx else "")
        + "=== LƯỢT TƯƠNG TÁC HIỆN TẠI (CURRENT TURN) ===\n"
        + f"Yêu cầu / Câu hỏi của học viên: \"{message}\"\n"
        + f"Hành động lựa chọn (action): {action or 'hỏi đáp tự do'}\n\n"
        + f"Hãy đóng vai DeepTutor TOEIC để giải đáp một cách thông minh, gợi mở tư duy Socratic, bám sát mục tiêu {target_score} điểm."
    )

    # 1. Try invoking Multi-Gemini Pool
    gemini_res = gemini_pool.generate_content(
        system_instruction=DEEPTUTOR_SYSTEM_PROMPT,
        user_prompt=user_prompt
    )

    if gemini_res.get("success") and gemini_res.get("text"):
        reply_text = gemini_res["text"]
        quiz_item = gemini_res.get("quiz")
        quiz_data = [quiz_item] if quiz_item else None

        return {
            "reply": reply_text,
            "quiz_data": quiz_data,
            "quiz": quiz_item,
            "source": f"gemini ({gemini_res.get('model', 'gemini-2.0-flash')})"
        }

    # 2. Resilient Fallback: High-Quality DeepTutor Socratic Rule Engine
    msg_lower = message.lower()
    quiz_data = None
    response_text = ""

    if action == "explain_simpler" or "giải thích" in msg_lower or "giai thich" in msg_lower or "don gian" in msg_lower:
        response_text = (
            f"💡 **DeepTutor: Mẹo phản xạ 5 giây (Mục tiêu TOEIC {target_score}):**\n\n"
            f"Để làm nhanh câu này mà không cần dịch cả câu, bạn chỉ cần nhớ 2 bước:\n\n"
            f"1. **Quan sát vị trí đứng trước và sau chỗ trống:**\n"
            f"   - Trước là mạo từ (*a/an/the*) hoặc tính từ sở hữu (*our/their/its*) và sau là giới từ -> **Chắc chắn điền DANH TỪ**.\n"
            f"   - Đứng giữa trợ động từ (*has/have/will/is*) và động từ chính -> **Cần TRẠNG TỪ (-ly)** để bổ nghĩa.\n\n"
            f"2. **Dấu hiệu nhận biết đuôi từ (Suffixes):**\n"
            f"   - Danh từ: *-tion, -sion, -ment, -ance, -ence, -ity*\n"
            f"   - Tính từ: *-ful, -ive, -able, -al, -ic*\n"
            f"   - Trạng từ: *Tính từ + ly*\n\n"
            f"👉 Bạn hãy áp dụng ngay quy tắc này vào câu hỏi bạn đang làm nhé!"
        )

    elif action == "give_examples" or "ví dụ" in msg_lower or "vi du" in msg_lower:
        response_text = (
            f"📝 **DeepTutor: 3 Ngữ cảnh thực tế hay gặp nhất trong đề thi TOEIC:**\n\n"
            f"1. **Thông báo nội bộ công ty (Office Memo - Part 5):**\n"
            f"   *\"All employees must submit their travel expense **reports** by Friday afternoon.\"*\n"
            f"   ↳ Cần danh từ số nhiều *reports* làm tân ngữ sau tính từ ghép *travel expense*.\n\n"
            f"2. **Email trao đổi đối tác (Business Correspondence - Part 6):**\n"
            f"   *\"The board of directors has **unanimously** approved the commercial proposal.\"*\n"
            f"   ↳ Trạng từ *unanimously* (nhất trí 100%) đứng kẹp giữa trợ động từ *has* và phân từ *approved*.\n\n"
            f"3. **Hợp đồng & Đánh giá nhân sự (Part 7):**\n"
            f"   *\"Ms. Davis was commended for her **exceptional** dedication to client satisfaction.\"*\n"
            f"   ↳ Tính từ *exceptional* (xuất sắc, nổi trội) bổ nghĩa cho danh từ *dedication*."
        )

    elif action == "quiz" or "bài tập" in msg_lower or "bai tap" in msg_lower or "trac nghiem" in msg_lower:
        quiz_item = {
            "question": "The company's latest software update will significantly improve employee _______ across all regional offices.",
            "options": [
                "A. productive",
                "B. productivity",
                "C. productively",
                "D. produce"
            ],
            "correct": "B",
            "explanation": "Sau danh từ 'employee' đóng vai trò bổ nghĩa cần một danh từ chính 'productivity' để tạo thành cụm danh từ 'năng suất nhân viên'. 'Productivity' (n) là phương án chính xác."
        }
        quiz_data = [quiz_item]
        response_text = (
            f"🎯 **DeepTutor Mini-Quiz: Kiểm tra phản xạ tức thì (Mục tiêu {target_score}+):**\n\n"
            f"Tôi vừa tạo 1 câu hỏi bám sát format đề thi ETS mới nhất dưới đây. "
            f"Bạn hãy bấm chọn phương án trực tiếp để kiểm tra xem mình đã nắm chắc quy tắc chưa nhé!"
        )

    elif action == "mistake_analysis" or "lỗi sai" in msg_lower or "loi sai" in msg_lower or "bẫy" in msg_lower:
        response_text = (
            f"⚠️ **DeepTutor: Phân tích 2 bẫy kinh điển ETS hay gài ({profile_ctx}):**\n\n"
            f"1. **Bẫy tính từ đuôi -ing và -ed trong Part 5:**\n"
            f"   - Đuôi *-ing* diễn tả **bản chất, đặc điểm của sự vật/sự việc** (*an inspiring speech* - bài phát biểu truyền cảm hứng).\n"
            f"   - Đuôi *-ed* diễn tả **cảm xúc của con người** (*feeling inspired* - cảm thấy được truyền cảm hứng).\n\n"
            f"2. **Bẫy lặp từ & đồng âm trong Listening Part 2:**\n"
            f"   - Khi nghe thấy một từ xuất hiện y hệt trong câu hỏi lặp lại ở đáp án, 80% đó là **bẫy gây nhiễu (distractor)**.\n"
            f"   - Đáp án đúng của các câu hỏi điểm cao thường được **paraphrase** bằng từ đồng nghĩa hoặc câu trả lời gián tiếp."
        )

    else:
        response_text = (
            f"Xin chào {user_name}! Tôi là **DeepTutor TOEIC**, trợ lý học tập cá nhân hóa thông minh của bạn. 🌟\n\n"
            f"Mục tiêu hiện tại của bạn là **{target_score} điểm**. "
            f"Tôi đồng hành cùng bạn để phân tích bẫy đề thi, chỉ ra mẹo nhận biết 5 giây và củng cố phản xạ.\n\n"
            f"💡 **Bạn có thể thử nhanh:**\n"
            f"- Bấm **'Giải thích đơn giản hơn'** nếu gặp quy tắc ngữ pháp phức tạp.\n"
            f"- Bấm **'Cho ví dụ thực tế'** để xem cách từ vựng xuất hiện trong đề thi.\n"
            f"- Bấm **'Tạo bài tập kiểm tra'** để làm ngay câu trắc nghiệm phản xạ.\n"
            f"- Hoặc dán trực tiếp bất kỳ câu hỏi nào bạn đang thắc mắc vào đây!"
        )

    return {
        "reply": response_text,
        "quiz_data": quiz_data,
        "quiz": quiz_data[0] if quiz_data else None,
        "source": "deeptutor_socratic_engine"
    }
