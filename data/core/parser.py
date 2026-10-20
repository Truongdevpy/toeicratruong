"""
Question parsing, normalization, raw data persistence, and HTML test viewer generation.
"""
import html
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import RAW_DIR, JSON_DIR
from core.utils import sanitize_filename, logger


def normalize_question_data(
    site: str,
    test_id: str,
    collection: str,
    part: int,
    question_number: int,
    question_type: str = "",
    instruction: str = "",
    passage_text: str = "",
    question_text: str = "",
    options: Optional[Dict[str, str]] = None,
    answer: Optional[str] = None,
    explanation: Optional[str] = None,
    image_url: Optional[str] = None,
    audio_url: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Normalize question into target schema."""
    opts = options or {"A": "", "B": "", "C": "", "D": ""}
    clean_opts = {}
    for k, v in opts.items():
        if k:
            clean_opts[str(k).strip().upper()] = str(v).strip()

    return {
        "id": f"{site}_{test_id}_{question_number}",
        "site": site,
        "test_id": str(test_id),
        "collection": collection,
        "part": int(part) if part else 1,
        "question_number": int(question_number),
        "question_type": question_type or "",
        "instruction": instruction or "",
        "passage_text": passage_text or "",
        "question": question_text or "",
        "question_text": question_text or "",
        "options": clean_opts,
        "option_a": clean_opts.get("A", ""),
        "option_b": clean_opts.get("B", ""),
        "option_c": clean_opts.get("C", ""),
        "option_d": clean_opts.get("D", ""),
        "answer": answer.strip().upper() if answer else None,
        "correct_answer": answer.strip().upper() if answer else None,
        "explanation": explanation or None,
        "image": image_url or "",
        "image_url": image_url or "",
        "audio": audio_url or "",
        "audio_url": audio_url or "",
        "extra": extra or {}
    }


def save_raw_data(site: str, test_id: str, raw_content: str, extension: str = "json") -> Path:
    """Save unformatted raw response into data/raw/."""
    site_raw = RAW_DIR / site
    site_raw.mkdir(parents=True, exist_ok=True)
    filename = f"{sanitize_filename(str(test_id))}_raw.{extension.lstrip('.')}"
    filepath = site_raw / filename
    if isinstance(raw_content, bytes):
        filepath.write_bytes(raw_content)
    else:
        filepath.write_text(str(raw_content), encoding="utf-8", errors="replace")
    return filepath


def save_json_export(site: str, test_id: str, data: Any) -> Path:
    """Export formatted JSON data into data/json/."""
    site_json = JSON_DIR / site
    site_json.mkdir(parents=True, exist_ok=True)
    filename = f"{sanitize_filename(str(test_id))}.json"
    filepath = site_json / filename
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return filepath


def generate_test_html(test_info: Dict[str, Any], questions: List[Dict[str, Any]], relative_media_map: Optional[Dict[str, str]] = None) -> str:
    """Generate a standalone offline HTML test page with media players and questions."""
    media_map = relative_media_map or {}
    title = html.escape(test_info.get("name", "TOEIC Test"))
    collection = html.escape(test_info.get("collection", ""))

    parts_map: Dict[int, List[Dict[str, Any]]] = {}
    for q in sorted(questions, key=lambda x: (x.get("part", 1), x.get("question_number", 0))):
        p_num = q.get("part", 1)
        parts_map.setdefault(p_num, []).append(q)

    html_parts = []
    for part_num in sorted(parts_map.keys()):
        p_questions = parts_map[part_num]
        part_content = [f'<div class="part-section" id="part-{part_num}">']
        part_content.append(f'<h2>Part {part_num}</h2>')

        for q in p_questions:
            q_num = q.get("question_number", 0)
            q_text = html.escape(q.get("question_text") or q.get("question") or "")
            p_text = html.escape(q.get("passage_text") or "")
            orig_audio = q.get("audio_url") or q.get("audio") or ""
            orig_image = q.get("image_url") or q.get("image") or ""
            local_audio = media_map.get(orig_audio, orig_audio)
            local_image = media_map.get(orig_image, orig_image)

            part_content.append(f'<div class="question-card" id="q-{q_num}">')
            part_content.append(f'<div class="q-header"><strong>Question {q_num}</strong></div>')

            if p_text:
                part_content.append(f'<div class="passage-box"><pre>{p_text}</pre></div>')

            if local_image:
                part_content.append(f'<div class="q-media"><img src="{local_image}" alt="Question {q_num}" style="max-width:100%; border-radius:6px; margin: 8px 0;" /></div>')

            if local_audio:
                part_content.append(f'<div class="q-audio"><audio controls preload="none" src="{local_audio}" style="width:100%; margin: 8px 0;"></audio></div>')

            if q_text:
                part_content.append(f'<div class="q-text">{q_text}</div>')

            options = q.get("options", {})
            if options:
                part_content.append('<div class="options-group">')
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_val := options.get(opt_key):
                        opt_text = html.escape(str(opt_val))
                        is_correct = (q.get("answer") or q.get("correct_answer")) == opt_key
                        corr_attr = 'data-correct="true"' if is_correct else ""
                        part_content.append(f'<div class="option-item" {corr_attr}><strong>({opt_key})</strong> {opt_text}</div>')
                part_content.append('</div>')

            answer = q.get("answer") or q.get("correct_answer")
            expl = q.get("explanation")
            if answer or expl:
                part_content.append('<details class="explanation-box"><summary>Answers & Explanations</summary>')
                if answer:
                    part_content.append(f'<p><strong>Correct Answer:</strong> {answer}</p>')
                if expl:
                    part_content.append(f'<p>{html.escape(str(expl))}</p>')
                part_content.append('</details>')

            part_content.append('</div>')
        part_content.append('</div>')
        html_parts.append('\n'.join(part_content))

    body_content = '\n'.join(html_parts)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} - TOEIC</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }}
  .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
  h1 {{ font-size: 26px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; }}
  .meta {{ color: #64748b; font-size: 14px; margin-bottom: 24px; }}
  .part-section {{ margin-top: 32px; border-top: 2px dashed #cbd5e1; padding-top: 20px; }}
  .part-section h2 {{ font-size: 20px; color: #2563eb; }}
  .question-card {{ background: #f1f5f9; padding: 18px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; }}
  .q-header {{ font-size: 15px; margin-bottom: 8px; color: #334155; }}
  .passage-box {{ background: #fff; padding: 14px; border-radius: 6px; border: 1px solid #cbd5e1; margin-bottom: 12px; font-family: inherit; font-size: 14px; white-space: pre-wrap; }}
  .passage-box pre {{ margin: 0; font-family: inherit; white-space: pre-wrap; }}
  .q-text {{ font-size: 15px; font-weight: 500; margin-bottom: 10px; }}
  .options-group {{ margin-top: 8px; }}
  .option-item {{ background: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 6px; border: 1px solid #e2e8f0; font-size: 14px; }}
  .explanation-box {{ margin-top: 12px; background: #e0f2fe; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #0369a1; cursor: pointer; }}
  .explanation-box summary {{ font-weight: 600; }}
</style>
</head>
<body>
<div class="container">
  <h1>{title}</h1>
  <div class="meta">Collection: <strong>{collection}</strong> | Total Questions: {len(questions)}</div>
  {body_content}
</div>
</body>
</html>
"""