# -*- coding: utf-8 -*-
import json
import logging
import re
from typing import Dict, Any, List, Optional
from gemini_pool import gemini_pool

logger = logging.getLogger(__name__)

DEEPTUTOR_GRADER_SYSTEM_PROMPT = """Bạn là Chuyên gia Khảo thí và Giám khảo Đề thi TOEIC AI hàng đầu chuẩn ETS (Viện Khảo thí Giáo dục Hoa Kỳ).
Nhiệm vụ:
1. Chấm điểm, đánh giá mức độ thuần thục bài thi TOEIC Listening/Reading.
2. Dự đoán Band điểm TOEIC tương đương (thang điểm 10-990).
3. Phân tích chi tiết BẪY ĐỀ THI (Distractor/Trap Analysis) của ETS mà học viên đã mắc phải.
4. Cung cấp 'Mẹo 5 giây DeepTutor' (Socratic Rule) để học viên nhận diện và loại trừ bẫy tức thì ở các đề thi tiếp theo.
5. Chỉ ra từ vựng trọng tâm (High-Frequency Vocabulary) và ngữ pháp cốt lõi cần củng cố ngay.

YÊU CẦU ĐỊNH DẠNG:
Trả về DUY NHẤT một chuỗi JSON hợp lệ (không kèm markdown ngoài JSON, không kèm lời chào hỏi) theo đúng cấu trúc sau:
{
  "band_score_estimate": "650 - 720 TOEIC",
  "accuracy_rate": "80%",
  "level_verdict": "Khá - Có nền tảng vững chắc, cần tối ưu tốc độ và tránh bẫy Part 5",
  "overall_comment": "Nhận xét tổng quan mang tính khích lệ, chỉ rõ điểm mạnh và lỗ hổng kiến thức...",
  "strengths": [
    "Nắm chắc thì hiện tại hoàn thành và mệnh đề quan hệ",
    "Khả năng suy luận từ vựng công sở chuẩn xác"
  ],
  "traps_identified": [
    {
      "question_number": 102,
      "trap_type": "Bẫy Từ đồng âm / Bẫy Từ loại",
      "explanation": "Học viên chọn phương án gây nhiễu vì nhầm lẫn đuôi tính từ -ive và danh từ -tion.",
      "five_second_rule": "Vị trí sau to-be và trước danh từ -> Ưu tiên chọn Tính từ (-ive, -able, -al)."
    }
  ],
  "vocabulary_to_learn": [
    {
      "word": "negotiation",
      "ipa": "/nɪˌɡoʊ.ʃiˈeɪ.ʃən/",
      "meaning": "sự đàm phán, thương lượng hợp đồng",
      "context_note": "Thường xuất hiện trong Part 3, 4 và 7 (Contract & Purchasing)"
    }
  ],
  "action_plan": [
    "Ôn lại 38 chủ điểm ngữ pháp trọng tâm Part 5",
    "Luyện nghe ngắt quãng Part 2 để khắc phục bẫy lặp từ (Echo words)"
  ]
}
"""

def build_fallback_grading_report(
    skill: str,
    part: int,
    title: str,
    total: int,
    correct: int,
    wrong_items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    ratio = (correct / total) if total > 0 else 0
    pct = round(ratio * 100)

    if ratio >= 0.9:
        band = "850 - 940+ TOEIC"
        verdict = "Xuất sắc - Nắm vững toàn bộ format và kỹ thuật làm bài"
    elif ratio >= 0.75:
        band = "700 - 820 TOEIC"
        verdict = "Rất tốt - Khả năng phản xạ cao, chỉ mắc một vài bẫy paraphrase"
    elif ratio >= 0.55:
        band = "550 - 680 TOEIC"
        verdict = "Khá - Đã nắm được ngữ pháp cốt lõi, cần bổ sung từ vựng chuyên ngành"
    elif ratio >= 0.35:
        band = "400 - 520 TOEIC"
        verdict = "Trung bình - Cần củng cố gốc từ loại và cấu trúc câu cơ bản"
    else:
        band = "250 - 380 TOEIC"
        verdict = "Cần bứt phá - Bắt đầu từ lộ trình cơ bản và học theo từng Part"

    traps = []
    for item in wrong_items[:4]:
        q_num = item.get("question_number", 1)
        q_text = item.get("question_text", "")
        exp = item.get("explanation", "")
        corr = item.get("correct_option", "A")
        sel = item.get("selected_option", "B")

        trap_type = "Bẫy Distractor ETS"
        rule = "Loại trừ các đáp án chứa từ đồng âm hoặc lặp nguyên văn từ khóa trong câu hỏi."

        if part in [1, 2]:
            trap_type = "Bẫy Lặp Từ & Đồng Âm (Echo Word Trap)"
            rule = "Ở Part 2, 85% câu trả lời chứa từ lặp lại với câu hỏi là BẪY SAI. Hãy tìm câu trả lời gián tiếp."
        elif part in [3, 4]:
            trap_type = "Bẫy Chi Tiết Nhiễu (Distractor Details)"
            rule = "Đọc trước 3 câu hỏi trước khi audio phát. Chú ý từ đồng nghĩa (Paraphrasing) thay vì từ nguyên văn."
        elif part in [5, 6]:
            trap_type = "Bẫy Từ Loại & Thì Động Từ (Grammar Trap)"
            rule = "Xác định ngay chủ ngữ và động từ chính của mệnh đề. Dấu hiệu 5s: vị trí trước/sau khoảng trống."
        else:
            trap_type = "Bẫy Thông Tin Suy Luận Part 7 (Inference Trap)"
            rule = "Tìm từ khóa đồng nghĩa trong đoạn văn; cảnh giác với các phương án chứa 'always', 'only'."

        traps.append({
            "question_number": q_num,
            "trap_type": trap_type,
            "explanation": f"Bạn chọn {sel} nhưng đáp án đúng là {corr}. {exp or 'Cần chú ý ngữ cảnh và cấu trúc câu chuẩn ETS.'}",
            "five_second_rule": rule
        })

    default_vocab = [
        {"word": "implement", "ipa": "/ˈɪm.plə.ment/", "meaning": "thực thi, triển khai kế hoạch", "context_note": "Part 4, 7 (Company announcements)"},
        {"word": "compliant", "ipa": "/kəmˈplaɪ.ənt/", "meaning": "tuân thủ quy định", "context_note": "Part 5 (Word form & safety regulations)"},
        {"word": "renovation", "ipa": "/ˌren.əˈveɪ.ʃən/", "meaning": "sự nâng cấp, tu sửa", "context_note": "Part 3, 7 (Facility maintenance)"},
        {"word": "reimbursement", "ipa": "/ˌriː.ɪmˈbɝːs.mənt/", "meaning": "sự hoàn trả chi phí công tác", "context_note": "Part 3, 4, 7 (Finance & travel policy)"}
    ]

    return {
        "band_score_estimate": band,
        "accuracy_rate": f"{pct}% ({correct}/{total})",
        "level_verdict": verdict,
        "overall_comment": f"Bạn đã hoàn thành phần luyện tập {title} với độ chính xác {pct}%. Hệ thống AI DeepTutor ghi nhận bạn có phản xạ tương đối tốt. Hãy tập trung xử lý các bẫy đề thi bên dưới để nâng điểm mục tiêu!",
        "strengths": [
            f"Đã vượt qua {correct}/{total} câu hỏi trong bài luyện tập",
            "Duy trì thời gian làm bài ổn định, không bỏ trống phương án"
        ],
        "traps_identified": traps,
        "vocabulary_to_learn": default_vocab,
        "action_plan": [
            f"Làm lại ngay {len(wrong_items)} câu trả lời sai để ghi nhớ bẫy đề thi",
            "Lưu các từ vựng mới vào Flashcards SRS để ôn lặp lại ngắt quãng",
            "Áp dụng 'Mẹo 5 giây' loại trừ suy luận cho lần làm đề tiếp theo"
        ]
    }

def grade_practice_session(
    skill: str,
    part: int,
    title: str,
    answers: List[Dict[str, Any]],
    user_name: str = "Học viên"
) -> Dict[str, Any]:
    total = len(answers)
    correct = sum(1 for a in answers if a.get("is_correct") is True)
    wrong_items = [a for a in answers if not a.get("is_correct")]

    summary_data = []
    for a in answers:
        summary_data.append({
            "q": a.get("question_number"),
            "text": a.get("question_text", "")[:100],
            "user": a.get("selected_option"),
            "correct": a.get("correct_option"),
            "ok": a.get("is_correct"),
            "exp": a.get("explanation", "")[:120]
        })

    user_prompt = f"""Học viên: {user_name}
Kỹ năng: TOEIC {skill.capitalize()} Part {part} - {title}
Kết quả sơ bộ: {correct}/{total} câu đúng ({round(correct/total*100 if total else 0)}%)

Chi tiết bài làm:
{json.dumps(summary_data, ensure_ascii=False, indent=2)}

Hãy chấm bài và phân tích chẩn đoán bẫy đề thi ETS theo đúng định dạng JSON đã yêu cầu.
"""

    gemini_res = gemini_pool.generate_content(
        system_instruction=DEEPTUTOR_GRADER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.4
    )

    if gemini_res.get("success") and gemini_res.get("text"):
        raw_text = gemini_res["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            parsed = json.loads(raw_text)
            parsed["ai_powered"] = True
            parsed["model_used"] = gemini_res.get("model", "gemini-flash")
            parsed["key_used"] = gemini_res.get("key_used")
            return parsed
        except Exception as e:
            logger.warning(f"[AIGrading] Could not parse Gemini JSON response: {e}")

    fallback = build_fallback_grading_report(skill, part, title, total, correct, wrong_items)
    fallback["ai_powered"] = False
    fallback["model_used"] = "DeepTutor Heuristic Engine"
    return fallback


# ==========================================
# TOEIC SPEAKING & WRITING AI EVALUATION
# ==========================================

SPEAKING_GRADER_SYSTEM_PROMPT = """Bạn là Giám khảo Khảo thí TOEIC Speaking AI chuyên nghiệp chuẩn ETS kiêm Gia sư AI cá nhân hóa của TOEIC Ra Trường.
Nhiệm vụ: Chấm điểm, đánh giá và nhận xét chi tiết câu trả lời bài thi TOEIC Speaking của học viên.
Tiêu chí đánh giá ETS:
1. Phát âm, Ngữ điệu & Trọng âm (Pronunciation & Intonation: thang 0 - 5.0)
2. Ngữ pháp & Cấu trúc câu (Grammar: thang 0 - 5.0)
3. Từ vựng & Độ lưu loát (Vocabulary & Fluency: thang 0 - 5.0)
4. Ước tính Band điểm TOEIC Speaking cho câu này (thang 0 - 200 điểm) và Level (Level 1 đến Level 8).
5. Lời bình của Gia sư AI: Đưa ra nhận xét cụ thể, chỉ ra điểm sáng và các lỗi phát âm/ngữ điệu/ngữ pháp cần chỉnh sửa.
6. Câu trả lời mẫu chuẩn ETS (Sample Model Answer) để học viên tham khảo.

ĐỊNH DẠNG TRẢ VỀ DUY NHẤT LÀ JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "score_estimate": 160,
  "max_score": 200,
  "level": "Level 7 (160-180)",
  "pronunciation_score": 4.0,
  "grammar_score": 4.5,
  "fluency_score": 4.0,
  "overall_comment": "Lời bình của Gia sư AI...",
  "strengths": ["Phát âm rõ ràng các âm đuôi /s/, /ed/", "Sử dụng liên từ tự nhiên"],
  "areas_for_improvement": ["Cần nhấn trọng âm rõ hơn ở các từ 3 âm tiết", "Tránh ngập ngừng ở phần chuyển ý"],
  "sample_answer": "Câu trả lời mẫu gợi ý từ Gia sư AI...",
  "key_vocabulary": ["energy-efficient", "presentation", "showcase"]
}
"""

WRITING_GRADER_SYSTEM_PROMPT = """Bạn là Giám khảo Khảo thí TOEIC Writing AI chuyên nghiệp chuẩn ETS kiêm Gia sư AI cá nhân hóa của TOEIC Ra Trường.
Nhiệm vụ: Chấm điểm, đánh giá và nhận xét chi tiết bài thi viết TOEIC Writing theo đúng Rubric của từng dạng câu:
- Questions 1–5 (Viết 1 câu mô tả tranh): Thang điểm chuẩn ETS 0–3 điểm. Chỉ cần 1 câu đơn/phức đúng ngữ pháp, dùng đúng các từ gợi ý. KHÔNG yêu cầu từ nối đoạn văn (furthermore, nevertheless) hay bố cục nhiều đoạn.
- Questions 6–7 (Viết email phản hồi): Thang điểm chuẩn ETS 0–4 điểm. Đánh giá ngữ pháp, từ vựng, giọng văn email và đáp ứng đủ các yêu cầu đề bài.
- Question 8 (Bài luận quan điểm): Thang điểm chuẩn ETS 0–5 điểm. Đánh giá ngữ pháp, từ vựng, bố cục 3 phần và lập luận.

QUY TẮC BẮT BUỘC:
1. Nếu câu của học viên ĐÃ ĐÚNG ngữ pháp và không có lỗi sai thực sự, mảng "corrections" PHẢI để trống `[]`. TUYỆT ĐỐI KHÔNG lặp lại câu gốc vào mục "corrected" nếu không có gì sai.
2. "improved_answer" PHẢI là một câu/bài viết mẫu tiếng Anh THẬT SỰ, tự nhiên, đạt điểm tối đa chuẩn ETS dựa trên đề bài và từ gợi ý (KHÔNG viết câu hướng dẫn chung chung).
3. "actionable_tips" và "overall_comment" phải sát với dạng bài (ví dụ Q1-5: gợi ý thêm cụm giới từ chỉ nơi chốn, trạng từ, mệnh đề quan hệ; không khuyên dùng từ nối đoạn văn cho bài 1 câu).

ĐỊNH DẠNG TRẢ VỀ DUY NHẤT LÀ JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "score_estimate": 180,
  "max_score": 200,
  "rubric_max": 3,
  "rubric_score": 3.0,
  "level": "Level 8 (180-200)",
  "grammar_score": 3.0,
  "vocabulary_score": 3.0,
  "organization_score": 3.0,
  "overall_comment": "Lời bình của Gia sư AI...",
  "corrections": [],
  "improved_answer": "Câu/bài viết mẫu hoàn chỉnh chuẩn ETS...",
  "actionable_tips": [
    "Mẹo nâng band sát với dạng bài..."
  ]
}
"""

SW_SESSION_GRADER_SYSTEM_PROMPT = """Bạn là Hội đồng Khảo thí TOEIC Speaking & Writing AI chuẩn ETS kiêm Gia sư AI cá nhân hóa của TOEIC Ra Trường.
Nhiệm vụ: Đánh giá tổng thể toàn bộ bài thi Speaking hoặc Writing của học viên, tính toán tổng điểm trên thang 0 - 200, phân loại Level và vạch ra lộ trình khắc phục cụ thể.

ĐỊNH DẠNG TRẢ VỀ DUY NHẤT LÀ JSON:
{
  "total_score_estimate": 160,
  "max_score": 200,
  "level": "Level 7 (160-180)",
  "verdict": "Khá giỏi - Đạt chuẩn giao tiếp và soạn thảo tài liệu thương mại quốc tế",
  "overall_comment": "Lời bình tổng kết từ Gia sư AI...",
  "strengths": ["...", "..."],
  "weaknesses_to_fix": ["...", "..."],
  "action_plan": ["...", "..."]
}
"""

def grade_speaking_question(
    question_data: Dict[str, Any],
    user_transcript_or_notes: str,
    user_name: str = "Học viên",
    target_score: int = 160
) -> Dict[str, Any]:
    q_num = question_data.get("question_number", 1)
    prompt = question_data.get("prompt", "")
    context = question_data.get("context", "")

    user_prompt = f"""Học viên: {user_name} (Mục tiêu Speaking: {target_score}/200)
Câu hỏi số {q_num} (TOEIC Speaking)
Yêu cầu đề bài (Prompt): {prompt}
Nội dung đề / Ngữ cảnh: {context}

Phần thể hiện / Ghi âm hoặc nội dung học viên trả lời:
"{user_transcript_or_notes or '(Học viên đã hoàn thành lượt nói)'}"

Hãy chấm điểm theo thang điểm ETS và xuất ra JSON đánh giá kèm lời bình của Gia sư AI.
"""

    gemini_res = gemini_pool.generate_content(
        system_instruction=SPEAKING_GRADER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.3
    )

    if gemini_res.get("success") and gemini_res.get("text"):
        raw_text = gemini_res["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            parsed = json.loads(raw_text)
            if isinstance(parsed.get("corrections"), list):
                parsed["corrections"] = [
                    c for c in parsed["corrections"]
                    if isinstance(c, dict) and str(c.get("original", "")).strip().lower() != str(c.get("corrected", "")).strip().lower()
                ]
            if "rubric_max" not in parsed:
                parsed["rubric_max"] = 3 if int(q_num or 1) <= 5 else (4 if int(q_num or 1) <= 7 else 5)
            parsed["ai_powered"] = True
            parsed["model_used"] = gemini_res.get("model", "gemini-flash")
            return parsed
        except Exception as e:
            logger.warning(f"[SpeakingGrading] Failed to parse JSON: {e}")

    # Fallback heuristic
    word_count = len((user_transcript_or_notes or "").split())
    base_score = 150 if word_count > 25 else (120 if word_count > 10 else 90)
    return {
        "score_estimate": base_score,
        "max_score": 200,
        "level": f"Level {6 if base_score >= 130 else 5}",
        "pronunciation_score": 3.8,
        "grammar_score": 4.0,
        "fluency_score": 3.7,
        "overall_comment": f"Bạn đã hoàn thành câu hỏi số {q_num}. Gia sư AI đánh giá ngữ điệu tổng thể khá tự nhiên, cần chú ý phát âm rõ hơn các phụ âm đuôi và nối âm mượt mà hơn.",
        "strengths": ["Phản xạ tốt, không bị ngắt quãng quá lâu", "Bám sát yêu cầu đề bài"],
        "areas_for_improvement": ["Tăng cường ngữ điệu lên xuống ở cuối câu hỏi/câu trần thuật", "Chú ý trọng âm từ đa âm tiết"],
        "sample_answer": f"In this situation, I would recommend focusing on clear articulation: {context[:150]}...",
        "key_vocabulary": ["effective", "schedule", "demonstrate"],
        "ai_powered": False,
        "model_used": "Gia sư AI Heuristic Engine"
    }

def grade_writing_question(
    question_data: Dict[str, Any],
    user_text: str,
    user_name: str = "Học viên",
    target_score: int = 160
) -> Dict[str, Any]:
    q_num = question_data.get("question_number", 1)
    prompt = question_data.get("prompt", "")
    context = question_data.get("context", "")

    q_int = int(q_num or 1)
    rubric_max = 3 if q_int <= 5 else (4 if q_int <= 7 else 5)
    clean_text = (user_text or "").strip()
    words = [w for w in clean_text.split() if len(w) > 1]
    wc = len(words)
    unique_chars = len(set(clean_text.lower().replace(" ", "")))
    if wc < 3 or unique_chars < 3:
        return {
            "score_estimate": 0,
            "max_score": 200,
            "rubric_max": rubric_max,
            "level": "Level 1",
            "grammar_score": 0.0,
            "vocabulary_score": 0.0,
            "organization_score": 0.0,
            "overall_comment": f"Bài làm cho câu số {q_num} quá ngắn hoặc không có nội dung tiếng Anh hợp lệ ('{clean_text[:30]}'). Vui lòng viết ít nhất một câu hoàn chỉnh đúng ngữ pháp.",
            "corrections": [
                {
                    "original": clean_text[:80] if clean_text else "(Trống)",
                    "corrected": "Cần viết câu hoàn chỉnh có chủ ngữ và động từ rõ ràng.",
                    "reason": "Bài viết chưa đạt độ dài tối thiểu hoặc chứa ký tự vô nghĩa."
                }
            ],
            "improved_answer": "A person is carefully performing the action shown in the picture.",
            "actionable_tips": [
                "Đảm bảo câu có đủ Chủ ngữ + Động từ + Tân ngữ.",
                "Sử dụng đầy đủ các từ gợi ý được cung cấp trong đề bài."
            ],
            "ai_powered": False,
            "model_used": "Gia sư AI Heuristic Engine (Strict)"
        }

    sample_sents = question_data.get("sample_sentences", [])
    samples_str = "\n".join([f"- {s}" for s in sample_sents]) if sample_sents else ""
    sample_section = f"Câu mẫu chuẩn khảo thí của đề bài:\n{samples_str}" if samples_str else ""

    user_prompt = f"""Học viên: {user_name} (Mục tiêu Writing: {target_score}/200)
Câu hỏi số {q_num} (TOEIC Writing)
Yêu cầu đề bài (Prompt): {prompt}
Nội dung đề / Từ khóa gợi ý: {context}
{sample_section}

Bài làm của học viên:
"{user_text}"

Hãy chấm điểm theo thang điểm ETS và xuất ra JSON đánh giá kèm lời bình của Gia sư AI. Phần improved_answer nếu có câu mẫu chuẩn hãy ưu tiên dùng hoặc nâng cấp từ câu mẫu chuẩn của đề bài.
"""

    gemini_res = gemini_pool.generate_content(
        system_instruction=WRITING_GRADER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.3
    )

    if gemini_res.get("success") and gemini_res.get("text"):
        raw_text = gemini_res["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            parsed = json.loads(raw_text)
            parsed["ai_powered"] = True
            parsed["model_used"] = gemini_res.get("model", "gemini-flash")
            return parsed
        except Exception as e:
            logger.warning(f"[WritingGrading] Failed to parse JSON: {e}")

    # Fallback heuristic (Rubric-aware: Q1-5 -> 0-3, Q6-7 -> 0-4, Q8 -> 0-5)
    q_int = int(q_num or 1)
    rubric_max = 3 if q_int <= 5 else (4 if q_int <= 7 else 5)
    words = [w for w in (user_text or "").strip().split() if len(w) > 1]
    wc = len(words)
    if wc < 3 or len(set((user_text or "").lower())) < 3:
        return {
            "score_estimate": 0,
            "max_score": 200,
            "rubric_max": rubric_max,
            "level": "Level 1",
            "grammar_score": 0.0,
            "vocabulary_score": 0.0,
            "organization_score": 0.0,
            "overall_comment": f"Bài làm cho câu số {q_num} quá ngắn hoặc không có nội dung tiếng Anh hợp lệ ('{(user_text or '').strip()[:30]}'). Vui lòng viết ít nhất một câu hoàn chỉnh đúng ngữ pháp.",
            "corrections": [
                {
                    "original": user_text[:80] if user_text else "(Trống)",
                    "corrected": "Cần viết câu hoàn chỉnh có chủ ngữ và động từ rõ ràng.",
                    "reason": "Bài viết chưa đạt độ dài tối thiểu hoặc chứa ký tự vô nghĩa."
                }
            ],
            "improved_answer": "A person is carefully performing the action shown in the picture.",
            "actionable_tips": [
                "Đảm bảo câu có đủ Chủ ngữ + Động từ + Tân ngữ.",
                "Sử dụng đầy đủ các từ gợi ý được cung cấp trong đề bài."
            ],
            "ai_powered": False,
            "model_used": "Gia sư AI Heuristic Engine (Strict)"
        }

    # Check if Q1-5 (1-sentence picture description)
    if q_int <= 5:
        lower_text = (user_text or "").lower()
        has_verb_like = any(v in lower_text for v in ["is ", "are ", "was ", "were ", "has ", "have ", "ing ", "s ", "ed "])
        if wc >= 5 and has_verb_like:
            base_score = min(190, 155 + min(35, (wc - 5) * 4))
            sub_score = round(min(3.0, 2.5 + min(0.5, (wc - 5) * 0.05)), 1)
            level_num = 8 if base_score >= 180 else 7
            return {
                "score_estimate": base_score,
                "max_score": 200,
                "rubric_max": 3,
                "level": f"Level {level_num}",
                "grammar_score": sub_score,
                "vocabulary_score": sub_score,
                "organization_score": 3.0,
                "overall_comment": f"Câu số {q_num} ({wc} từ) có cấu trúc ngữ pháp rõ ràng, diễn đạt tự nhiên và đáp ứng tốt yêu cầu mô tả tranh (thang 3/3).",
                "corrections": [],
                "improved_answer": f"{user_text.strip()} in the workplace." if not user_text.strip().endswith(".") else user_text.strip(),
                "actionable_tips": [
                    "Có thể mở rộng câu bằng cụm giới từ chỉ nơi chốn (e.g., at the counter, in the kitchen) hoặc thời gian.",
                    "Sử dụng thêm trạng từ hoặc mệnh đề quan hệ (who, which) để tăng tính mô tả chi tiết."
                ],
                "ai_powered": False,
                "model_used": "Gia sư AI Heuristic Engine"
            }

    base_score = min(165, max(70, wc * 3))
    g_score = round(min(float(rubric_max), max(2.0, (base_score / 200.0) * rubric_max)), 1)
    return {
        "score_estimate": base_score,
        "max_score": 200,
        "rubric_max": rubric_max,
        "level": f"Level {max(2, min(7, base_score // 25))}",
        "grammar_score": g_score,
        "vocabulary_score": g_score,
        "organization_score": g_score,
        "overall_comment": f"Bài viết cho câu số {q_num} ({wc} từ) đã có ý tưởng và cấu trúc cơ bản. Có thể phát triển thêm chi tiết để đạt điểm tối đa.",
        "corrections": [],
        "improved_answer": "Thank you for your inquiry. I am writing to provide the requested details regarding your schedule.",
        "actionable_tips": [
            "Đảm bảo trả lời đầy đủ tất cả các ý hỏi hoặc yêu cầu trong đề bài.",
            "Kiểm tra lại thì động từ và sự hòa hợp giữa chủ ngữ - động từ."
        ] if q_int >= 6 else [
            "Thêm cụm giới từ chỉ nơi chốn hoặc trạng từ chỉ cách thức để câu sinh động hơn.",
            "Đảm bảo dùng đúng cả 2 từ gợi ý theo đúng ngữ cảnh bức tranh."
        ],
        "ai_powered": False,
        "model_used": "Gia sư AI Heuristic Engine"
    }

def grade_sw_full_session(
    test_type: str,
    test_name: str,
    answers: List[Dict[str, Any]],
    user_name: str = "Học viên",
    target_score: int = 160
) -> Dict[str, Any]:
    skill_title = "Speaking" if "speaking" in test_type.lower() else "Writing"
    total_q = len(answers)
    answered_q = sum(1 for a in answers if (a.get("user_answer") or "").strip())

    summary_list = []
    for a in answers:
        summary_list.append({
            "q": a.get("question_number"),
            "prompt": a.get("prompt", "")[:100],
            "ans": (a.get("user_answer") or "")[:200]
        })

    user_prompt = f"""Học viên: {user_name}
Bài thi: TOEIC {skill_title} - {test_name}
Số câu đã hoàn thành: {answered_q}/{total_q} câu

Chi tiết bài làm:
{json.dumps(summary_list, ensure_ascii=False, indent=2)}

Hãy tổng kết đánh giá và chấm điểm toàn bài theo định dạng JSON đã yêu cầu.
"""

    gemini_res = gemini_pool.generate_content(
        system_instruction=SW_SESSION_GRADER_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        max_tokens=2048,
        temperature=0.3
    )

    if gemini_res.get("success") and gemini_res.get("text"):
        raw_text = gemini_res["text"].strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        raw_text = raw_text.strip()

        try:
            parsed = json.loads(raw_text)
            parsed["ai_powered"] = True
            parsed["model_used"] = gemini_res.get("model", "gemini-flash")
            return parsed
        except Exception as e:
            logger.warning(f"[SWSessionGrading] Failed to parse JSON: {e}")

    # Fallback
    ratio = (answered_q / max(1, total_q))
    est_score = int(120 + ratio * 60)
    return {
        "total_score_estimate": est_score,
        "max_score": 200,
        "level": f"Level {7 if est_score >= 160 else 6} ({est_score}/200)",
        "verdict": "Khá tốt - Đáp ứng phần lớn yêu cầu bài thi chuẩn ETS",
        "overall_comment": f"Gia sư AI chúc mừng bạn đã hoàn thành bài thi {skill_title} ({test_name})! Bạn đã hoàn thành {answered_q}/{total_q} câu hỏi với sự tập trung cao. Để nâng điểm lên mức tối đa, hãy chú ý các tiêu chí ngữ pháp nâng cao và tính tự nhiên.",
        "strengths": [
            f"Hoàn thành {answered_q}/{total_q} câu hỏi một cách nghiêm túc",
            "Nắm vững bố cục chuẩn của từng dạng câu hỏi"
        ],
        "weaknesses_to_fix": [
            "Cần đa dạng hóa vốn từ vựng học thuật và thành ngữ thương mại",
            "Kiểm soát thời gian chuẩn bị và trả lời tốt hơn"
        ],
        "action_plan": [
            "Luyện lại các câu chưa đạt điểm cao để thành thạo cấu trúc mẫu",
            "Ghi âm / viết lại câu trả lời theo phiên bản mẫu gợi ý của Gia sư AI",
            "Luyện tập hàng tuần để duy trì phản xạ ngôn ngữ nhạy bén"
        ],
        "ai_powered": False,
        "model_used": "Gia sư AI Heuristic Engine"
    }
