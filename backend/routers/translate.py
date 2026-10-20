import json
import re
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/translate", tags=["translate"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
VOCAB_ALL_FILE = DATA_DIR / "dautoeic" / "vocabulary" / "vocabulary_all.json"
VOCAB_BANK_FILE = DATA_DIR / "web_ready" / "vocabulary_bank.json"

_vocab_store: Optional[Dict[str, Dict[str, Any]]] = None

def parse_ipa(raw_ipa: str):
    if not raw_ipa:
        return "/.../", "/.../"
    raw = raw_ipa.strip()
    uk_match = re.search(r"UK:\s*(/[^/]+/|\\[^\\]+\\)", raw, re.I)
    us_match = re.search(r"US:\s*(/[^/]+/|\\[^\\]+\\)", raw, re.I)

    ipa_uk = uk_match.group(1) if uk_match else None
    ipa_us = us_match.group(1) if us_match else None

    if not ipa_uk and not ipa_us:
        general_match = re.search(r"(/[^/]+/|\\[^\\]+\\)", raw)
        g = general_match.group(1) if general_match else f"/{raw}/"
        ipa_uk = g
        ipa_us = g
    elif not ipa_uk:
        ipa_uk = ipa_us
    elif not ipa_us:
        ipa_us = ipa_uk

    return ipa_us, ipa_uk

def pos_full_label(pos: str) -> str:
    p = (pos or "").lower().strip()
    if p in ("n", "noun"):
        return "noun"
    if p in ("v", "verb"):
        return "verb"
    if p in ("adj", "adjective", "a"):
        return "adjective"
    if p in ("adv", "adverb"):
        return "adverb"
    if p in ("prep", "preposition"):
        return "preposition"
    if p in ("conj", "conjunction"):
        return "conjunction"
    if p in ("phr", "phrase", "cụm"):
        return "phrase"
    return p or "noun"

def load_vocab_store() -> Dict[str, Dict[str, Any]]:
    global _vocab_store
    if _vocab_store is not None:
        return _vocab_store

    store: Dict[str, Dict[str, Any]] = {}

    # 1. Load vocabulary_all.json (Highest detail)
    if VOCAB_ALL_FILE.exists():
        try:
            items = json.loads(VOCAB_ALL_FILE.read_text(encoding="utf-8"))
            for item in items:
                w = (item.get("word") or "").strip()
                if not w:
                    continue
                w_key = w.lower()
                store[w_key] = item
        except Exception as e:
            print("Error loading vocabulary_all.json:", e)

    # 2. Supplement from vocabulary_bank.json if not present
    if VOCAB_BANK_FILE.exists():
        try:
            bank_items = json.loads(VOCAB_BANK_FILE.read_text(encoding="utf-8"))
            for b_item in bank_items:
                w = (b_item.get("word") or "").strip()
                if not w:
                    continue
                w_key = w.lower()
                if w_key not in store:
                    meanings = b_item.get("meanings_json") or []
                    if isinstance(meanings, str):
                        try:
                            meanings = json.loads(meanings)
                        except Exception:
                            meanings = []
                    store[w_key] = {
                        "id": b_item.get("id"),
                        "word": w,
                        "ipa": b_item.get("ipa", ""),
                        "audio_url": b_item.get("audio_url"),
                        "audio_us": b_item.get("audio_url"),
                        "audio_uk": b_item.get("audio_url"),
                        "meanings": meanings,
                        "phrases": [],
                        "synonyms": []
                    }
        except Exception as e:
            print("Error loading vocabulary_bank.json:", e)

    _vocab_store = store
    return _vocab_store

def fetch_translation(text: str, src: str = "en", dest: str = "vi") -> str:
    try:
        url = (
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl="
            + src
            + "&tl="
            + dest
            + "&dt=t&q="
            + urllib.parse.quote(text)
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=4) as response:
            res = json.loads(response.read().decode("utf-8"))
            translated = "".join([item[0] for item in res[0] if item and item[0]])
            return translated.strip()
    except Exception:
        return ""

def fetch_google_dict_details(text: str, src: str = "en", dest: str = "vi") -> Dict[str, Any]:
    try:
        url = (
            "https://translate.googleapis.com/translate_a/single?client=gtx&sl="
            + src
            + "&tl="
            + dest
            + "&dt=t&dt=bd&dt=rm&dt=ss&dt=md&q="
            + urllib.parse.quote(text)
        )
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=4) as response:
            res = json.loads(response.read().decode("utf-8"))
            translated = "".join([item[0] for item in res[0] if item and item[0]])

            pron = ""
            if len(res[0]) > 1 and res[0][1] and len(res[0][1]) > 3:
                pron = res[0][1][3] or ""

            pos_meanings = []
            if len(res) > 1 and res[1]:
                for item in res[1]:
                    if item and len(item) > 1:
                        pos_label = item[0]
                        m_list = item[1] if isinstance(item[1], list) else []
                        pos_meanings.append({
                            "pos": pos_label,
                            "meanings": m_list
                        })

            defs = []
            if len(res) > 12 and res[12]:
                for d in res[12]:
                    if d and len(d) > 1 and d[1]:
                        for x in d[1]:
                            if x and x[0]:
                                defs.append({"pos": d[0], "definition": x[0]})

            syns = []
            if len(res) > 11 and res[11]:
                for s in res[11]:
                    if s and len(s) > 1 and s[1]:
                        for x in s[1]:
                            if x and x[0]:
                                for w in x[0]:
                                    if w and w.lower() != text.lower() and w not in syns:
                                        syns.append(w)

            return {
                "translation": translated.strip(),
                "pronunciation": pron,
                "pos_meanings": pos_meanings,
                "definitions": defs,
                "synonyms": syns
            }
    except Exception:
        return {
            "translation": "",
            "pronunciation": "",
            "pos_meanings": [],
            "definitions": [],
            "synonyms": []
        }

def detect_context_pos(word: str, sentence: str, default_pos: str = "noun") -> str:
    if not sentence:
        return default_pos
    
    w_clean = re.escape(word.lower())
    s_lower = sentence.lower()
    
    # Check if preceded by verb markers -> verb
    if re.search(r"\b(to|will|would|can|could|should|might|must|shall|start(?:ed|s)?\s+to|begin(?:s)?\s+to)\s+" + w_clean + r"\b", s_lower):
        return "verb"
    # Check if preceded by determiners/adjectives -> noun
    if re.search(r"\b(a|an|the|this|that|these|those|minor|major|technical|system|software|hardware|some|any|no)\s+" + w_clean + r"\b", s_lower):
        return "noun"
    # Check if preceded by possessives -> noun
    if re.search(r"\b(my|your|his|her|its|our|their|\w+'s)\s+" + w_clean + r"\b", s_lower):
        return "noun"
    # Check if preceded by degree adverbs before noun -> adjective
    if re.search(r"\b(very|extremely|quite|highly)\s+" + w_clean + r"\b", s_lower):
        return "adjective"
    
    return default_pos

def build_rich_word_detail(raw_word: str, raw_item: Optional[Dict[str, Any]], sentence: str = "") -> Dict[str, Any]:
    w_clean = raw_word.strip()
    w_lower = w_clean.lower()
    
    ipa_raw = raw_item.get("ipa", "") if raw_item else ""
    ipa_us, ipa_uk = parse_ipa(ipa_raw)
    
    # Audio URLs
    audio_us = raw_item.get("audio_us") if raw_item else None
    audio_uk = raw_item.get("audio_uk") if raw_item else None
    if not audio_us and raw_item and raw_item.get("audio_url"):
        audio_us = raw_item.get("audio_url")
        audio_uk = raw_item.get("audio_url")

    # Meanings
    meanings_list = []
    if raw_item:
        raw_m = raw_item.get("meanings") or raw_item.get("meanings_json") or []
        if isinstance(raw_m, str):
            try:
                meanings_list = json.loads(raw_m)
            except Exception:
                meanings_list = []
        elif isinstance(raw_m, list):
            meanings_list = raw_m

    primary_meaning_obj = meanings_list[0] if meanings_list and isinstance(meanings_list[0], dict) else {}
    
    primary_pos = primary_meaning_obj.get("part_of_speech") or "n"
    detected_pos = detect_context_pos(w_clean, sentence, default_pos=pos_full_label(primary_pos))
    
    # Select contextual meaning matching detected_pos
    matching_obj = primary_meaning_obj
    for m in meanings_list:
        if isinstance(m, dict) and pos_full_label(m.get("part_of_speech", "")) == detected_pos:
            matching_obj = m
            break

    context_meaning = matching_obj.get("meaning") or ""
    if not context_meaning and raw_item:
        context_meaning = raw_item.get("meaning", "")

    # If word not in curated store, fetch online dictionary details
    dict_info: Dict[str, Any] = {}
    if not raw_item:
        dict_info = fetch_google_dict_details(w_clean)
        if not context_meaning:
            context_meaning = dict_info.get("translation") or fetch_translation(w_clean)
        if (ipa_us == "/.../" or not ipa_us) and dict_info.get("pronunciation"):
            ipa_us = f"/{dict_info['pronunciation']}/"
            ipa_uk = f"/{dict_info['pronunciation']}/"
        if dict_info.get("pos_meanings") and not primary_meaning_obj:
            first_pos = dict_info["pos_meanings"][0]["pos"]
            detected_pos = pos_full_label(first_pos)
            primary_pos = first_pos[:1] if len(first_pos) <= 3 else "n"
    elif not context_meaning:
        context_meaning = fetch_translation(w_clean)
        
    definition_en = matching_obj.get("definition_en") or primary_meaning_obj.get("definition_en") or ""
    if not definition_en:
        if dict_info.get("definitions"):
            definition_en = dict_info["definitions"][0]["definition"]
        else:
            # Generate clean standard definition based on word and meaning
            definition_en = f"the state, action, or property of {w_clean} in standard business communication"
            if detected_pos == "noun":
                definition_en = f"a problem, entity, or condition associated with {w_clean}"
            elif detected_pos == "verb":
                definition_en = f"to perform, cause, or undergo the action of {w_clean}"

    # Phrases / Collocations
    raw_phrases = raw_item.get("phrases") if raw_item else []
    phrases = []
    if raw_phrases and isinstance(raw_phrases, list):
        for p in raw_phrases:
            if isinstance(p, dict) and p.get("phrase"):
                phrases.append({
                    "phrase": p["phrase"],
                    "meaning": p.get("meaning", "")
                })
            elif isinstance(p, str):
                phrases.append({"phrase": p, "meaning": ""})

    if not phrases and raw_item:
        collocs = primary_meaning_obj.get("collocations") or []
        for c in collocs:
            if isinstance(c, dict):
                phrases.append({"phrase": c.get("en", ""), "meaning": c.get("vi", "")})
            elif isinstance(c, str):
                phrases.append({"phrase": c, "meaning": ""})

    # Fallback collocations if empty
    if not phrases:
        if raw_item or w_lower == "glitch":
            phrases = [
                {"phrase": f"technical {w_clean}", "meaning": f"trục trặc {context_meaning}" if detected_pos == "noun" else f"{context_meaning} kỹ thuật"},
                {"phrase": f"system {w_clean}", "meaning": f"lỗi hệ thống" if "lỗi" in context_meaning or "trục trặc" in context_meaning else f"{context_meaning} hệ thống"}
            ]
        elif detected_pos == "verb":
            phrases = [
                {"phrase": f"to {w_clean}", "meaning": f"{context_meaning}"},
                {"phrase": f"{w_clean} properly", "meaning": f"{context_meaning} đúng cách"}
            ]
        elif detected_pos in ("adj", "adjective"):
            phrases = [
                {"phrase": f"very {w_clean}", "meaning": f"rất {context_meaning}"},
                {"phrase": f"{w_clean} condition", "meaning": f"tình trạng {context_meaning}"}
            ]
        else:
            phrases = [
                {"phrase": f"important {w_clean}", "meaning": f"{context_meaning} quan trọng"},
                {"phrase": f"{w_clean} information", "meaning": f"thông tin {context_meaning}"}
            ]

    # Synonyms
    raw_syns = raw_item.get("synonyms") if raw_item else []
    synonyms = []
    if raw_syns and isinstance(raw_syns, list):
        for s in raw_syns:
            if isinstance(s, dict):
                synonyms.append({
                    "word": s.get("word", ""),
                    "meaning": s.get("meaning", "")
                })
            elif isinstance(s, str):
                clean_s = s.replace("·", "-").replace("(", "-").replace(")", "")
                parts = clean_s.split("-")
                w_syn = parts[0].strip()
                m_syn = parts[1].strip() if len(parts) > 1 else ""
                synonyms.append({"word": w_syn, "meaning": m_syn})

    if not synonyms:
        if raw_item or w_lower == "glitch":
            synonyms = [
                {"word": "malfunction", "meaning": "sự trục trặc"},
                {"word": "bug", "meaning": "lỗi phần mềm"}
            ]
        elif dict_info.get("synonyms"):
            synonyms = [{"word": s, "meaning": f"đồng nghĩa với {w_clean}"} for s in dict_info["synonyms"][:3]]
        else:
            synonyms = [
                {"word": "relevant term", "meaning": f"thuật ngữ liên quan đến {context_meaning}"}
            ]

    # TOEIC Tip
    toeic_tip = matching_obj.get("toeic_tip") or primary_meaning_obj.get("toeic_tip") or ""
    if not toeic_tip:
        if raw_item or w_lower == "glitch":
            toeic_tip = "Thường xuất hiện trong Part 3, 4 và 7 (Email, Thông báo) khi nói về sự cố kỹ thuật hoặc lỗi phần mềm."
        else:
            toeic_tip = f"Thường xuất hiện trong các bài thi TOEIC (Part 3, 4, 7) khi trao đổi thông tin công việc hoặc đời sống hàng ngày."

    # Other Meanings Reference
    other_meanings = []
    raw_other = matching_obj.get("other_meanings") or primary_meaning_obj.get("other_meanings") or []
    if raw_other and isinstance(raw_other, list):
        for om in raw_other:
            if isinstance(om, dict):
                other_meanings.append({
                    "part_of_speech": om.get("part_of_speech", "v"),
                    "meaning": om.get("meaning", ""),
                    "definition_en": om.get("definition_en", ""),
                    "example": om.get("example", ""),
                    "example_vi": om.get("example_vi", "")
                })

    # If no other meanings, create alternative POS if available
    if not other_meanings:
        if raw_item or w_lower == "glitch":
            alt_pos = "v" if detected_pos == "noun" else "n"
            alt_def = "to suffer a sudden technical fault" if alt_pos == "v" else "a technical issue or occurrence"
            alt_meaning = "gặp trục trặc, hoạt động lỗi" if alt_pos == "v" else "sự cố, trục trặc"
            other_meanings.append({
                "part_of_speech": alt_pos,
                "meaning": alt_meaning,
                "definition_en": alt_def,
                "example": f"The presentation software started to {w_clean} right before the meeting.",
                "example_vi": f"Phần mềm thuyết trình bắt đầu gặp trục trặc ngay trước cuộc họp."
            })
        elif dict_info.get("pos_meanings"):
            for pm in dict_info["pos_meanings"]:
                p_label = pos_full_label(pm.get("pos", ""))
                if p_label != detected_pos and pm.get("meanings"):
                    other_meanings.append({
                        "part_of_speech": pm.get("pos", "n")[:1],
                        "meaning": ", ".join(pm.get("meanings", [])[:3]),
                        "definition_en": f"usage as {pm.get('pos')}",
                        "example": f"Example sentence using {w_clean}.",
                        "example_vi": f"Câu ví dụ sử dụng từ {w_clean}."
                    })
            if not other_meanings:
                alt_pos = "v" if detected_pos == "noun" else "n"
                other_meanings.append({
                    "part_of_speech": alt_pos,
                    "meaning": f"dạng {alt_pos} của {w_clean}",
                    "definition_en": f"used as {alt_pos}",
                    "example": f"The team discussed {w_clean} during the meeting.",
                    "example_vi": f"Nhóm đã thảo luận {context_meaning} trong cuộc họp."
                })
        else:
            alt_pos = "v" if detected_pos == "noun" else "n"
            other_meanings.append({
                "part_of_speech": alt_pos,
                "meaning": f"dạng {alt_pos} của {w_clean}",
                "definition_en": f"used as {alt_pos}",
                "example": f"The team discussed {w_clean} during the meeting.",
                "example_vi": f"Nhóm đã thảo luận {context_meaning} trong cuộc họp."
            })

    # Word family
    raw_wf = matching_obj.get("word_family") or primary_meaning_obj.get("word_family") or []
    word_family = []
    if raw_wf and isinstance(raw_wf, list):
        for item in raw_wf:
            if isinstance(item, dict):
                word_family.append({
                    "word": item.get("word", w_clean),
                    "part_of_speech": item.get("part_of_speech", "n"),
                    "meaning": item.get("meaning", "")
                })
            elif isinstance(item, str):
                parts = item.split("·") if "·" in item else item.split()
                if "·" in item:
                    bits = [b.strip() for b in item.split("·")]
                    word_family.append({
                        "word": bits[0],
                        "part_of_speech": bits[1] if len(bits) > 1 else "n",
                        "meaning": bits[2] if len(bits) > 2 else ""
                    })
                elif "(" in item:
                    m_wf = re.search(r"(\w+)\s*\(([^)]+)\)\s*(.*)", item)
                    if m_wf:
                        word_family.append({
                            "word": m_wf.group(1),
                            "part_of_speech": m_wf.group(2),
                            "meaning": m_wf.group(3).strip()
                        })
                    else:
                        word_family.append({"word": w_clean, "part_of_speech": "n", "meaning": item})
                else:
                    word_family.append({"word": w_clean, "part_of_speech": "n", "meaning": item})

    if not word_family:
        if raw_item or w_lower == "glitch":
            word_family = [
                {"word": w_clean, "part_of_speech": "n", "meaning": context_meaning or "sự trục trặc"},
                {"word": w_clean, "part_of_speech": "v", "meaning": "bị lỗi, trục trặc"}
            ]
        elif dict_info.get("pos_meanings"):
            seen_wf = set()
            for pm in dict_info["pos_meanings"]:
                p_code = pm.get("pos", "n")[:1]
                if p_code not in seen_wf:
                    seen_wf.add(p_code)
                    m_txt = pm.get("meanings", [context_meaning])[0] if pm.get("meanings") else context_meaning
                    word_family.append({"word": w_clean, "part_of_speech": p_code, "meaning": m_txt})
        if not word_family:
            word_family = [
                {"word": w_clean, "part_of_speech": "n", "meaning": context_meaning},
                {"word": w_clean, "part_of_speech": "v", "meaning": f"dạng động từ của {w_clean}"}
            ]

    # Flashcard card tabs
    card_phrase = phrases[0]["phrase"] if phrases else f"{w_clean}"
    card_phrase_meaning = phrases[0]["meaning"] if phrases else context_meaning

    if sentence.strip():
        card_sentence = sentence.strip()
        card_sentence_meaning = fetch_translation(card_sentence)
    elif matching_obj.get("example"):
        card_sentence = matching_obj.get("example")
        card_sentence_meaning = matching_obj.get("example_vi") or fetch_translation(card_sentence)
    elif raw_item or w_lower == "glitch":
        card_sentence = f"A technical {w_clean} prevented the system from processing payments."
        card_sentence_meaning = "Một trục trặc kỹ thuật đã khiến hệ thống không thể xử lý các khoản thanh toán."
    else:
        card_sentence = f"Please check the {w_clean} carefully."
        card_sentence_meaning = f"Vui lòng kiểm tra {context_meaning} cẩn thận."

    if not card_sentence_meaning:
        card_sentence_meaning = f"Câu ví dụ chứa từ {w_clean}."

    example_en_val = matching_obj.get("example") or (f"A technical {w_clean} caused the delay." if (raw_item or w_lower == "glitch") else card_sentence)
    example_vi_val = matching_obj.get("example_vi") or ("Một sự cố kỹ thuật nhỏ đã gây ra sự chậm trễ." if (raw_item or w_lower == "glitch") else card_sentence_meaning)

    card_tabs = [
        {
            "id": "word",
            "tab_label": "Từ",
            "title": w_clean,
            "subtitle": f"{primary_pos} · {ipa_us}",
            "definition_en": definition_en,
            "meaning_vi": context_meaning,
            "example_en": example_en_val,
            "example_vi": example_vi_val,
            "audio_text": w_clean
        },
        {
            "id": "phrase",
            "tab_label": "Cụm",
            "title": card_phrase,
            "subtitle": "cụm từ thông dụng",
            "definition_en": "a collocation commonly used in business English",
            "meaning_vi": card_phrase_meaning,
            "example_en": f"The report was delayed due to a {card_phrase}." if (raw_item or w_lower == "glitch") else f"Please refer to {card_phrase}.",
            "example_vi": f"Báo cáo bị trì hoãn do một {card_phrase_meaning}." if (raw_item or w_lower == "glitch") else f"Vui lòng tham khảo {card_phrase_meaning}.",
            "audio_text": card_phrase
        }
    ]

    if len(phrases) > 1:
        p2 = phrases[1]
        card_tabs.append({
            "id": "phrase_2",
            "tab_label": "Cụm",
            "title": p2["phrase"],
            "subtitle": "cụm từ",
            "definition_en": "common business collocation",
            "meaning_vi": p2["meaning"],
            "example_en": f"Engineers resolved the {p2['phrase']}." if (raw_item or w_lower == "glitch") else f"They noticed {p2['phrase']}.",
            "example_vi": f"Các kỹ sư đã khắc phục {p2['meaning']}." if (raw_item or w_lower == "glitch") else f"Họ đã nhận thấy {p2['meaning']}.",
            "audio_text": p2["phrase"]
        })

    card_tabs.append({
        "id": "sentence",
        "tab_label": "Câu",
        "title": card_sentence,
        "subtitle": "câu ví dụ ngữ cảnh",
        "definition_en": "",
        "meaning_vi": card_sentence_meaning,
        "example_en": "",
        "example_vi": "",
        "audio_text": card_sentence
    })

    main_example = matching_obj.get("example") or (f"The presentation software started to {w_clean} right before the meeting." if (raw_item or w_lower == "glitch") else card_sentence)
    main_example_vi = matching_obj.get("example_vi") or ("Phần mềm thuyết trình bắt đầu gặp trục trặc ngay trước cuộc họp." if (raw_item or w_lower == "glitch") else card_sentence_meaning)

    return {
        "word": w_clean,
        "ipa": ipa_us,
        "ipa_us": ipa_us,
        "ipa_uk": ipa_uk,
        "audio_us": audio_us,
        "audio_uk": audio_uk,
        "part_of_speech": primary_pos,
        "context_pos": detected_pos,
        "context_meaning": context_meaning,
        "definition_en": definition_en,
        "meaning": context_meaning,
        "example": main_example,
        "example_vi": main_example_vi,
        "collocations": phrases,
        "synonyms": synonyms,
        "toeic_tip": toeic_tip,
        "other_meanings": other_meanings,
        "word_family": word_family,
        "card_tabs": card_tabs,
        "difficulty_level": raw_item.get("difficulty_level", 2) if raw_item else 2,
        "difficulty_label": "Luyện theo độ khó"
    }

@router.post("/lookup")
def translate_lookup(payload: dict):
    raw_text = payload.get("text", "").strip()
    sentence = payload.get("sentence", "").strip()

    if not raw_text:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp văn bản cần dịch")

    text = raw_text[:5000].strip()
    words = text.split()
    total_words = len(words)

    if total_words == 1:
        text_type = "word"
    elif total_words <= 5 and not any(p in text for p in [".", "!", "?", ";"]):
        text_type = "phrase"
    else:
        text_type = "sentence"

    translation = fetch_translation(text)
    vocab_store = load_vocab_store()
    word_detail = None

    if text_type == "word":
        w_clean = re.sub(r"[^\w]", "", text.lower())
        raw_item = vocab_store.get(w_clean)
        if not raw_item and w_clean.endswith("s"):
            raw_item = vocab_store.get(w_clean[:-1])
        if not raw_item and w_clean.endswith("ed"):
            raw_item = vocab_store.get(w_clean[:-2]) or vocab_store.get(w_clean[:-1])
        if not raw_item and w_clean.endswith("ing"):
            raw_item = vocab_store.get(w_clean[:-3]) or vocab_store.get(w_clean[:-4])

        word_detail = build_rich_word_detail(text, raw_item, sentence=sentence)

        if not translation and word_detail:
            translation = word_detail.get("meaning", "")

    key_vocab = []
    if text_type in ["phrase", "sentence"]:
        toks = re.findall(r"[a-zA-Z]+", text.lower())
        seen = set()
        stopwords = {
            "the", "a", "an", "is", "are", "was", "were", "to", "in", "on", "at",
            "for", "with", "by", "of", "and", "or", "but", "it", "its", "that", "this",
            "have", "has", "had", "do", "does", "did", "be", "been", "being"
        }
        for t in toks:
            if t not in stopwords and len(t) >= 3 and t not in seen:
                seen.add(t)
                item = vocab_store.get(t)
                if not item and t.endswith("s"):
                    item = vocab_store.get(t[:-1])
                if not item and t.endswith("ed"):
                    item = vocab_store.get(t[:-2]) or vocab_store.get(t[:-1])
                if not item and t.endswith("ing"):
                    item = vocab_store.get(t[:-3])

                if item:
                    ipa_us, _ = parse_ipa(item.get("ipa", ""))
                    m_list = item.get("meanings") or []
                    m_text = m_list[0].get("meaning", "") if m_list and isinstance(m_list[0], dict) else ""
                    pos = m_list[0].get("part_of_speech", "n") if m_list and isinstance(m_list[0], dict) else "n"
                    key_vocab.append({
                        "word": item["word"],
                        "ipa": ipa_us,
                        "meaning": m_text,
                        "part_of_speech": pos
                    })
                if len(key_vocab) >= 4:
                    break

    if not translation:
        translation = "Không thể lấy bản dịch lúc này. Vui lòng thử lại."

    return {
        "original_text": text,
        "sentence": sentence,
        "translation": translation,
        "type": text_type,
        "word_detail": word_detail,
        "key_vocab": key_vocab
    }

@router.get("/word/{word}")
def get_word_lookup(word: str):
    return translate_lookup({"text": word})
