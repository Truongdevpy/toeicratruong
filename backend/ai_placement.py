# -*- coding: utf-8 -*-
import json
import logging
from typing import Dict, Any, List, Optional
from gemini_pool import gemini_pool

logger = logging.getLogger(__name__)

DIAGNOSTIC_PROMPT_SYSTEM = """Bạn là Chuyên gia Khảo thí TOEIC ETS kiêm Giám đốc Học thuật AI cao cấp của nền tảng TOEIC Ra Trường.
Nhiệm vụ của bạn là phân tích sâu kết quả bài thi Đánh giá năng lực (Placement Test) của học viên, tìm ra căn nguyên lỗi sai (Root-cause Traps), và thiết kế một 'Hồ sơ Gia sư AI cá nhân hóa' để trợ lý AI đồng hành 1-1 hiệu quả nhất.

### NGUYÊN TẮC CHẨN ĐOÁN CỐT LÕI:
1. KHÔNG nhận xét chung chung như 'cần luyện thêm từ vựng' hay 'chú ý nghe kỹ'.
2. BẮT BUỘC chỉ đích danh bẫy kinh điển ETS mà học viên đang vướng:
   - Part 1: Bị lừa bởi hành động đang diễn ra (being + V3) với vật tĩnh, hay nhầm giới từ chỉ vị trí?
   - Part 2: Dính bẫy lặp âm (echo words), từ đồng âm khác nghĩa (same sound), hay phản xạ kém với câu trả lời gián tiếp (indirect answers)?
   - Part 3 & 4: Nghe bắt từ rời rạc nên bị dính bẫy đánh lạc hướng (distractors), hay chưa nắm được kỹ năng đọc trước câu hỏi?
   - Part 5: Hổng kiến thức gốc từ loại (word family), thì động từ (tenses), hay liên từ / giới từ?
   - Part 7: Đọc dịch từng chữ nên thiếu thời gian, hay không biết kỹ thuật Scan & Skim tìm dẫn chứng (evidence)?
3. Phân tầng chiến thuật theo khoảng cách điểm:
   - Gap < 150 điểm: Tập trung xử lý bẫy nâng cao Part 3, 4, 7 và mẹo 5 giây Part 5.
   - Gap >= 250 điểm: Củng cố ngữ pháp cốt lõi Part 5 (nguyên lý S-V-O) và phản xạ từ để hỏi Part 2 (Who/Where/When).

### ĐỊNH DẠNG ĐẦU RA (YÊU CẦU DUY NHẤT LÀ JSON CHUẨN, KHÔNG KÈM TEXT NGOÀI JSON):
{
  "diagnostic_summary": "Tóm tắt ngắn gọn 2 câu về năng lực cốt lõi và rào cản lớn nhất của học viên.",
  "band_level": "Cơ bản (350-500) / Trung cấp (500-650) / Bứt phá (650-800) / Tinh anh (800+)",
  "root_cause_weaknesses": [
    {
      "part": "Part 2",
      "weakness_title": "Bẫy lặp âm Echo words",
      "severity": "Cao",
      "evidence": "Thường chọn các phương án có chứa từ lặp lại trong câu hỏi.",
      "remedy": "Nguyên tắc 90% đáp án lặp lại âm trong Part 2 là bẫy loại trừ."
    },
    {
      "part": "Part 5",
      "weakness_title": "Từ loại đứng sau giới từ",
      "severity": "Trung bình",
      "evidence": "Nhầm lẫn giữa V-bare và Noun/V-ing sau giới từ.",
      "remedy": "Mẹo 5s: Giới từ + V-ing + Tân ngữ HOẶC Giới từ + Cụm danh từ."
    }
  ],
  "pacing_issue": "Tốc độ làm bài cần tối ưu hóa ở phần đọc",
  "ai_tutor_persona_config": {
    "teaching_tone": "Khích lệ, thực chiến, thẳng thắn chỉ bẫy, dùng ngôn ngữ dễ hiểu",
    "socratic_difficulty": "Gợi ý 2 bước trước khi đưa đáp án",
    "priority_parts": [2, 5, 7]
  },
  "ai_memory_notes": "Học viên mục tiêu {target_score} (hiện tại {estimated_score}). Thường vội vàng ở Part 2 và hổng từ loại sau giới từ ở Part 5. Khi giảng giải, luôn yêu cầu học viên chỉ ra 'dấu hiệu 5 giây' trước, không cho đáp án ngay."
}
"""

def generate_ai_placement_diagnosis(
    user_name: str,
    target_score: int,
    estimated_score: int,
    listening_score: int,
    reading_score: int,
    attempts_by_part: Dict[int, Dict[str, int]],
    incorrect_questions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Invokes Gemini API with Diagnostic & Profiler Prompt to evaluate placement test,
    generate root-cause traps, and create a custom AI Tutor memory profile.
    """
    matrix_str = ""
    part_names = {
        1: "Part 1 (Mô tả tranh)",
        2: "Part 2 (Hỏi - Đáp)",
        3: "Part 3 (Hội thoại)",
        4: "Part 4 (Bài nói)",
        5: "Part 5 (Hoàn thành câu)",
        6: "Part 6 (Điền đoạn văn)",
        7: "Part 7 (Đọc hiểu)"
    }
    for p_num in range(1, 8):
        dt = attempts_by_part.get(p_num, {"correct": 0, "total": 0})
        matrix_str += f"- {part_names[p_num]}: {dt.get('correct', 0)}/{dt.get('total', 0)} câu đúng\n"

    err_details = []
    for item in incorrect_questions[:6]:
        err_details.append({
            "part": item.get("part", 5),
            "question": item.get("text", "")[:120],
            "user_choice": item.get("selected"),
            "correct_answer": item.get("correct")
        })

    user_prompt = f"""HỌC VIÊN: {user_name}
MỤC TIÊU: {target_score} TOEIC
ĐIỂM ĐÁNH GIÁ: {estimated_score} TOEIC (Listening: {listening_score}, Reading: {reading_score})

MA TRẬN ĐÚNG/SAI THEO PART:
{matrix_str}

CHI TIẾT CÂU SAI TIÊU BIỂU:
{json.dumps(err_details, ensure_ascii=False, indent=2)}

Hãy phân tích chẩn đoán chuyên sâu và xuất ra JSON cấu hình Gia sư AI cá nhân hóa theo đúng mẫu đã định nghĩa.
"""

    gemini_res = gemini_pool.generate_content(
        system_instruction=DIAGNOSTIC_PROMPT_SYSTEM,
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
            logger.warning(f"[AIPlacement] Failed to parse Gemini JSON: {e}")

    # Fallback profiler: High-quality rule engine
    weak_traps = []
    lowest_parts = sorted(attempts_by_part.items(), key=lambda x: (x[1]["correct"] / max(1, x[1]["total"])))
    for p_num, p_data in lowest_parts[:3]:
        p_name = part_names.get(p_num, f"Part {p_num}")
        if p_num in [1, 2]:
            weak_traps.append({
                "part": p_name,
                "weakness_title": "Bẫy lặp âm Echo & Câu trả lời gián tiếp",
                "severity": "Cao",
                "evidence": f"Tỷ lệ chính xác chỉ đạt {round(p_data['correct']/max(1, p_data['total'])*100)}% ở {p_name}.",
                "remedy": "Áp dụng mẹo loại trừ 85% từ đồng âm trong Part 2 và tập trung nhận diện câu trả lời gián tiếp."
            })
        elif p_num in [3, 4]:
            weak_traps.append({
                "part": p_name,
                "weakness_title": "Bẫy Paraphrase từ đồng nghĩa & Nghe bắt từ rời rạc",
                "severity": "Cao",
                "evidence": f"Chưa kịp đọc trước 3 câu hỏi trước khi audio phát ở {p_name}.",
                "remedy": "Luyện kỹ năng Skim câu hỏi trong 8 giây nghỉ giữa các bài thoại."
            })
        elif p_num in [5, 6]:
            weak_traps.append({
                "part": p_name,
                "weakness_title": "Bẫy Từ loại (Word Form) & Thì động từ phức",
                "severity": "Trung bình",
                "evidence": f"Mất nhiều thời gian dịch nghĩa câu thay vì nhìn dấu hiệu 5 giây trước/sau chỗ trống.",
                "remedy": "Nhận diện ngay đuôi từ (-tion, -ment, -ive, -ly) và cấu trúc S-V-O cơ bản."
            })
        else:
            weak_traps.append({
                "part": p_name,
                "weakness_title": "Kỹ thuật Scan & Skim tìm dẫn chứng đoạn văn kép",
                "severity": "Cao",
                "evidence": f"Đọc dịch từng chữ dẫn đến thiếu thời gian hoàn thành các bài đọc dài.",
                "remedy": "Đọc câu hỏi trước, khoanh vùng từ khóa và tìm câu chủ đề đoạn văn."
            })

    memory_notes = (
        f"Học viên mục tiêu {target_score} TOEIC (Điểm hiện tại: {estimated_score}). "
        f"Điểm yếu lớn nhất: {weak_traps[0]['weakness_title']}. "
        f"Gia sư AI cần áp dụng phương pháp Socratic, gợi mở manh mối 5 giây trước khi giải đáp."
    )

    return {
        "diagnostic_summary": f"Trình độ hiện tại đạt {estimated_score} TOEIC (Listening: {listening_score}, Reading: {reading_score}). Mục tiêu bứt phá lên {target_score} điểm cần tập trung xử lý bẫy {weak_traps[0]['weakness_title']}.",
        "band_level": "Cơ bản (350-500)" if estimated_score < 500 else ("Trung cấp (500-650)" if estimated_score < 650 else "Bứt phá (650-800)"),
        "root_cause_weaknesses": weak_traps,
        "pacing_issue": "Cần phân bổ thời gian hợp lý hơn giữa phần nghe và đọc",
        "ai_tutor_persona_config": {
            "teaching_tone": "Khích lệ, thực chiến, chuẩn ETS",
            "socratic_difficulty": "Gợi mở 2 bước",
            "priority_parts": [p[0] for p in lowest_parts[:3]]
        },
        "ai_memory_notes": memory_notes,
        "ai_powered": False,
        "model_used": "Gia sư AI Rule Engine"
    }
