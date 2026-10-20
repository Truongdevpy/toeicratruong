import json
import os
from pathlib import Path

catalog_path = Path("data/web_ready/tests_catalog.json")
mock_dir = Path("data/web_ready/mock_tests")

with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

issues = {
    "missing_files": [],
    "question_count_mismatch": [],
    "part_distribution_issues": [],
    "missing_answer": [],
    "invalid_answer": [],
    "missing_options": [],
    "missing_audio_p14": [],
    "missing_image_p1": [],
    "duplicate_questions": [],
    "missing_explanation": [],
    "missing_transcript_p14": [],
    "broken_media_files": []
}

total_questions = 0

for item in catalog:
    file_name = item.get("file_name", f"{item['id']}.json")
    file_path = mock_dir / file_name
    if not file_path.exists():
        file_path = mock_dir / f"{item['id']}.json"
    if not file_path.exists():
        issues["missing_files"].append(item["id"])
        continue

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        issues["missing_files"].append(f"{item['id']} err: {str(e)}")
        continue

    questions = data.get("questions", [])
    test_type = item.get("test_type", "lr_full")
    total_questions += len(questions)

    # Check question counts
    expected_count = 200 if test_type == "lr_full" else (11 if test_type == "sw_speaking" else 8)
    if len(questions) != expected_count:
        issues["question_count_mismatch"].append(f"{item['id']}: has {len(questions)}, expected {expected_count}")

    if test_type == "lr_full":
        part_counts = {}
        seen_q_nums = set()
        for q in questions:
            q_num = q.get("question_number")
            part = q.get("part")
            part_counts[part] = part_counts.get(part, 0) + 1

            # Duplicate question numbers
            if q_num in seen_q_nums:
                issues["duplicate_questions"].append(f"{item['id']}: duplicate Q{q_num}")
            seen_q_nums.add(q_num)

            # Check answers
            ans = q.get("correct_answer") or q.get("answer")
            if not ans:
                issues["missing_answer"].append(f"{item['id']} Q{q_num}")
            elif ans.upper() not in ["A", "B", "C", "D"]:
                issues["invalid_answer"].append(f"{item['id']} Q{q_num}: {ans}")

            # Check options
            opts = q.get("options") or {}
            if part in [1, 3, 4, 5, 6, 7]:
                for opt_key in ["A", "B", "C", "D"]:
                    val = opts.get(opt_key) or q.get(f"option_{opt_key.lower()}")
                    if not val:
                        issues["missing_options"].append(f"{item['id']} Q{q_num} missing {opt_key}")

            # Check audio for listening
            if part in [1, 2, 3, 4]:
                audio = q.get("local_audio") or q.get("audio_url") or q.get("audio") or data.get("overall_audio")
                if not audio:
                    issues["missing_audio_p14"].append(f"{item['id']} Q{q_num} Part {part}")
                transcript = q.get("transcript") or q.get("audio_transcript")
                if not transcript:
                    issues["missing_transcript_p14"].append(f"{item['id']} Q{q_num}")

            # Check image for Part 1
            if part == 1:
                img = q.get("local_image") or q.get("image_url") or q.get("image")
                if not img:
                    issues["missing_image_p1"].append(f"{item['id']} Q{q_num}")

            # Check explanation
            exp = q.get("explanation")
            if not exp:
                issues["missing_explanation"].append(f"{item['id']} Q{q_num}")

print(f"Total questions across all tests: {total_questions}")
print("--- AUDIT SUMMARY ---")
for k, v in issues.items():
    print(f"{k}: {len(v)} occurrences")
    if 0 < len(v) <= 5:
        print("   Details:", v)
    elif len(v) > 5:
        print("   First 5 samples:", v[:5])
