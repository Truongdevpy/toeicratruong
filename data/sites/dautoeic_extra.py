import json
import time
from pathlib import Path
from typing import Any, Dict
import httpx
from config import DATA_DIR
from core.utils import logger, sanitize_path_segment

def safe_get_json(client, url, max_retries=3):
    for attempt in range(max_retries):
        try:
            r = client.get(url)
            if r.status_code in (200, 206):
                return r.json()
        except Exception as e:
            if attempt == max_retries - 1:
                logger.warning(f"Failed to fetch {url} after {max_retries} attempts: {e}")
                raise
            time.sleep(1.0)
    return []

def crawl_vocabulary(self) -> Dict[str, Any]:
    logger.info("[DAUTOEIC] Crawling Vocabulary...")
    vocab_dir = DATA_DIR / self.site_name / "vocabulary"
    vocab_dir.mkdir(parents=True, exist_ok=True)

    headers = {"apikey": self.api_key, "Authorization": f"Bearer {self.api_key}"}

    with httpx.Client(headers=headers, timeout=30.0) as client:
        sets = safe_get_json(client, f"{self.api_url}/vocabulary_sets?select=*&order=order_index.asc")
        sets_map = {s["id"]: s for s in sets}

        vtests = safe_get_json(client, f"{self.api_url}/vocabulary_tests?select=*&order=order_index.asc&limit=200")
        tests_map = {t["id"]: t for t in vtests}

        parts = safe_get_json(client, f"{self.api_url}/vocabulary_parts?select=*&order=order_index.asc&limit=300")
        parts_map = {p["id"]: p for p in parts}

        all_words = []
        offset = 0
        limit = 500
        while True:
            url = f"{self.api_url}/vocabulary_words?select=*&limit={limit}&offset={offset}"
            rows = safe_get_json(client, url)
            if not rows:
                break
            all_words.extend(rows)
            if len(rows) < limit:
                break
            offset += limit

    logger.info(f"[DAUTOEIC] Retrieved {len(sets)} sets, {len(vtests)} tests, {len(parts)} parts, {len(all_words)} words.")

    for w in all_words:
        part_id = w.get("part_id") or ""
        part_obj = parts_map.get(part_id, {})
        part_name = part_obj.get("name") or "Part 1"
        test_id = part_obj.get("test_id") or ""
        test_obj = tests_map.get(test_id, {})
        test_name = test_obj.get("name") or "Test"
        set_id = test_obj.get("set_id") or ""
        set_obj = sets_map.get(set_id, {})
        set_name = set_obj.get("name") or "Vocab Set"

        self.db.upsert_vocab_word(
            id_val=w["id"],
            site=self.site_name,
            set_id=set_id,
            set_name=set_name,
            test_id=test_id,
            test_name=test_name,
            part_id=part_id,
            part_name=part_name,
            word=w.get("word") or "",
            ipa=w.get("ipa"),
            audio_url=w.get("audio_url"),
            meanings_json=json.dumps(w.get("meanings") or [], ensure_ascii=False),
            order_index=w.get("order_index") or 0
        )

    catalog = {"sets": sets, "tests": vtests, "parts": parts, "total_words": len(all_words)}
    (vocab_dir / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    (vocab_dir / "vocabulary_all.json").write_text(json.dumps(all_words, ensure_ascii=False, indent=2), encoding="utf-8")

    for s in sets:
        s_name = sanitize_path_segment(s.get("name") or s["id"])
        s_dir = vocab_dir / s_name
        s_dir.mkdir(parents=True, exist_ok=True)
        s_tests = [t for t in vtests if t.get("set_id") == s["id"]]
        for t in s_tests:
            t_name = sanitize_path_segment(t.get("name") or t["id"])
            t_dir = s_dir / t_name
            t_dir.mkdir(parents=True, exist_ok=True)
            t_parts = [p for p in parts if p.get("test_id") == t["id"]]
            for p in t_parts:
                p_name = sanitize_path_segment(p.get("name") or p["id"])
                p_words = [w for w in all_words if w.get("part_id") == p["id"]]
                (t_dir / f"{p_name}.json").write_text(json.dumps({
                    "set": s, "test": t, "part": p, "words": p_words
                }, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"sets": len(sets), "tests": len(vtests), "parts": len(parts), "words": len(all_words)}
