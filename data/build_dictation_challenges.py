import sqlite3
import json
import os
import re
from pathlib import Path

data_root = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data")
db_path = data_root / "crawler.db"
out_path = data_root / "web_ready" / "dictation_challenges.json"

conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Get vocab dict for fast keyword lookup
vocab_path = data_root / "web_ready" / "vocabulary_bank.json"
vocab_map = {}
if vocab_path.exists():
    try:
        raw_vocab = json.loads(vocab_path.read_text(encoding="utf-8"))
        for item in raw_vocab:
            w = (item.get("word") or "").lower().strip()
            if w and w not in vocab_map:
                m_list = item.get("meanings_json") or []
                m_text = m_list[0].get("meaning", "") if (m_list and isinstance(m_list[0], dict)) else ""
                vocab_map[w] = {
                    "word": item.get("word"),
                    "ipa": item.get("ipa", ""),
                    "meaning": m_text,
                    "part_of_speech": m_list[0].get("part_of_speech", "n") if (m_list and isinstance(m_list[0], dict)) else "n"
                }
    except Exception as e:
        print("Error loading vocab:", e)

# Build sentence to translation cache from questions table
sent_trans_cache = {}
c.execute("SELECT raw_json FROM questions WHERE raw_json IS NOT NULL")
for row in c.fetchall():
    try:
        rj = json.loads(row["raw_json"])
        dn = rj.get("dich_nghia") or ""
        if dn:
            # Parse (A) ..., (B) ...
            parsed = re.findall(r"\(([A-D])\)\s*([^()]+)", dn)
            for opt_char, vi_text in parsed:
                opt_key = f"option_{opt_char.lower()}"
                en_text = rj.get(opt_key)
                if en_text:
                    clean_en = re.sub(r"[^\w\s]", "", en_text.lower()).strip()
                    sent_trans_cache[clean_en] = vi_text.strip()
    except Exception:
        pass

c.execute("""
    SELECT id, site, set_id, toeic_part, transcript, translation_vi, local_audio, difficulty_level
    FROM listening_items
    WHERE transcript IS NOT NULL AND length(transcript) > 5 AND local_audio IS NOT NULL
    ORDER BY toeic_part, id
""")

rows = c.fetchall()
conn.close()

def extract_segments(sentence: str):
    if not sentence:
        return []
    parts = [p.strip() for p in re.split(r"[,;]+", sentence) if p.strip()]
    if len(parts) <= 1:
        words = sentence.split()
        if len(words) >= 6:
            mid = len(words) // 2
            return [" ".join(words[:mid]), " ".join(words[mid:])]
        return [sentence]
    return parts

def extract_key_vocab(sentence: str):
    words = re.findall(r"[a-zA-Z]+", sentence.lower())
    found = []
    seen = set()
    stopwords = {"a", "an", "the", "in", "on", "at", "to", "for", "is", "are", "was", "were", "be", "been", "has", "have", "had", "he", "she", "it", "they", "we", "you", "i", "his", "her", "their", "our", "my", "your", "and", "but", "or", "so", "if", "not", "of", "with", "by", "as", "do", "does", "did", "will", "would", "can", "could"}

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
                "part_of_speech": item["part_of_speech"]
            })
        elif len(w) >= 6 and w not in seen:
            seen.add(w)
            found.append({
                "word": w.capitalize(),
                "ipa": "",
                "meaning": "Từ khóa trong câu",
                "part_of_speech": "vocab"
            })
    return found[:4]

def generate_phonetic_tips(sentence: str):
    insights = []
    words = sentence.split()
    for i in range(len(words) - 1):
        w1 = re.sub(r"[^\w]", "", words[i].lower())
        w2 = re.sub(r"[^\w]", "", words[i+1].lower())
        if w1 and w2 and w1[-1] in "bcdfgklmnprstvz" and w2[0] in "aeiou":
            insights.append(f"Nối âm (Consonant to Vowel): '{w1} + {w2}' phát âm lướt nhẹ nối liền.")
            break

    lower = sentence.lower()
    if "going to" in lower:
        insights.append("Giảm âm (Reduction): 'going to' trong văn nói nhanh thường phát âm thành /gənə/ (gonna).")
    elif "want to" in lower:
        insights.append("Giảm âm (Reduction): 'want to' trong văn nói nhanh thường phát âm thành /wɒnə/ (wanna).")
    elif "would have" in lower or "could have" in lower or "should have" in lower:
        insights.append("Nuốt âm: 'have' sau trợ động từ thường giảm thành /əv/ (would've, could've).")

    if not insights:
        insights.append("Ngữ điệu: Chú ý nhấn trọng âm vào các từ mang nội dung (Content words) như danh từ và động từ chính.")
    return insights

challenges = []
valid_count = 0
for r in rows:
    loc = r["local_audio"]
    if not loc or not os.path.exists(loc):
        continue

    # Deterministic web url
    clean = str(loc).replace("\\", "/")
    if "data/dautoeic/" in clean:
        web_audio = f"/dautoeic_media/{clean.split('data/dautoeic/')[1]}"
    elif "data/media/" in clean:
        web_audio = f"/media/{clean.split('data/media/')[1]}"
    else:
        web_audio = f"/data/{clean.split('data/')[1]}" if "data/" in clean else clean

    part = r["toeic_part"]
    transcript = r["transcript"].strip()
    vi = r["translation_vi"] or ""

    # Look up in cache if empty
    if not vi:
        clean_key = re.sub(r"[^\w\s]", "", transcript.lower()).strip()
        vi = sent_trans_cache.get(clean_key, "")

    # Clean transcript quotes
    transcript = transcript.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')

    diff_str = "Easy" if part == 1 else ("Medium" if part in [2, 3] else "Hard")

    challenges.append({
        "id": r["id"],
        "set_id": r["set_id"],
        "part": part,
        "title": f"Part {part} - Luyện nghe chép câu #{valid_count + 1}",
        "audio_url": web_audio,
        "local_audio": web_audio,
        "full_sentence": transcript,
        "vietnamese_translation": vi,
        "difficulty": diff_str,
        "segments": extract_segments(transcript),
        "phonetic_tips": generate_phonetic_tips(transcript),
        "key_vocab": extract_key_vocab(transcript),
        "keywords": [w for w in re.findall(r"[a-zA-Z]+", transcript.lower()) if len(w) >= 5][:4]
    })
    valid_count += 1

out_path.write_text(json.dumps({"total": len(challenges), "challenges": challenges}, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Successfully built {len(challenges)} authentic dictation challenges saved to {out_path}!")
