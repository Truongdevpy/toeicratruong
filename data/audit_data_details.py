import sqlite3
import json
from pathlib import Path
from collections import Counter, defaultdict

db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT * FROM tests")
tests = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM questions")
questions = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM passages")
passages = [dict(r) for r in c.fetchall()]

c.execute("SELECT * FROM downloads")
downloads = dict((r["url"], r["local_path"]) for r in c.fetchall() if r["status"] == "completed")

print(f"Total tests: {len(tests)}, Total questions: {len(questions)}, Total passages: {len(passages)}")

# 1. Check Answer & Option issues
no_answer = []
invalid_answer = []
answer_types = Counter()
missing_options_lr = []

for q in questions:
    t_site = q["site"]
    q_id = q["id"]
    ans = q["correct_answer"]
    part = q["part"]
    
    # Check if LR or SW
    # Part 1-7 is LR
    is_lr = part in range(1, 8)
    
    if ans is None or str(ans).strip() == "":
        no_answer.append((q_id, q["test_id"], part, q["question_number"], q["question_type"]))
    else:
        ans_str = str(ans).strip()
        answer_types[ans_str] += 1
        if is_lr:
            # For LR, answers should normally be A, B, C, D (or 1, 2, 3, 4 or 0, 1, 2, 3)
            if ans_str not in ["A", "B", "C", "D"]:
                invalid_answer.append((q_id, q["test_id"], part, q["question_number"], ans_str))

    if is_lr:
        opt_a = q["option_a"]
        opt_b = q["option_b"]
        opt_c = q["option_c"]
        opt_d = q["option_d"]
        
        # In Part 1, 3, 4, 5, 6, 7 we expect A, B, C, D
        # In Part 2 we expect A, B, C (D can be null)
        if part == 2:
            if not opt_a or not opt_b or not opt_c:
                missing_options_lr.append((q_id, part, q["question_number"], "Part 2 missing A/B/C", opt_a, opt_b, opt_c, opt_d))
        elif part in [1, 3, 4, 5, 6, 7]:
            if not opt_a or not opt_b or not opt_c or not opt_d:
                missing_options_lr.append((q_id, part, q["question_number"], f"Part {part} missing options", opt_a, opt_b, opt_c, opt_d))

print(f"\n--- ANSWER AUDIT ---")
print(f"No answer questions: {len(no_answer)}")
if no_answer[:10]:
    print("Sample no answer:", no_answer[:10])
print(f"Invalid answer format (not A,B,C,D in LR): {len(invalid_answer)}")
if invalid_answer[:10]:
    print("Sample invalid answer format:", invalid_answer[:10])
print("Answer distribution top 10:", answer_types.most_common(10))

print(f"\n--- OPTION AUDIT ---")
print(f"Missing options in LR: {len(missing_options_lr)}")
if missing_options_lr[:10]:
    print("Sample missing options in LR:", missing_options_lr[:10])

# 2. Check Part & Question Number consistency
part_mismatches = []
for q in questions:
    part = q["part"]
    q_num = q["question_number"]
    if q_num is not None and part in range(1, 8):
        expected_part = 1 if q_num <= 6 else (2 if q_num <= 31 else (3 if q_num <= 70 else (4 if q_num <= 100 else (5 if q_num <= 130 else (6 if q_num <= 146 else 7)))))
        if part != expected_part:
            part_mismatches.append((q["id"], q["test_id"], f"actual part {part} != expected {expected_part}", f"q_num={q_num}"))

print(f"\n--- PART / QUESTION NUMBER AUDIT ---")
print(f"Part mismatches: {len(part_mismatches)}")
if part_mismatches[:10]:
    print("Sample part mismatches:", part_mismatches[:10])

# 3. Check Duplicate Questions
q_counts = Counter(q["id"] for q in questions)
dup_ids = [qid for qid, cnt in q_counts.items() if cnt > 1]
print(f"\n--- DUPLICATE AUDIT ---")
print(f"Duplicate question IDs: {len(dup_ids)}")

# Check duplicate within same test
test_qnum = defaultdict(list)
dup_test_qnum = []
for q in questions:
    key = (q["test_id"], q["question_number"])
    test_qnum[key].append(q["id"])
    if len(test_qnum[key]) > 1:
        dup_test_qnum.append((key, test_qnum[key]))
print(f"Duplicate (test_id, question_number) in questions: {len(dup_test_qnum)}")
if dup_test_qnum[:10]:
    print("Sample dup (test_id, q_num):", dup_test_qnum[:10])

conn.close()
