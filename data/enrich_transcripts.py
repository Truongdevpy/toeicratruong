import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path
import re

mock_dir = Path("data/web_ready/mock_tests")

enriched_count = 0
for p in mock_dir.glob("*.json"):
    try:
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        continue

    modified = False
    for q in data.get("questions", []):
        part = q.get("part", 1)
        if part in [1, 2, 3, 4] and not q.get("transcript"):
            if part == 1:
                # Script is the 4 photo descriptions
                opt_a = q.get("option_a") or ""
                opt_b = q.get("option_b") or ""
                opt_c = q.get("option_c") or ""
                opt_d = q.get("option_d") or ""
                if opt_a and opt_b and opt_c and opt_d:
                    q["transcript"] = f"(A) {opt_a}\n(B) {opt_b}\n(C) {opt_c}\n(D) {opt_d}"
                    modified = True
                elif opt_a:
                    ans = q.get("correct_answer", "A")
                    corr_text = q.get(f"option_{ans.lower()}", opt_a)
                    q["transcript"] = f"Correct description: {corr_text}"
                    modified = True
            elif part == 2:
                # Question prompt + options
                q_text = q.get("question_text") or ""
                opt_a = q.get("option_a") or ""
                opt_b = q.get("option_b") or ""
                opt_c = q.get("option_c") or ""
                if q_text and (opt_a or opt_b):
                    q["transcript"] = f"Question: {q_text}\n(A) {opt_a}\n(B) {opt_b}\n(C) {opt_c}"
                    modified = True
                elif q_text:
                    q["transcript"] = f"Question: {q_text}"
                    modified = True
            elif part in [3, 4]:
                # Conversation or talk script is in passage_text
                passage = q.get("passage_text") or ""
                if passage:
                    clean_passage = re.sub(r'<[^>]+>', ' ', passage)
                    clean_passage = re.sub(r'\s+', ' ', clean_passage).strip()
                    q["transcript"] = clean_passage
                    modified = True

    if modified:
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        enriched_count += 1

print(f"Enriched listening transcripts in {enriched_count} mock test JSON files!")
