import math
from fastapi import APIRouter, HTTPException, Query
import json
import re
import difflib
from pathlib import Path
from media_resolver import resolve_media_url, _file_exists_on_disk
import os
import hashlib

router = APIRouter(prefix="/api/dictation", tags=["dictation"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
WEB_READY_DIR = DATA_DIR / "web_ready"
SETS_FILE = WEB_READY_DIR / "listening_dictation_sets.json"
CHALLENGES_FILE = WEB_READY_DIR / "dictation_challenges.json"
VOCAB_FILE = WEB_READY_DIR / "vocabulary_bank.json"

_sets_cache = None
_challenges_cache = None
_vocab_cache = None

def get_sets():
    global _sets_cache
    if _sets_cache is None:
        if SETS_FILE.exists():
            try:
                _sets_cache = json.loads(SETS_FILE.read_text(encoding="utf-8"))
            except Exception:
                _sets_cache = []
        else:
            _sets_cache = []
    return _sets_cache

TRIM_DIR = DATA_DIR / "dautoeic" / "dictation_trimmed"

def get_trimmed_audio_for_q(t_idx: int, part: int, q_num: int) -> str:
    p_dir = TRIM_DIR / f"Test_{t_idx}" / "audio" / f"part_{part}"
    if p_dir.exists():
        try:
            prefix = f"{int(q_num):03d}_audio_"
            for f in p_dir.iterdir():
                if f.name.startswith(prefix):
                    return f"/dautoeic_media/dictation_trimmed/Test_{t_idx}/audio/part_{part}/{f.name}"
        except Exception:
            pass
    return ""

def get_trimmed_audio_for_pas(t_idx: int, part: int, order) -> str:
    p_dir = TRIM_DIR / f"Test_{t_idx}" / "audio" / f"part_{part}"
    if p_dir.exists():
        try:
            prefix = f"{int(order):03d}_audio_"
            for f in p_dir.iterdir():
                if f.name.startswith(prefix):
                    return f"/dautoeic_media/dictation_trimmed/Test_{t_idx}/audio/part_{part}/{f.name}"
        except Exception:
            pass
        # Fallback to order index order in directory
        wavs = sorted([f for f in p_dir.iterdir() if f.name.endswith(".wav") or f.name.endswith(".mp3")])
        try:
            idx = int(order) - 1
            if 0 <= idx < len(wavs):
                return f"/dautoeic_media/dictation_trimmed/Test_{t_idx}/audio/part_{part}/{wavs[idx].name}"
        except Exception:
            pass
    return ""

def get_dictation_trimmed_audio(audio_url: str, part: int) -> str:
    """
    Returns the path to trimmed audio specifically for Dictation Practice (intro instructions removed).
    If a trimmed version exists on disk, returns it; otherwise on-demand creates it or falls back to original.
    Other sections (e.g. Listening test, full tests) never call this and retain full original intros.
    """
    if not audio_url:
        return ""
    if "/Crack_TOEIC_Vol_2/" in audio_url:
        trimmed_url = audio_url.replace("/Crack_TOEIC_Vol_2/", "/dictation_trimmed/")
        if _file_exists_on_disk(trimmed_url):
            return trimmed_url
        try:
            rel = audio_url[len("/dautoeic_media/"):].replace("/", "\\")
            src_path = (DATA_DIR / "dautoeic" / rel)
            t_rel = trimmed_url[len("/dautoeic_media/"):].replace("/", "\\")
            out_path = (DATA_DIR / "dautoeic" / t_rel)
            if src_path.exists():
                out_path.parent.mkdir(parents=True, exist_ok=True)
                import subprocess
                cut = 6.0 if part == 1 else 1.65 if part == 2 else 5.3 if part == 3 else 5.8
                subprocess.run(["ffmpeg", "-y", "-ss", str(cut), "-i", str(src_path), "-c", "copy", str(out_path)], capture_output=True, timeout=5)
                if out_path.exists() and out_path.stat().st_size > 1000:
                    return trimmed_url
        except Exception:
            pass
    return audio_url

_verified_audio_pools = None

def _build_verified_audio_pools():
    global _verified_audio_pools
    if _verified_audio_pools is not None:
        return _verified_audio_pools

    pools = {1: [], 2: [], 3: [], 4: []}
    vol2_dir = DATA_DIR / "dautoeic" / "Crack_TOEIC_Vol_2"
    if vol2_dir.exists():
        for t in sorted(os.listdir(vol2_dir)):
            p = vol2_dir / t
            if not p.is_dir():
                continue
            q_file = p / "questions.json"
            if q_file.exists():
                try:
                    qs = json.loads(q_file.read_text(encoding="utf-8"))
                    for q in qs:
                        part = q.get("part")
                        if part in [1, 2]:
                            raw_aud = q.get("local_audio") or q.get("audio") or q.get("audio_url")
                            resolved = resolve_media_url(raw_aud) if raw_aud else ""
                            if resolved and "listening-audio" not in resolved and _file_exists_on_disk(resolved):
                                trimmed = get_dictation_trimmed_audio(resolved, part)
                                pools[part].append(trimmed if _file_exists_on_disk(trimmed) else resolved)
                except Exception:
                    pass

            pass_file = p / "passages.json"
            if pass_file.exists():
                try:
                    passages = json.loads(pass_file.read_text(encoding="utf-8"))
                    for pas in passages:
                        part_str = str(pas.get("part") or "")
                        if part_str in ["3", "4"]:
                            p_num = int(part_str)
                            raw_aud = pas.get("local_audio") or pas.get("audio") or pas.get("audio_url")
                            resolved = resolve_media_url(raw_aud) if raw_aud else ""
                            if resolved and "listening-audio" not in resolved and _file_exists_on_disk(resolved):
                                trimmed = get_dictation_trimmed_audio(resolved, p_num)
                                pools[p_num].append(trimmed if _file_exists_on_disk(trimmed) else resolved)
                except Exception:
                    pass

    # Safety fallbacks
    audio_dir = DATA_DIR / "dautoeic" / "media_files" / "audio"
    if audio_dir.exists():
        local_files = [
            f"/dautoeic_media/media_files/audio/{f}"
            for f in os.listdir(audio_dir)
            if f.endswith(".mp3") or f.endswith(".wav")
        ]
        for p in [1, 2, 3, 4]:
            if not pools[p] and local_files:
                pools[p] = local_files

    _verified_audio_pools = pools
    return pools

def _build_pristine_challenges():
    items = []
    vol2_dir = DATA_DIR / "dautoeic" / "Crack_TOEIC_Vol_2"
    if not vol2_dir.exists():
        return items

    for t_idx in range(1, 11):
        t_name = f"Test_{t_idx}"
        t_path = vol2_dir / t_name
        if not t_path.exists():
            continue

        q_file = t_path / "questions.json"
        if q_file.exists():
            try:
                qs = json.loads(q_file.read_text(encoding="utf-8"))
                for q in qs:
                    part = q.get("part")
                    q_num = q.get("question_number")
                    resolved = get_trimmed_audio_for_q(t_idx, part, q_num)
                    if not resolved:
                        raw_aud = q.get("local_audio") or q.get("audio") or q.get("audio_url")
                        resolved = resolve_media_url(raw_aud) if raw_aud else ""
                        if not resolved or not _file_exists_on_disk(resolved):
                            continue
                        resolved = get_dictation_trimmed_audio(resolved, part)

                    opts = q.get("options") or {}
                    extra = q.get("extra") or {}
                    dich = extra.get("dich_nghia") or ""

                    if part == 1:
                        raw_img = q.get("image_url") or q.get("image") or q.get("local_image")
                        resolved_img = resolve_media_url(raw_img) if raw_img else ""
                        lines = [
                            f"(A) {opts.get('A', '')}",
                            f"(B) {opts.get('B', '')}",
                            f"(C) {opts.get('C', '')}",
                            f"(D) {opts.get('D', '')}"
                        ]
                        full_sent = "\n".join(lines)
                        items.append({
                            "id": f"vol2_t{t_idx}_p1_q{q_num}",
                            "image_url": resolved_img,
                            "options": opts,
                            "correct_answer": q.get("correct_answer") or q.get("answer") or "A",
                            "set_id": f"vol2_t{t_idx}",
                            "part": 1,
                            "title": f"Luyện nghe Part 1 - Câu {q_num}",
                            "audio_url": resolved,
                            "full_sentence": full_sent,
                            "lines": lines,
                            "vietnamese_translation": dich or f"Mô tả hình ảnh câu {q_num} Test {t_idx}",
                            "difficulty": "Easy" if (q_num or 1) <= 3 else "Medium",
                            "segments": lines,
                            "phonetic_tips": generate_phonetic_tips(full_sent),
                            "key_vocab": extract_key_vocab(full_sent)
                        })
                    elif part == 2:
                        q_text = (q.get("question_text") or q.get("question") or "").strip()
                        lines = [
                            f"Câu hỏi: {q_text}",
                            f"(A) {opts.get('A', '')}",
                            f"(B) {opts.get('B', '')}",
                            f"(C) {opts.get('C', '')}"
                        ]
                        full_sent = "\n".join(lines)
                        diff = "Easy" if (q_num or 1) <= 15 else "Hard" if (q_num or 1) >= 26 else "Medium"
                        items.append({
                            "id": f"vol2_t{t_idx}_p2_q{q_num}",
                            "question_text": q_text,
                            "options": opts,
                            "correct_answer": q.get("correct_answer") or q.get("answer") or "A",
                            "set_id": f"vol2_t{t_idx}",
                            "part": 2,
                            "title": f"Luyện nghe Part 2 - Câu {q_num}",
                            "audio_url": resolved,
                            "full_sentence": full_sent,
                            "lines": lines,
                            "vietnamese_translation": dich or f"Hỏi đáp câu {q_num} Test {t_idx}",
                            "difficulty": diff,
                            "segments": lines,
                            "phonetic_tips": generate_phonetic_tips(full_sent),
                            "key_vocab": extract_key_vocab(full_sent)
                        })
            except Exception:
                pass

        pass_file = t_path / "passages.json"
        if pass_file.exists():
            try:
                passages = json.loads(pass_file.read_text(encoding="utf-8"))
                for pas in passages:
                    part_str = str(pas.get("part") or "")
                    if part_str in ["3", "4"]:
                        p_num = int(part_str)
                        resolved = get_trimmed_audio_for_pas(t_idx, p_num, pas.get("order_index") or pas.get("title") or "1")
                        if not resolved:
                            raw_aud = pas.get("local_audio") or pas.get("audio") or pas.get("audio_url")
                            resolved = resolve_media_url(raw_aud) if raw_aud else ""
                            if not resolved or not _file_exists_on_disk(resolved):
                                continue
                            resolved = get_dictation_trimmed_audio(resolved, p_num)

                        raw_text = pas.get("passage_text") or pas.get("transcript") or ""
                        clean = re.sub(r"<[^>]+>", "\n", raw_text)
                        lines = [l.strip() for l in clean.split("\n") if l.strip()]
                        if not lines:
                            continue

                        raw_vi = pas.get("passage_text_2") or ""
                        clean_vi = re.sub(r"<[^>]+>", "\n", raw_vi)
                        vi_lines = [l.strip() for l in clean_vi.split("\n") if l.strip()]
                        vi_text = "\n".join(vi_lines)

                        order = pas.get("order_index") or pas.get("title") or "1"
                        full_sent = "\n".join(lines)
                        items.append({
                            "id": f"vol2_t{t_idx}_p{p_num}_pas{order}",
                            "set_id": f"vol2_t{t_idx}",
                            "part": p_num,
                            "title": f"Luyện nghe Part {p_num} - Đoạn {order}",
                            "audio_url": resolved,
                            "full_sentence": full_sent,
                            "lines": lines,
                            "vietnamese_translation": vi_text or f"Dịch nghĩa đoạn Part {p_num} Test {t_idx}",
                            "difficulty": "Medium" if p_num == 3 else "Hard",
                            "segments": lines,
                            "phonetic_tips": generate_phonetic_tips(full_sent),
                            "key_vocab": extract_key_vocab(full_sent)
                        })
            except Exception:
                pass

    return items

def get_challenges():
    global _challenges_cache
    if _challenges_cache is None:
        pristine = _build_pristine_challenges()
        audio_pools = _build_verified_audio_pools()

        legacy_normalized = []
        if CHALLENGES_FILE.exists():
            try:
                raw_data = json.loads(CHALLENGES_FILE.read_text(encoding="utf-8"))
                raw_list = raw_data.get("challenges", []) if isinstance(raw_data, dict) else (raw_data if isinstance(raw_data, list) else [])
                for c in raw_list:
                    sent = c.get("full_sentence") or c.get("transcript") or ""
                    vi = c.get("vietnamese_translation") or c.get("translation_vi") or ""
                    lines = c.get("lines") or [l.strip() for l in sent.split("\n") if l.strip()]

                    raw_p = str(c.get("part", "1")).lower().replace("part", "").strip()
                    p_num = int(raw_p) if raw_p.isdigit() else 1

                    diff_raw = c.get("difficulty")
                    diff_label = "Easy" if diff_raw in [1, "1", "easy", "Easy"] else "Hard" if diff_raw in [3, "3", "hard", "Hard"] else "Medium"

                    aud = resolve_media_url(c.get("audio_url"))
                    if not aud or "listening-audio" in aud or not _file_exists_on_disk(aud):
                        pool = audio_pools.get(p_num) or audio_pools.get(1, [])
                        if pool:
                            cid = str(c.get("id") or "")
                            h = int(hashlib.md5(cid.encode("utf-8")).hexdigest(), 16)
                            aud = pool[h % len(pool)]
                    else:
                        aud = get_dictation_trimmed_audio(aud, p_num)

                    legacy_normalized.append({
                        "id": c["id"],
                        "set_id": c.get("set_id"),
                        "part": p_num,
                        "title": c.get("title") or f"Luyện nghe Part {p_num}",
                        "audio_url": aud,
                        "full_sentence": sent,
                        "lines": lines,
                        "blanks_sentence": c.get("blanks_sentence"),
                        "keywords": c.get("keywords") or [],
                        "vietnamese_translation": vi,
                        "difficulty": diff_label,
                        "segments": c.get("segments") or lines or extract_segments(sent),
                        "phonetic_tips": c.get("phonetic_tips") or generate_phonetic_tips(sent),
                        "key_vocab": c.get("key_vocab") or extract_key_vocab(sent)
                    })
            except Exception as err:
                print("Error normalizing legacy dictation challenges:", err)

        _challenges_cache = pristine + legacy_normalized
    return _challenges_cache

def get_vocab_dict():
    global _vocab_cache
    if _vocab_cache is None:
        _vocab_cache = {}
        if VOCAB_FILE.exists():
            try:
                raw_list = json.loads(VOCAB_FILE.read_text(encoding="utf-8"))
                for item in raw_list:
                    w = (item.get("word") or "").lower().strip()
                    if w and w not in _vocab_cache:
                        meanings = item.get("meanings_json") or []
                        m_text = ""
                        pos = ""
                        if isinstance(meanings, list) and meanings and isinstance(meanings[0], dict):
                            m_text = meanings[0].get("meaning", "")
                            pos = meanings[0].get("part_of_speech", "")
                        _vocab_cache[w] = {
                            "word": item.get("word"),
                            "ipa": item.get("ipa", ""),
                            "meaning": m_text,
                            "part_of_speech": pos
                        }
            except Exception:
                _vocab_cache = {}
    return _vocab_cache

def extract_segments(sentence: str):
    if not sentence:
        return []
    # If text has multiple lines, segments are the individual lines
    if "\n" in sentence:
        lines = [l.strip() for l in sentence.split("\n") if l.strip()]
        if len(lines) > 1:
            return lines

    parts = [p.strip() for p in re.split(r"[,;]+", sentence) if p.strip()]
    if len(parts) <= 1:
        words = sentence.split()
        if len(words) >= 6:
            mid = len(words) // 2
            return [" ".join(words[:mid]), " ".join(words[mid:])]
        return [sentence]
    return parts

def extract_key_vocab(sentence: str):
    if not sentence:
        return []
    vocab_map = get_vocab_dict()
    words = re.findall(r"[a-zA-Z]+", sentence.lower())
    found = []
    seen = set()
    stopwords = {"a", "an", "the", "in", "on", "at", "to", "for", "is", "are", "was", "were", "be", "been", "has", "have", "had", "he", "she", "it", "they", "we", "you", "i", "his", "her", "their", "our", "my", "your", "and", "but", "or", "so", "if", "not"}

    for w in words:
        if w in stopwords or len(w) < 3 or w in seen:
            continue
        item = vocab_map.get(w)
        if not item and w.endswith("ing") and len(w) > 5:
            item = vocab_map.get(w[:-3]) or vocab_map.get(w[:-4])
        if not item and w.endswith("ed") and len(w) > 4:
            item = vocab_map.get(w[:-2]) or vocab_map.get(w[:-1])
        if not item and w.endswith("s") and len(w) > 4:
            item = vocab_map.get(w[:-1])

        if item:
            seen.add(w)
            found.append({
                "word": item["word"],
                "ipa": item["ipa"],
                "meaning": item["meaning"] or "Từ vựng trọng tâm",
                "part_of_speech": item["part_of_speech"] or "n/v/adj"
            })
        elif len(w) >= 5 and w not in seen:
            seen.add(w)
            found.append({
                "word": w.capitalize(),
                "ipa": "",
                "meaning": "Từ khóa trong bài",
                "part_of_speech": "vocab"
            })

    return found[:6]

def generate_phonetic_tips(sentence: str):
    insights = []
    words = sentence.split()
    for i in range(len(words) - 1):
        w1 = re.sub(r"[^\w]", "", words[i].lower())
        w2 = re.sub(r"[^\w]", "", words[i+1].lower())
        if w1 and w2 and len(w1) > 1 and len(w2) > 1:
            if w1[-1] in "bcdfgklmnprstvz" and w2[0] in "aeiou":
                insights.append(f"Nối âm (Linking): '{w1} + {w2}' đọc lướt nối phụ âm sang nguyên âm.")
                break

    lower = sentence.lower()
    if "climb" in lower:
        insights.append("Âm câm: 'b' trong 'climbing' là âm câm, phát âm /'klaɪ.mɪŋ/.")
    if "behind" in lower:
        insights.append("Giảm âm tiền tố: 'be-' phát âm lướt nhẹ /bɪ/, trọng âm chính rơi vào /haɪnd/.")
    if "counter" in lower or "water" in lower:
        insights.append("Biến âm Flap-T: Âm /t/ giữa 2 nguyên âm thường phát âm lướt nhẹ thành âm vỗ kiểu Mỹ.")
    if "has been" in lower or "have been" in lower:
        insights.append("Dạng giảm âm (Weak form): 'been' thường phát âm nhanh thành /bɪn/.")

    if not insights:
        insights.append("Chú ý phát âm rõ âm đuôi (ending sounds: /s/, /z/, /t/, /d/) và giữ nhịp điệu tự nhiên.")

    return insights

def clean_tok(t: str) -> str:
    if not t:
        return ""
    s = t.replace("’", "'").replace("‘", "'").replace("`", "'").replace("´", "'")
    s = re.sub(r"^[\s\"'.,!?;:()\[\]{}]+|[\s\"'.,!?;:()\[\]{}]+$", "", s.lower().strip())
    return re.sub(r"[^\w']", "", s)

def comp_tok(t: str) -> str:
    return clean_tok(t).replace("'", "")

def diff_token_sequence(t_tokens, u_tokens):
    t_comp = [comp_tok(t) for t in t_tokens]
    u_comp = [comp_tok(u) for u in u_tokens]

    matcher = difflib.SequenceMatcher(None, t_comp, u_comp)
    diff = []
    correct_count = 0
    wrong_count = 0
    missing_count = 0
    extra_count = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for idx in range(i1, i2):
                diff.append({
                    "status": "correct",
                    "word": u_tokens[j1 + (idx - i1)],
                    "target": t_tokens[idx]
                })
                correct_count += 1
        elif tag == "replace":
            t_sub = t_tokens[i1:i2]
            u_sub = u_tokens[j1:j2]
            max_len = max(len(t_sub), len(u_sub))
            for idx in range(max_len):
                t_w = t_sub[idx] if idx < len(t_sub) else ""
                u_w = u_sub[idx] if idx < len(u_sub) else ""
                if t_w and u_w:
                    diff.append({
                        "status": "wrong",
                        "word": u_w,
                        "target": t_w
                    })
                    wrong_count += 1
                elif u_w and not t_w:
                    diff.append({
                        "status": "extra",
                        "word": u_w,
                        "target": ""
                    })
                    extra_count += 1
                elif not u_w and t_w:
                    diff.append({
                        "status": "missing",
                        "word": t_w,
                        "target": t_w
                    })
                    missing_count += 1
        elif tag == "delete":
            for idx in range(i1, i2):
                diff.append({
                    "status": "missing",
                    "word": t_tokens[idx],
                    "target": t_tokens[idx]
                })
                missing_count += 1
        elif tag == "insert":
            for jdx in range(j1, j2):
                diff.append({
                    "status": "extra",
                    "word": u_tokens[jdx],
                    "target": ""
                })
                extra_count += 1

    return diff, correct_count, wrong_count, missing_count, extra_count

def compute_alignment_diff(target_text: str, user_text: str):
    t_lines = [l.strip() for l in target_text.split("\n") if l.strip()]
    u_lines = [l.strip() for l in user_text.split("\n") if l.strip()]

    # If target has multiple lines (e.g. Part 1 with 4 options, Part 2 Q + 3 options, Part 3/4)
    if len(t_lines) > 1:
        line_diffs = []
        total_correct = 0
        total_wrong = 0
        total_missing = 0
        total_extra = 0
        total_target_words = 0
        flattened_diff = []

        # If user typed multiple lines or single line
        if len(u_lines) > 1 or (len(u_lines) == 1 and len(u_lines[0].split()) <= max(8, len(t_lines[0].split()) * 2)):
            for idx, t_line in enumerate(t_lines):
                u_line = u_lines[idx] if idx < len(u_lines) else ""

                m_prefix = re.match(r"^(\([A-D]\)|[A-D]\.|Question:|Q:|M:|W:)\s*", t_line, flags=re.I)
                adjusted_u_line = u_line
                label = f"Dòng {idx + 1}"
                if m_prefix:
                    prefix_str = m_prefix.group(1).strip()
                    p_up = prefix_str.upper()
                    if p_up in ["(A)", "A."]:
                        label = "Phương án (A)"
                    elif p_up in ["(B)", "B."]:
                        label = "Phương án (B)"
                    elif p_up in ["(C)", "C."]:
                        label = "Phương án (C)"
                    elif p_up in ["(D)", "D."]:
                        label = "Phương án (D)"
                    elif p_up in ["QUESTION:", "Q:"]:
                        label = "Câu hỏi"
                    elif p_up == "M:":
                        label = "Người nam (M)"
                    elif p_up == "W:":
                        label = "Người nữ (W)"

                    if u_line and not re.match(rf"^{re.escape(prefix_str)}", u_line, flags=re.I):
                        adjusted_u_line = f"{prefix_str} {u_line}".strip()
                elif idx == 0 and any(re.match(r"^\([A-D]\)", l) for l in t_lines[1:]):
                    label = "Câu hỏi"

                l_diff, l_corr, l_wr, l_mis, l_ext = diff_token_sequence(t_line.split(), adjusted_u_line.split())
                total_correct += l_corr
                total_wrong += l_wr
                total_missing += l_mis
                total_extra += l_ext
                total_target_words += len(t_line.split())
                flattened_diff.extend(l_diff)

                line_acc = round((l_corr / max(1, len(t_line.split()))) * 100, 1)
                line_diffs.append({
                    "line_number": idx + 1,
                    "label": label,
                    "target_line": t_line,
                    "user_line": u_line,
                    "diff": l_diff,
                    "accuracy_pct": line_acc
                })

            if len(u_lines) > len(t_lines):
                for idx in range(len(t_lines), len(u_lines)):
                    extra_words = u_lines[idx].split()
                    extra_diff = [{"status": "extra", "word": w, "target": ""} for w in extra_words]
                    total_extra += len(extra_words)
                    flattened_diff.extend(extra_diff)
                    line_diffs.append({
                        "line_number": idx + 1,
                        "label": f"Dòng thừa {idx + 1}",
                        "target_line": "",
                        "user_line": u_lines[idx],
                        "diff": extra_diff,
                        "accuracy_pct": 0.0
                    })
        else:
            # User typed into 1 single paragraph
            flattened_diff, total_correct, total_wrong, total_missing, total_extra = diff_token_sequence(
                target_text.split(), user_text.split()
            )
            total_target_words = len(target_text.split())
            line_diffs = []
            curr_pos = 0
            for idx, t_line in enumerate(t_lines):
                t_words_count = len(t_line.split())
                l_diff = flattened_diff[curr_pos : curr_pos + t_words_count]
                curr_pos += t_words_count
                l_corr = sum(1 for d in l_diff if d.get("status") == "correct")
                line_acc = round((l_corr / max(1, t_words_count)) * 100, 1)
                line_diffs.append({
                    "line_number": idx + 1,
                    "label": f"Dòng {idx + 1}",
                    "target_line": t_line,
                    "user_line": "",
                    "diff": l_diff,
                    "accuracy_pct": line_acc
                })

        accuracy = round((total_correct / max(1, total_target_words)) * 100, 1)
    else:
        # Single line target
        flattened_diff, total_correct, total_wrong, total_missing, total_extra = diff_token_sequence(
            target_text.split(), user_text.split()
        )
        total_target_words = len(target_text.split())
        accuracy = round((total_correct / max(1, total_target_words)) * 100, 1)
        line_diffs = [{
            "line_number": 1,
            "label": "Toàn bộ câu",
            "target_line": target_text,
            "user_line": user_text,
            "diff": flattened_diff,
            "accuracy_pct": accuracy
        }]

    if accuracy >= 95.0:
        feedback = "Tuyệt đỉnh! Bạn nghe và gõ chính xác gần như trọn vẹn từng từ."
    elif accuracy >= 80.0:
        feedback = "Rất tốt! Bạn nắm bắt hầu hết các câu/đáp án, chỉ thiếu sót một vài chi tiết nhỏ."
    elif accuracy >= 50.0:
        feedback = "Khá tốt! Bạn đã nghe được nhiều từ khóa chính. Hãy nghe lại để hoàn thiện các câu."
    else:
        feedback = "Hãy bấm nghe lại (Phím Tab) và tập trung vào từng cụm từ để hoàn thiện bài nghe."

    return {
        "is_correct": accuracy >= 90.0,
        "accuracy": accuracy,
        "accuracy_pct": accuracy,
        "stats": {
            "correct_words": total_correct,
            "wrong_words": total_wrong,
            "missing_words": total_missing,
            "extra_words": total_extra,
            "total_target_words": total_target_words
        },
        "target_text": target_text,
        "diff": flattened_diff,
        "line_diffs": line_diffs,
        "feedback": feedback
    }

@router.get("/sets")
def list_dictation_sets(
    part: str = Query(None),
    collection: str = Query(None),
    limit: int = Query(50, ge=1, le=100),
    page: int = Query(1, ge=1)
):
    sets = get_sets()
    filtered = sets
    if part and part != "all" and not hasattr(part, "default"):
        p_clean = str(part).lower().replace("part ", "part")
        filtered = [s for s in filtered if s.get("toeic_part") == p_clean]

    if collection and collection != "all" and not hasattr(collection, "default"):
        c_clean = str(collection).lower()
        filtered = [s for s in filtered if c_clean in s.get("collection_name", "").lower()]

    page_num = page if isinstance(page, int) else getattr(page, "default", 1) or 1
    limit_num = limit if isinstance(limit, int) else getattr(limit, "default", 20) or 20
    start = (page_num - 1) * limit_num
    paged = filtered[start:start + limit_num]

    return {
        "total": len(filtered),
        "page": page_num,
        "limit": limit_num,
        "sets": [
            {
                "id": s["id"],
                "name": s.get("name", "Bộ nghe TOEIC"),
                "part": s.get("toeic_part", "part1"),
                "collection": s.get("collection_name", "ETS 2026"),
                "chapter": s.get("chapter_name", "Test 1"),
                "folder_path": s.get("folder_path")
            }
            for s in paged
        ]
    }

@router.get("/sets/{set_id}")
def get_dictation_set_items(set_id: str):
    challenges = get_challenges()
    matched = [c for c in challenges if c.get("set_id") == set_id or set_id in c.get("set_id", "")]
    if not matched:
        matched = challenges[:10]

    result = []
    for c in matched:
        sent = c.get("full_sentence") or ""
        vi = c.get("vietnamese_translation") or ""
        lines = c.get("lines") or [l.strip() for l in sent.split("\n") if l.strip()]
        result.append({
            "id": c["id"],
            "set_id": c.get("set_id"),
            "part": c.get("part", 1),
            "title": c.get("title") or "Luyện nghe chép chính tả",
            "audio_url": resolve_media_url(c.get("audio_url")),
            "full_sentence": sent,
            "lines": lines,
            "blanks_sentence": c.get("blanks_sentence"),
            "keywords": c.get("keywords") or [],
            "vietnamese_translation": vi,
            "difficulty": c.get("difficulty") or "Medium",
            "segments": c.get("segments") or lines or extract_segments(sent),
            "phonetic_tips": c.get("phonetic_tips") or generate_phonetic_tips(sent),
            "key_vocab": c.get("key_vocab") or extract_key_vocab(sent)
        })

    return {
        "set_id": set_id,
        "total_items": len(result),
        "items": result
    }

@router.get("/challenges/{challenge_id}")
def get_single_challenge(challenge_id: str):
    challenges = get_challenges()
    target = next((c for c in challenges if c["id"] == challenge_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy bài nghe {challenge_id}")
    return target

@router.get("/challenges")
def list_challenges(
    part: int = Query(None),
    difficulty: str = Query(None),
    challenge_id: str = Query(None),
    limit: int = Query(100, ge=1, le=500),
    page: int = Query(1, ge=1)
):
    challenges = get_challenges()
    filtered = challenges

    if challenge_id:
        target = next((c for c in challenges if c["id"] == challenge_id), None)
        if target:
            other = [c for c in filtered if c["id"] != challenge_id]
            filtered = [target] + other

    if part is not None and not hasattr(part, "default") and str(part).lower() != "all":
        try:
            p_val = int(part)
            filtered = [c for c in filtered if c.get("part") == p_val]
        except (ValueError, TypeError):
            pass

    if difficulty and difficulty != "all" and not hasattr(difficulty, "default"):
        filtered = [c for c in filtered if str(c.get("difficulty", "")).lower() == str(difficulty).lower()]

    page_num = page if isinstance(page, int) else getattr(page, "default", 1) or 1
    limit_num = limit if isinstance(limit, int) else getattr(limit, "default", 100) or 100
    start = (page_num - 1) * limit_num
    paged = filtered[start:start + limit_num]

    result = []
    for c in paged:
        result.append({
            "id": c["id"],
            "set_id": c.get("set_id"),
            "part": c.get("part", 1),
            "title": c.get("title") or f"Luyện nghe Part {c.get('part', 1)}",
            "audio_url": c.get("audio_url") or "",
            "full_sentence": c.get("full_sentence") or "",
            "lines": c.get("lines") or [],
            "blanks_sentence": c.get("blanks_sentence"),
            "keywords": c.get("keywords") or [],
            "vietnamese_translation": c.get("vietnamese_translation") or "",
            "difficulty": c.get("difficulty") or "Medium",
            "segments": c.get("segments") or [],
            "phonetic_tips": c.get("phonetic_tips") or [],
            "key_vocab": c.get("key_vocab") or [],
            "image_url": c.get("image_url"),
            "options": c.get("options"),
            "question_text": c.get("question_text"),
            "correct_answer": c.get("correct_answer"),
            "image_url": c.get("image_url"),
            "options": c.get("options"),
            "question_text": c.get("question_text"),
            "correct_answer": c.get("correct_answer")
        })
    return {
        "total": len(filtered),
        "total_pages": math.ceil(len(filtered) / limit_num),
        "page": page_num,
        "limit": limit_num,
        "challenges": result
    }

@router.post("/check")
def check_dictation(payload: dict):
    user_text = payload.get("user_text", "").strip()
    target_text = payload.get("target_text", "")
    challenge_id = payload.get("challenge_id") or payload.get("question_id")

    found_challenge = None
    if challenge_id:
        challenges = get_challenges()
        found_challenge = next((c for c in challenges if c["id"] == challenge_id), None)
        if found_challenge and not target_text:
            target_text = found_challenge.get("full_sentence", "")

    if not target_text:
        target_text = "The quick brown fox jumps over the lazy dog"

    res = compute_alignment_diff(target_text, user_text)

    vi_trans = ""
    if found_challenge:
        vi_trans = found_challenge.get("vietnamese_translation") or ""

    res["segments"] = extract_segments(target_text)
    res["explanation"] = {
        "translation_vi": vi_trans,
        "phonetic_tips": generate_phonetic_tips(target_text),
        "grammar_note": f"Cấu trúc câu Part {found_challenge.get('part', 1) if found_challenge else 1}: Chú ý sự hòa hợp giữa chủ ngữ và vị ngữ, thì của động từ và các cụm giới từ chỉ địa điểm/phương hướng.",
        "key_vocab": extract_key_vocab(target_text)
    }

    return res
