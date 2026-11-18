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


MOJIBAKE_REPLACEMENTS = {
    "Ng? ph?p & Li?n t?": "Ngữ pháp & Liên từ",
    "T? lo?i": "Từ loại",
    "??ng t?": "Động từ",
    "?i?n c?u v?o ?o?n": "Điền câu vào đoạn",
    "T? v?ng theo ng? c?nh": "Từ vựng theo ngữ cảnh",
    "T? v?ng trong b?i ??c": "Từ vựng trong bài đọc",
    "T? v?ng": "Từ vựng",
    "Gi?i t? & Li?n t?": "Giới từ & Liên từ",
    "C?u h?i chi ti?t": "Câu hỏi chi tiết",
    "C?u h?i suy lu?n & Li?n k?t ?o?n": "Câu hỏi suy luận & Liên kết đoạn",
    "? ch?nh & M?c ??ch b?i ??c": "Ý chính & Mục đích bài đọc",
    "??c bi?u ?? & Bi?u m?u": "Đọc biểu đồ & Biểu mẫu",
    "?o?n ??n": "Đoạn đơn",
    "?o?n k?p": "Đoạn kép",
    "?o?n ba": "Đoạn ba",
    "C?u h?i": "Câu hỏi",
    "C?u ": "Câu ",
    "??p ?n": "Đáp án",
    "?o?n v?n": "Đoạn văn",
}

def sanitize_mojibake(val: any) -> any:
    if not isinstance(val, str) or "?" not in val:
        return val
    for bad, good in MOJIBAKE_REPLACEMENTS.items():
        if bad in val:
            val = val.replace(bad, good)
    return val
router = APIRouter(prefix="/api/practice", tags=["practice"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
PRACTICE_DIR = WEB_READY_DIR / "practice_by_part"
MOCK_TESTS_DIR = WEB_READY_DIR / "mock_tests"
DICTATION_FILE = WEB_READY_DIR / "dictation_challenges.json"
VOCAB_FILE = WEB_READY_DIR / "vocabulary_bank.json"

_listening_fallback_pools = {}

def _get_listening_fallback_pool(part: int):
    global _listening_fallback_pools
    if part not in _listening_fallback_pools:
        import glob
        from routers.tests import is_full_tape_audio
        pool = []
        mock_files = glob.glob(str(MOCK_TESTS_DIR / "*.json"))
        for mf in mock_files:
            try:
                with open(mf, "r", encoding="utf-8") as jf:
                    d = json.load(jf)
            except Exception:
                continue
            for q in d.get("questions", []):
                if q.get("part") == part:
                    aud = q.get("local_audio") or q.get("audio_url") or q.get("audio") or ""
                    res = resolve_media_url(aud) if aud else ""
                    if res:
                        res_l = res.lower()
                        is_tape = is_full_tape_audio(res) or any(x in res_l for x in ["economy_toeic", "sample_toeic", "new_real_toeic", "eco_toeic", "t1_audio", "t2_audio", "t3_audio", "t4_audio", "t5_audio", "t6_audio", "t7_audio", "t8_audio", "t9_audio", "t10_audio", "_audio."])
                        if not is_tape:
                            img_res = resolve_media_url(q.get("local_image") or q.get("image_url") or q.get("image") or "") if part == 1 else None
                            pool.append({
                                "audio_url": res,
                                "image_url": img_res,
                                "transcript": q.get("transcript") or q.get("passage_text") or "",
                                "passage_text": q.get("passage_text") or q.get("transcript") or ""
                            })
        _listening_fallback_pools[part] = pool
    return _listening_fallback_pools.get(part, [])
GRAMMAR_FILE = WEB_READY_DIR / "grammar_curriculum.json"
_mock_test_json_cache = {}
_mock_test_lookup_cache = {}

def get_cached_mock_test(clean_tid: str):
    if clean_tid not in _mock_test_json_cache:
        mt_file = MOCK_TESTS_DIR / f"{clean_tid}.json"
        if mt_file.exists():
            try:
                mt_data = json.loads(mt_file.read_text(encoding="utf-8"))
                _mock_test_json_cache[clean_tid] = mt_data
                idx = {}
                for mq in mt_data.get("questions", []):
                    mq_id = str(mq.get("id") or "")
                    mq_num = mq.get("question_number")
                    if mq_id:
                        idx[f"id:{mq_id}"] = mq
                    if mq_num is not None:
                        idx[f"num:{mq_num}"] = mq
                _mock_test_lookup_cache[clean_tid] = idx
            except Exception:
                _mock_test_json_cache[clean_tid] = None
                _mock_test_lookup_cache[clean_tid] = {}
        else:
            _mock_test_json_cache[clean_tid] = None
            _mock_test_lookup_cache[clean_tid] = {}
    return _mock_test_json_cache[clean_tid]

def find_in_mock_test(clean_tid: str, q_id: str = None, q_num: int = None):
    get_cached_mock_test(clean_tid)
    idx = _mock_test_lookup_cache.get(clean_tid, {})
    if q_id and f"id:{q_id}" in idx:
        return idx[f"id:{q_id}"]
    if q_num is not None and f"num:{q_num}" in idx:
        return idx[f"num:{q_num}"]
    return None

_part_practice_cache = {}
_part_stats_cache = {}
_part_stats_cache = {}

def _compute_part_stats(part_number: int, data_by_level: dict):
    by_photo_type = {}
    by_question_type = {}
    by_special_type = {}
    by_topic = {}
    by_level = {}
    by_level_by_topic = {}
    by_level_by_special_type = {}
    by_level_by_photo_type = {}
    by_level_by_question_type = {}

    for lvl_name, qs in data_by_level.items():
        by_level[lvl_name] = len(qs)
        by_level_by_topic[lvl_name] = {}
        by_level_by_special_type[lvl_name] = {}
        by_level_by_photo_type[lvl_name] = {}
        by_level_by_question_type[lvl_name] = {}

        for q in qs:
            pt = q.get("photo_type")
            qt = sanitize_mojibake(q.get("question_type"))
            st = q.get("special_type")
            top = q.get("topic")
            sec = q.get("section")

            if pt:
                by_photo_type[pt] = by_photo_type.get(pt, 0) + 1
                by_level_by_photo_type[lvl_name][pt] = by_level_by_photo_type[lvl_name].get(pt, 0) + 1

            if qt:
                by_question_type[qt] = by_question_type.get(qt, 0) + 1
                by_level_by_question_type[lvl_name][qt] = by_level_by_question_type[lvl_name].get(qt, 0) + 1

            if st and st != "Tiêu chuẩn":
                by_special_type[st] = by_special_type.get(st, 0) + 1
                by_level_by_special_type[lvl_name][st] = by_level_by_special_type[lvl_name].get(st, 0) + 1

            effective_topic = top or pt or qt
            if effective_topic:
                by_topic[effective_topic] = by_topic.get(effective_topic, 0) + 1
                by_level_by_topic[lvl_name][effective_topic] = by_level_by_topic[lvl_name].get(effective_topic, 0) + 1
                if sec and part_number == 7:
                    sec_t_colon = f"{sec}:{effective_topic}"
                    sec_t_under = f"{sec}_{effective_topic}"
                    by_topic[sec_t_colon] = by_topic.get(sec_t_colon, 0) + 1
                    by_topic[sec_t_under] = by_topic.get(sec_t_under, 0) + 1
                    by_level_by_topic[lvl_name][sec_t_colon] = by_level_by_topic[lvl_name].get(sec_t_colon, 0) + 1
                    by_level_by_topic[lvl_name][sec_t_under] = by_level_by_topic[lvl_name].get(sec_t_under, 0) + 1

    return {
        "by_photo_type": by_photo_type,
        "by_question_type": by_question_type,
        "by_special_type": by_special_type,
        "by_topic": by_topic,
        "by_level": by_level,
        "by_level_by_topic": by_level_by_topic,
        "by_level_by_special_type": by_level_by_special_type,
        "by_level_by_photo_type": by_level_by_photo_type,
        "by_level_by_question_type": by_level_by_question_type,
    }

def get_cached_part_practice(part_number: int):
    if part_number not in _part_practice_cache:
        part_file = PRACTICE_DIR / f"part{part_number}_practice.json"
        if not part_file.exists():
            return None
        data = json.loads(part_file.read_text(encoding="utf-8"))
        if part_number in [1, 2, 3, 4]:
            cleaned_dbl = {}
            pool = _get_listening_fallback_pool(part_number)
            import hashlib
            for lvl, qs in data.get("data_by_level", {}).items():
                valid_qs = []
                for q in qs:
                    aud = q.get("local_audio") or q.get("audio_url") or q.get("audio") or q.get("sound") or ""
                    res_aud = resolve_media_url(aud) if aud else ""
                    if not res_aud and pool:
                        qid_str = str(q.get("id") or "")
                        idx = int(hashlib.md5(qid_str.encode("utf-8")).hexdigest(), 16) % len(pool)
                        cand = pool[idx]
                        q["audio_url"] = cand["audio_url"]
                        res_aud = cand["audio_url"]
                        if part_number == 1 and not resolve_media_url(q.get("local_image") or q.get("image_url") or q.get("image") or ""):
                            if cand.get("image_url"):
                                q["image_url"] = cand["image_url"]
                    if res_aud:
                        valid_qs.append(q)
                cleaned_dbl[lvl] = valid_qs
            data["data_by_level"] = cleaned_dbl
        _part_practice_cache[part_number] = data
        _part_stats_cache[part_number] = _compute_part_stats(part_number, data.get("data_by_level", {}))
    return _part_practice_cache[part_number]

def _is_whole_test_audio(raw_aud: str) -> bool:
    if not raw_aud:
        return True
    s = str(raw_aud).lower().strip()
    if any(x in s for x in ["economy_toeic", "sample_toeic", "new_real_toeic"]):
        return True
    bname = os.path.basename(s.split("?")[0])
    if re.match(r"^\d+(-\d+)?\.(mp3|wav|ogg|m4a)$", bname):
        return False
    if "/audio/" in s and re.search(r"\d+\.(mp3|wav|ogg|m4a)$", bname):
        return False
    return "test" in bname

def _is_placeholder_image(raw_img: str) -> bool:
    if not raw_img:
        return True
    bname = os.path.basename(str(raw_img).split("?")[0]).lower()
    return "blank" in bname or bname in ["test.png", "test.jpg", "placeholder.png", "cover.png"]


# 1. Practice by Part (Parts 1 to 7)
@router.get("/part/{part_number}")
def get_practice_by_part(
    part_number: int,
    level: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    section: Optional[str] = Query(None),
    special_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(500, ge=1, le=5000),
    user: Optional[models.User] = Depends(get_current_user_optional)
):
    if not isinstance(level, str):
        level = None
    if not isinstance(category, str):
        category = None
    if not isinstance(section, str):
        section = None
    if not isinstance(special_type, str):
        special_type = None
    if not isinstance(page, int):
        page = 1
    if not isinstance(limit, int):
        limit = 500

    data = get_cached_part_practice(part_number)
    if not data:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu cho Part {part_number}")

    data_by_level = data.get("data_by_level", {})

    stats = _part_stats_cache.get(part_number) or _compute_part_stats(part_number, data_by_level)
    by_photo_type = stats["by_photo_type"]
    by_question_type = stats["by_question_type"]
    by_special_type = stats["by_special_type"]
    by_topic = stats["by_topic"]
    by_level = stats["by_level"]
    by_level_by_topic = stats["by_level_by_topic"]
    by_level_by_special_type = stats["by_level_by_special_type"]
    by_level_by_photo_type = stats["by_level_by_photo_type"]
    by_level_by_question_type = stats["by_level_by_question_type"]

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

    import unicodedata

    # Filter by section if specified (normalizing English & Vietnamese section names)
    if section and section != "all":
        sec_raw = unicodedata.normalize('NFC', section).strip().lower()
        sec_norm = {
            "đoạn đơn": "single", "doan don": "single", "single": "single",
            "đoạn kép": "double", "doan kep": "double", "double": "double",
            "đoạn ba": "triple", "doan ba": "triple", "triple": "triple"
        }.get(sec_raw, sec_raw)
        all_qs = [
            q for q in all_qs
            if unicodedata.normalize('NFC', str(q.get("section") or "")).strip().lower() == sec_norm
        ]

    # Filter by special_type if specified
    if special_type and special_type != "all":
        st_norm = unicodedata.normalize('NFC', special_type).strip().lower()
        all_qs = [
            q for q in all_qs
            if unicodedata.normalize('NFC', str(q.get("special_type") or "")).strip().lower() == st_norm
        ]

    # Filter by category/topic/question_type/photo_type if specified
    if category and category != "all":
        c_norm = unicodedata.normalize('NFC', category).strip().lower()
        req_sec = None
        req_cat = c_norm
        if ":" in c_norm:
            parts = c_norm.split(":", 1)
            req_sec = parts[0].strip()
            req_cat = parts[1].strip()
        elif c_norm.startswith(("single_", "double_", "triple_")):
            parts = c_norm.split("_", 1)
            req_sec = parts[0].strip()
            req_cat = parts[1].strip()

        exact_filtered = []
        for q in all_qs:
            q_top = unicodedata.normalize('NFC', str(q.get("topic") or "")).strip().lower()
            q_pt = unicodedata.normalize('NFC', str(q.get("photo_type") or "")).strip().lower()
            q_qt = unicodedata.normalize('NFC', str(q.get("question_type") or "")).strip().lower()
            q_st = unicodedata.normalize('NFC', str(q.get("special_type") or "")).strip().lower()
            q_sec = unicodedata.normalize('NFC', str(q.get("section") or "")).strip().lower()

            if req_sec and q_sec and q_sec != req_sec:
                continue

            if req_cat in [q_top, q_pt, q_qt, q_st]:
                exact_filtered.append(q)

        if exact_filtered:
            all_qs = exact_filtered
        else:
            sub_filtered = []
            for q in all_qs:
                q_top = unicodedata.normalize('NFC', str(q.get("topic") or "")).strip().lower()
                q_pt = unicodedata.normalize('NFC', str(q.get("photo_type") or "")).strip().lower()
                q_qt = unicodedata.normalize('NFC', str(q.get("question_type") or "")).strip().lower()
                q_st = unicodedata.normalize('NFC', str(q.get("special_type") or "")).strip().lower()
                q_sec = unicodedata.normalize('NFC', str(q.get("section") or "")).strip().lower()

                if req_sec and q_sec and q_sec != req_sec:
                    continue

                if (req_cat in q_top or req_cat in q_qt or req_cat in q_st or req_cat in q_pt):
                    sub_filtered.append(q)
            if sub_filtered:
                all_qs = sub_filtered

    start = (page - 1) * limit
    is_adv = level and any(k in str(level) for k in ["Level 3", "Level 4", "3", "4"])
    is_student = hasattr(user, 'role') and user.role == "student" and not getattr(user, "is_vip", False)
    if is_adv and is_student:
        limit = min(limit, 5)
    paged = all_qs[start:start + limit]
    if part_number in [3, 4, 6, 7] and paged and start + limit < len(all_qs):
        last_pid = paged[-1].get('passage_id')
        if last_pid:
            for extra_q in all_qs[start + limit:]:
                if extra_q.get('passage_id') == last_pid:
                    paged.append(extra_q)
                else:
                    break

    formatted = []
    for idx, q in enumerate(paged):
        opts = q.get("options") or {}
        if not opts or not any(opts.values()):
            opts = {
                "A": q.get("option_a", "") or "",
                "B": q.get("option_b", "") or "",
                "C": q.get("option_c", "") or "",
            }
            if part_number != 2:
                opts["D"] = q.get("option_d", "") or ""

        vocab_parsed = []
        raw_vocab = q.get("vocabulary") or q.get("tu_vung") or q.get("key_vocab")
        if raw_vocab:
            if isinstance(raw_vocab, str):
                try:
                    pv = json.loads(raw_vocab)
                    vocab_parsed = pv.get("vocabulary", [])
                except Exception:
                    pass
            elif isinstance(raw_vocab, dict):
                vocab_parsed = raw_vocab.get("vocabulary", [])
            elif isinstance(raw_vocab, list):
                vocab_parsed = raw_vocab

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
        raw_expl = q.get("explanation") or q.get("explanation_vi") or ""
        evidence_text = q.get("evidence") or ""
        evidence_vi_text = q.get("evidence_vi") or ""
        if isinstance(raw_expl, dict):
            parts = []
            if raw_expl.get("correctReason"):
                parts.append(raw_expl["correctReason"])
            if raw_expl.get("evidenceVi"):
                parts.append(f"Dẫn chứng: {raw_expl['evidenceVi']}")
            traps = raw_expl.get("traps")
            if isinstance(traps, dict) and traps:
                trap_str = "\n".join([f"• Bẫy ({k}): {v}" for k, v in traps.items()])
                parts.append(f"Phân tích bẫy:\n{trap_str}")
            explanation_text = "\n\n".join(parts) if parts else ""
            if not evidence_text and raw_expl.get("evidence"):
                evidence_text = raw_expl.get("evidence")
            if not evidence_vi_text and raw_expl.get("evidenceVi"):
                evidence_vi_text = raw_expl.get("evidenceVi")
        else:
            explanation_text = str(raw_expl or "")

        translation_text = q.get("vietnamese_translation") or ""
        if not explanation_text:
            explanation_text = f"Đáp án đúng là ({ans})." + (f"\n{translation_text}" if translation_text else "")

        test_id = q.get("test_id")
        q_num = q.get("question_number")
        q_id = q.get("id")

        raw_img = q.get("local_image") or q.get("image_url") or q.get("image") or ""
        if part_number in [5, 6, 7]:
            raw_aud = ""
        else:
            raw_aud = q.get("audio_url") or q.get("local_audio") or q.get("audio") or q.get("sound") or ""
            # If resolved or already set from fallback pool, keep it
            from routers.tests import is_full_tape_audio
            res_aud = resolve_media_url(raw_aud) if raw_aud else ""
            if not res_aud or is_full_tape_audio(res_aud):
                pool = _get_listening_fallback_pool(part_number)
                if pool:
                    import hashlib
                    qid_str = str(q.get("id") or "")
                    idx = int(hashlib.md5(qid_str.encode("utf-8")).hexdigest(), 16) % len(pool)
                    cand = pool[idx]
                    raw_aud = cand["audio_url"]
                    q["audio_url"] = raw_aud
                    if part_number == 1:
                        if not raw_img or _is_placeholder_image(raw_img):
                            raw_img = cand.get("image_url") or raw_img
                            q["image_url"] = raw_img
        if not raw_img and test_id and q_num and part_number == 1:
            for ext in ["png", "jpg", "jpeg", "webp"]:
                cand_disk_img = DATA_DIR / "media" / "tooich" / str(test_id) / f"part{part_number}" / "images" / f"{q_num}.{ext}"
                if cand_disk_img.exists():
                    raw_img = f"/media/tooich/{test_id}/part{part_number}/images/{q_num}.{ext}"
                    break

        if _is_placeholder_image(raw_img) and part_number == 1:
            clean_tid = re.sub(r"[^a-zA-Z0-9_\-]", "", str(test_id or "").removesuffix(".json"))
            if clean_tid:
                for mt_cand in [clean_tid, f"tooich_{clean_tid}"]:
                    mq = find_in_mock_test(mt_cand, q_id=q_id, q_num=q_num)
                    if mq:
                        cand_img = mq.get("local_image") or mq.get("image_url") or mq.get("image")
                        if cand_img and not _is_placeholder_image(cand_img):
                            raw_img = cand_img
                            break

        raw_direction = q.get("direction") or ""
        if not raw_direction:
            raw_dir_audio = q.get("direction_audio") or ""
            if raw_dir_audio:
                raw_direction = f"Nghe hướng dẫn câu hỏi Part {part_number}"
        if not raw_direction:
            if part_number == 1:
                raw_direction = "Nghe 4 đáp án và chọn đáp án miêu tả đúng nhất bức tranh."
            elif part_number == 2:
                raw_direction = "Nghe câu hỏi và 3 câu trả lời, chọn câu trả lời phù hợp nhất."
            elif part_number in [3, 4]:
                raw_direction = "Nghe đoạn hội thoại/độc thoại và trả lời 3 câu hỏi."
            elif part_number == 5:
                raw_direction = "Chọn từ/cụm từ đúng nhất để hoàn thành câu."
            elif part_number == 6:
                raw_direction = "Chọn từ/câu thích hợp nhất để điền vào chỗ trống trong đoạn văn."
            elif part_number == 7:
                raw_direction = "Đọc đoạn văn và chọn đáp án đúng nhất cho từng câu hỏi."

        assigned_q_num = start + idx + 1
        orig_qtext = q.get("question_text") or ""
        if part_number in [6, 7]:
            if not orig_qtext or orig_qtext.strip().isdigit() or "Đoạn văn" in orig_qtext or orig_qtext == f"Câu {q.get('question_number', 1)}" or orig_qtext.startswith("Câu "):
                q_text_display = f"Chọn từ/câu thích hợp điền vào vị trí [{assigned_q_num}]:"
            else:
                q_text_display = orig_qtext
        else:
            q_text_display = q.get("question_text") or (f"Câu {q.get('question_number', 1)}" if part_number in [1, 2] else f"Câu hỏi Part {part_number}")

        options_dict = {"A": opts.get("A", "") or "", "B": opts.get("B", "") or "", "C": opts.get("C", "") or ""}
        if opts.get("D") and part_number != 2:
            options_dict["D"] = opts.get("D", "") or ""
        cleaned_q_text, cleaned_options = clean_question_and_options(part_number, q_text_display, options_dict, assigned_q_num)

        chosen_type = sanitize_mojibake(q.get("question_type") or q.get("topic") or q.get("photo_type") or q.get("special_type") or f"Part {part_number}")
        if part_number == 1 and q.get("photo_type"):
            chosen_type = q.get("photo_type")
        elif part_number == 5 and q.get("topic"):
            chosen_type = q.get("topic")
        elif part_number in [6, 7] and q.get("topic"):
            chosen_type = q.get("topic")

        raw_pass_text = q.get("passage_text") or ""
        if isinstance(raw_pass_text, str):
            raw_pass_text = raw_pass_text.replace(r"\r\n", chr(10)).replace(r"\n", chr(10)).replace(r"\r", "").replace(r"\t", "    ")

        q_item = {
            "id": str(q.get("id")),
            "passage_id": str(q.get("passage_id") or ""),

            "part": part_number,
            "direction": raw_direction,
            "question_number": assigned_q_num,
            "level": q.get("level"),
            "photo_type": q.get("photo_type") or "",
            "question_type": sanitize_mojibake(chosen_type),
            "topic": sanitize_mojibake(q.get("topic") or ""),
            "section": q.get("section") or "",
            "special_type": q.get("special_type") or "",
            "question_text": cleaned_q_text,
            "passage_text": raw_pass_text,
            "options": cleaned_options,
            "option_a": cleaned_options.get("A", ""),
            "option_b": cleaned_options.get("B", ""),
            "option_c": cleaned_options.get("C", ""),
            "option_d": cleaned_options.get("D", ""),
            "correct_answer": ans,
            "audio_url": resolve_media_url(raw_aud) or resolve_media_url(q.get("audio_url")),
            "image_url": resolve_media_url(q.get("image_url")) or resolve_media_url(raw_img),
            "vietnamese_translation": translation_text,
            "option_translations": q.get("option_translations") or {},
            "transcript": (
                q.get("transcript")
                or (
                    f"{cleaned_q_text}\n(A) {cleaned_options.get('A', '')}\n(B) {cleaned_options.get('B', '')}" + (f"\n(C) {cleaned_options.get('C', '')}" if cleaned_options.get('C') else "")
                    if part_number == 2 and cleaned_q_text and not cleaned_q_text.startswith("Câu ")
                    else translation_text
                )
            ),
            "explanation": explanation_text,
            "explanation_vi": explanation_text,
            "evidence": evidence_text or q.get("evidence") or "",
            "evidence_vi": evidence_vi_text or q.get("evidence_vi") or "",
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
            pid = item.get("passage_id") or item.get("audio_url") or f"passage_{len(passages) + 1}"
            if pid not in passage_map:
                p_obj = {
                    "id": pid,
                    "passage_id": pid,
                    "part": part_number,
                    "audio_url": item.get("audio_url"),
                    "image_url": item.get("image_url"),
                    "transcript": item.get("transcript") or item.get("passage_text") or "",
                    "passage_text": item.get("passage_text") or item.get("transcript") or "",
                    "questions": []
                }
                passage_map[pid] = p_obj
                passages.append(p_obj)
            passage_map[pid]["questions"].append(item)
            if not passage_map[pid].get("image_url") and item.get("image_url"):
                passage_map[pid]["image_url"] = item.get("image_url")
            if not passage_map[pid].get("audio_url") and item.get("audio_url"):
                passage_map[pid]["audio_url"] = item.get("audio_url")

    elif part_number in [6, 7]:
        passage_map = {}
        for item in formatted:
            pid = item.get("passage_id") or item.get("passage_text") or f"passage_{len(passages) + 1}"
            if pid not in passage_map:
                p_obj = {
                    "id": pid,
                    "passage_id": pid,
                    "part": part_number,
                    "direction": item.get("direction") or "",
                    "image_url": item.get("image_url"),
                    "passage_text": item.get("passage_text") or "Đoạn văn đọc hiểu TOEIC",
                    "questions": []
                }
                passage_map[pid] = p_obj
                passages.append(p_obj)
            passage_map[pid]["questions"].append(item)
            if not passage_map[pid].get("direction") and item.get("direction"):
                passage_map[pid]["direction"] = item.get("direction")
            if not passage_map[pid].get("image_url") and item.get("image_url"):
                passage_map[pid]["image_url"] = item.get("image_url")
            if (not passage_map[pid].get("passage_text") or passage_map[pid].get("passage_text") == "Đoạn văn đọc hiểu TOEIC") and item.get("passage_text"):
                passage_map[pid]["passage_text"] = item.get("passage_text")

    return {
        "part": part_number,
        "title": data.get("title", f"Part {part_number} Practice"),
        "total": len(all_qs),
        "page": page,
        "limit": limit,
        "by_level": by_level,
        "by_photo_type": by_photo_type,
        "by_question_type": by_question_type,
        "by_special_type": by_special_type,
        "by_topic": by_topic,
        "by_level_by_topic": by_level_by_topic,
        "by_level_by_special_type": by_level_by_special_type,
        "by_level_by_photo_type": by_level_by_photo_type,
        "by_level_by_question_type": by_level_by_question_type,
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

PROPER_NAMES = {
    "ozawa", "john", "mary", "smith", "david", "tokyo", "japan",
    "london", "paris", "vietnam", "america", "michael", "robert",
    "james", "william", "thomas", "brown", "jones", "miller", "davis",
    "wilson", "moore", "taylor", "anderson"
}

def is_valid_flashcard_data(word: str, ipa: str = "", meaning: str = "") -> tuple[bool, str]:
    w = (word or "").strip()
    i = (ipa or "").strip()
    m = (meaning or "").strip()
    if not w:
        return False, "Từ vựng rỗng"
    if w.lower() in PROPER_NAMES:
        return False, f"Tên riêng: {w}"
    if w.startswith("[") or "toeic key concept" in w.lower() or "luyện tập đã làm sai" in m.lower():
        return False, f"Thẻ ghi chú bài học/câu hỏi: {w}"
    if w.lower() in ["nghe", "doc", "viet", "noi"]:
        return False, f"Từ tiếng Việt/rác: {w}"
    if not i or i == "None" or i == "/" or i == "//":
        return False, "Thiếu phiên âm IPA"
    if "pronunciation" in i.lower():
        return False, f"Phiên âm placeholder: {i}"
    return True, "Hợp lệ"

def classify_card_part(source_context: str = "", topic: str = "", word: str = "") -> str:
    ctx = f"{source_context} {word}".lower()
    for p_num in range(1, 8):
        if f"part {p_num}" in ctx or f"part{p_num}" in ctx or f"part_{p_num}" in ctx:
            return f"part{p_num}"
    if "dictation" in ctx or "chép chính tả" in ctx or "chep chinh ta" in ctx:
        return "dictation"
    return "saved"

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
                    word = (item.get("word") or "").strip()
                    ipa = (item.get("ipa") or "").strip()
                    meanings = []
                    m_raw = item.get("meanings") or item.get("meanings_json")
                    if m_raw:
                        if isinstance(m_raw, str):
                            try:
                                meanings = json.loads(m_raw)
                            except Exception:
                                pass
                        elif isinstance(m_raw, list):
                            meanings = m_raw
                    m0 = meanings[0] if meanings and isinstance(meanings[0], dict) else {}
                    meaning = m0.get("meaning") or m0.get("meaning_vi") or "Nghĩa từ vựng TOEIC"

                    # Filter invalid / proper names / missing IPA / placeholder
                    is_valid, _ = is_valid_flashcard_data(word, ipa, meaning)
                    if not is_valid:
                        continue

                    w_topic = classify_card_topic(
                        word,
                        str(m_raw),
                        item.get("set_name", ""),
                        item.get("test_name", "")
                    )
                    t_info = TOPIC_CONFIG.get(w_topic, {"name": "Giao tiếp & Đời sống", "icon": "🌐"})
                    processed.append({
                        "word_id": item["id"],
                        "word": word,
                        "ipa": ipa,
                        "meaning": meaning,
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
                        "from_db": False,
                        "is_new": True,
                        "is_due": False,
                        "is_learning": False,
                        "is_mastered": False,
                        "is_learned": False
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
    part: str = Query("all"),
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
            w = (f.word or "").strip()
            ipa = (f.ipa or "").strip()
            meaning = (f.meaning or "").strip()
            is_valid, _ = is_valid_flashcard_data(w, ipa, meaning)
            if not is_valid:
                continue

            c_topic = classify_card_topic(
                w,
                meaning,
                getattr(f, "source_context", "") or "",
                ""
            )
            t_info = TOPIC_CONFIG.get(c_topic, {"name": "Giao tiếp & Đời sống", "icon": "🌐"})

            reps = f.repetitions or 0
            last_rev = getattr(f, "last_reviewed_at", None)
            next_rev = getattr(f, "next_review_at", None)
            stage = f.srs_stage or 1
            interval = f.interval_days or 1

            is_learned = reps > 0 or last_rev is not None

            if is_learned:
                is_new = False
                is_due = (next_rev is not None and next_rev <= now)
                is_mastered = (stage >= 4 or interval >= 7)
                is_learning = not is_mastered
            else:
                is_new = True
                is_due = False  # Thẻ chưa học không tính là đến hạn ôn
                is_learning = False
                is_mastered = False

            user_cards.append({
                "id": f.id,
                "word_id": f.word_id,
                "word": w,
                "ipa": ipa,
                "meaning": meaning,
                "part_of_speech": f.part_of_speech or "",
                "example": f.example or "",
                "example_vi": getattr(f, "example_vi", "") or "",
                "source_context": getattr(f, "source_context", "") or "Kho từ vựng TOEIC",
                "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S") if getattr(f, "created_at", None) else "",
                "audio_url": resolve_media_url(f.audio_url),
                "srs_stage": stage,
                "interval_days": interval,
                "repetitions": reps,
                "is_favorite": f.is_favorite or False,
                "topic": c_topic,
                "topic_name": t_info["name"],
                "topic_icon": t_info["icon"],
                "from_db": True,
                "is_new": is_new,
                "is_learned": is_learned,
                "is_due": is_due,
                "is_learning": is_learning,
                "is_mastered": is_mastered,
                "next_review_at": next_rev.isoformat() if next_rev else None
            })
    except Exception as e:
        print("Error fetching user flashcards:", e)

    # Set of existing words to avoid duplication
    existing_words = {c["word"].strip().lower() for c in user_cards}

    # Fetch user weak areas from profile if available
    user_weak_topics = set()
    try:
        if user and getattr(user, 'profile', None) and user.profile.weak_areas:
            import json
            raw_wa = json.loads(user.profile.weak_areas) if isinstance(user.profile.weak_areas, str) else user.profile.weak_areas
            for wa in (raw_wa if isinstance(raw_wa, list) else [raw_wa]):
                wa_str = str(wa).lower()
                for top_key in TOPIC_CONFIG.keys():
                    if top_key in wa_str:
                        user_weak_topics.add(top_key)
    except Exception:
        pass

    # 2. Seed cards from vocabulary bank
    bank_words = []
    if filter_type not in ["learned", "saved", "due", "learning", "mastered"]:
        all_bank = get_cached_bank_words()
        if topic and topic != "all":
            matched_bank = [b for b in all_bank if b["topic"] == topic and b["word"].strip().lower() not in existing_words]
        else:
            matched_bank = [b for b in all_bank if b["word"].strip().lower() not in existing_words]

        # Prioritize words from user's weak topics to the front of matched_bank
        if user_weak_topics:
            matched_bank = sorted(matched_bank, key=lambda b: 0 if b.get("topic") in user_weak_topics else 1)

        for idx, bw in enumerate(matched_bank[:35]):
            b_copy = dict(bw)
            b_copy["id"] = 100000 + idx
            b_copy["is_new"] = True
            b_copy["is_due"] = False  # Thẻ chưa học KHÔNG tính là đến hạn ôn!
            b_copy["is_learning"] = False
            b_copy["is_mastered"] = False
            b_copy["next_review_at"] = None
            b_copy["is_weak_area"] = bool(b_copy.get("topic") in user_weak_topics)
            b_copy["is_learned"] = False
            b_copy["repetitions"] = 0
            b_copy["srs_stage"] = 1
            b_copy["interval_days"] = 1
            bank_words.append(b_copy)

    # 3. Combine pool of cards
    all_pool = user_cards + bank_words

    if part and part != "all":
        all_pool = [c for c in all_pool if c.get("part") == part]
        user_cards = [c for c in user_cards if c.get("part") == part]

    # 4. Filter by topic
    if topic and topic != "all":
        pool_by_topic = [c for c in all_pool if c.get("topic") == topic]
    else:
        pool_by_topic = all_pool

    # 5. Filter by filter_type
    if filter_type == "new":
        deck = [c for c in pool_by_topic if c.get("is_new")]
    elif filter_type == "due":
        deck = [c for c in pool_by_topic if c.get("is_due")]
    elif filter_type == "learning":
        deck = [c for c in pool_by_topic if c.get("is_learning")]
    elif filter_type == "mastered":
        deck = [c for c in pool_by_topic if c.get("is_mastered")]
    elif filter_type in ["learned", "saved"]:
        deck = [c for c in pool_by_topic if c.get("is_learned")]
    else:  # "all"
        deck = pool_by_topic

    # Consistent Metrics across tabs & stat cards
    total_cards = len(pool_by_topic)
    new_cards = sum(1 for c in pool_by_topic if c.get("is_new"))
    cards_due_today = sum(1 for c in pool_by_topic if c.get("is_due"))
    learning_cards = sum(1 for c in pool_by_topic if c.get("is_learning"))
    mastered_cards = sum(1 for c in pool_by_topic if c.get("is_mastered"))
    learned_cards = sum(1 for c in pool_by_topic if c.get("is_learned"))

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
        "total_cards": total_cards,
        "new_cards": new_cards,
        "cards_due_today": cards_due_today,
        "due_cards": cards_due_today,
        "learning_cards": learning_cards,
        "mastered_cards": mastered_cards,
        "learned_cards": learned_cards,
        "total_learned": learned_cards,
        "deck": deck,
        "flashcards": deck,
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
    # 4 SRS levels: Quên [1] (1d), Khó [2] (2d), Đã thuộc [3] (3d), Dễ [4] (7d)
    interval_map = {"again": 1, "hard": 2, "good": 3, "easy": 7}
    new_interval = interval_map.get(rating, 1)

    target_user_id = user.id if user else 1
    word_id = str(payload.get("word_id") or "")
    word = (payload.get("word") or "").strip()
    ipa = payload.get("ipa", "").strip()
    meaning = payload.get("meaning", "").strip()
    if not ipa:
        bank = get_cached_bank_words()
        for bw in bank:
            if bw.get("word", "").strip().lower() == word.lower():
                ipa = bw.get("ipa", "")
                if not meaning:
                    meaning = bw.get("meaning", "")
                break


    is_valid, err_msg = is_valid_flashcard_data(word, ipa, meaning)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg or "Dữ liệu flashcard không hợp lệ")

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
        stage = 1 if rating == "again" else (2 if rating == "hard" else (3 if rating == "good" else 4))
        card = models.UserFlashcard(
            user_id=target_user_id,
            word_id=word_id or f"fc_{word.lower()}",
            word=word,
            ipa=payload.get("ipa", ""),
            meaning=payload.get("meaning", ""),
            part_of_speech=payload.get("part_of_speech", ""),
            example=payload.get("example", ""),
            source_context=payload.get("topic_name") or payload.get("source_context", "Bộ từ vựng TOEIC"),
            audio_url=payload.get("audio_url", ""),
            srs_stage=stage,
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
        elif rating == "hard":
            card.srs_stage = max(1, card.srs_stage or 1)
        elif rating == "good":
            card.srs_stage = min(5, (card.srs_stage or 1) + 1)
        elif rating == "easy":
            card.srs_stage = min(5, (card.srs_stage or 1) + 2)

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
    ipa = payload.get("ipa", "").strip()
    meaning = payload.get("meaning", "").strip()

    # If ipa is missing on add, try to lookup from vocabulary bank
    if not ipa:
        bank = get_cached_bank_words()
        for bw in bank:
            if bw.get("word", "").strip().lower() == word.lower():
                ipa = bw.get("ipa", "")
                if not meaning:
                    meaning = bw.get("meaning", "")
                break


    is_valid, err_msg = is_valid_flashcard_data(word, ipa, meaning)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg or "Dữ liệu flashcard không hợp lệ")

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
        ipa=ipa,
        meaning=meaning,
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




@router.post("/explain-question")
def explain_question_with_ai(
    payload: dict,
    user: models.User = Depends(get_current_user_optional)
):
    part = payload.get("part", 5)
    q_num = payload.get("question_number", 1)
    q_text = payload.get("question_text", "")
    options = payload.get("options", {})
    correct_opt = payload.get("correct_answer", "A")
    user_opt = payload.get("selected_option", "")
    passage_text = payload.get("passage_text", "")
    transcript = payload.get("transcript", "")

    from gemini_pool import gemini_pool
    ctx = f"Ngữ cảnh: {passage_text or transcript}\n" if (passage_text or transcript) else ""
    prompt = f"""Bạn là Chuyên gia khảo thí TOEIC và Giảng viên luyện thi ETS hàng đầu. Hãy phân tích cực kỳ chi tiết, sâu sắc câu hỏi TOEIC sau đây cho học viên:

CÂU HỎI TOEIC (Part {part} - Câu {q_num}):
{ctx}Câu hỏi: {q_text}
Các phương án lựa chọn:
- A: {options.get('A', '')}
- B: {options.get('B', '')}
- C: {options.get('C', '')}
- D: {options.get('D', '')}

Đáp án đúng: {correct_opt}
Học viên đã chọn: {user_opt or 'Chưa chọn'}

YÊU CẦU GIẢI THÍCH CHI TIẾT (Định dạng markdown chuyên sâu, sư phạm):
1. DỊCH NGHĨA CÂU & TỪ KHÓA TRỌNG TÂM: Dịch nghĩa hoàn chỉnh câu văn sang tiếng Việt và giải thích các từ vựng cốt lõi.
2. VÌ SAO ĐÁP ÁN {correct_opt} ĐÚNG?: Phân tích cấu trúc ngữ pháp, vai trò của từ trong câu, ngữ cảnh logic hoặc dẫn chứng cụ thể trong bài.
3. PHÂN TÍCH TỪNG ĐÁP ÁN SAI (VÌ SAO SAI & BẪY ETS GÌ?):
   - Phân tích cặn kẽ từng đáp án còn lại trong số A, B, C, D vì sao lại sai (sai từ loại, sai thì, thiếu chủ ngữ, bẫy lặp từ, nghĩa không hợp lý...).
4. MẸO 5 GIÂY ETS & QUY TẮC NHẬN DIỆN NHANH: Chỉ ra quy tắc và dấu hiệu nhận biết nhanh nhất để không bao giờ bị lừa ở các câu tương tự.
"""

    # Extract structured breakdown if available in question data
    db_traps = ""
    if isinstance(payload.get("explanation"), dict):
        exp_dict = payload.get("explanation")
        if exp_dict.get("traps"):
            trap_items = [f"- {k}: {v}" for k, v in exp_dict["traps"].items()]
            db_traps = "\nPhân tích bẫy trong ngân hàng ETS:\n" + "\n".join(trap_items)

    res = gemini_pool.generate_content(
        system_instruction="Bạn là Chuyên gia luyện thi TOEIC số 1 ETS, giải thích chi tiết đáp án đúng và vì sao từng đáp án sai.",
        user_prompt=prompt,
        max_tokens=1500,
        temperature=0.4
    )

    if res.get("success") and res.get("text"):
        return {"success": True, "explanation": res.get("text"), "model": res.get("model_used")}
    else:
        # High quality fallback incorporating question explanation
        base_exp = payload.get("raw_explanation") or payload.get("explanation") or ""
        formatted_base = ""
        if isinstance(base_exp, dict):
            parts = []
            if base_exp.get("correctReason"):
                parts.append(f"**Lý do đáp án {correct_opt} đúng:**\n{base_exp['correctReason']}")
            if base_exp.get("evidence"):
                ev_vi = f" ({base_exp.get('evidenceVi')})" if base_exp.get('evidenceVi') else ""
                parts.append(f"**Dẫn chứng trong bài:**\n{base_exp['evidence']}{ev_vi}")
            if base_exp.get("traps") and isinstance(base_exp["traps"], dict):
                trap_lines = [f"- **Phương án {opt}**: {desc}" for opt, desc in base_exp["traps"].items()]
                parts.append(f"**Phân tích bẫy ETS và vì sao các đáp án khác sai:**\n" + "\n".join(trap_lines))
            formatted_base = "\n\n".join(parts)
        elif isinstance(base_exp, str) and base_exp.strip():
            formatted_base = base_exp.strip()

        if not formatted_base:
            formatted_base = f"**Vì sao đáp án {correct_opt} đúng:**\nPhương án {correct_opt} hoàn toàn phù hợp về mặt cấu trúc ngữ pháp và logic ngữ cảnh của câu.\n\n**Vì sao các đáp án khác sai:**\nCác lựa chọn còn lại sai về từ loại, thì động từ hoặc gây nhiễu về nghĩa trong bài thi TOEIC."

        explanation_text = f"### 💡 Giải thích chi tiết câu {q_num} (Chuẩn ETS)\n\n{formatted_base}\n\n**⚡ Mẹo 5 giây ETS:**\nQuan sát từ đứng ngay trước và sau chỗ trống để loại ngay các phương án sai từ loại mà không cần dịch toàn bài!"

        return {
            "success": True,
            "explanation": explanation_text,
            "fallback": True
        }

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

# touched to reload cache

# reload trigger 12345


@router.post("/flashcards/sync")
def sync_flashcards(
    payload: dict,
    user: models.User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    target_user_id = user.id if user else 1
    items = payload.get("items", [])
    if not items or not isinstance(items, list):
        return {"status": "ok", "synced": 0}

    from sqlalchemy import func
    synced = 0
    for it in items:
        w = (it.get("word") or "").strip()
        if not w:
            continue
        exists = db.query(models.UserFlashcard).filter(
            models.UserFlashcard.user_id == target_user_id,
            func.lower(models.UserFlashcard.word) == w.lower()
        ).first()
        if not exists:
            part_val = it.get("part")
            source_ctx = it.get("context") or ""
            if part_val:
                source_ctx = f"Part {part_val} · {source_ctx}".strip()
            if not source_ctx:
                source_ctx = "Giỏ từ TOEIC đã lưu"
            fc = models.UserFlashcard(
                user_id=target_user_id,
                word_id=it.get("word_id") or f"sync_{w.lower()}",
                word=w,
                ipa=it.get("ipa", ""),
                meaning=it.get("meaning", ""),
                part_of_speech=it.get("part_of_speech", ""),
                example=it.get("example") or it.get("context") or "",
                source_context=source_ctx,
                srs_stage=1,
                interval_days=1,
                repetitions=0
            )
            db.add(fc)
            synced += 1
    if synced > 0:
        db.commit()
    return {"status": "success", "synced": synced}
