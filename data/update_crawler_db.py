import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import sqlite3
from pathlib import Path

db_path = Path("data/crawler.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

cache_path = Path("data/study4_answers_cache.json")
cache = json.loads(cache_path.read_text(encoding="utf-8"))

print(f"Applying authentic answers to Study4 questions for {len(cache)} tests...")
updated_questions = 0

for tid, data in cache.items():
    ans_map = data.get("answers", {})
    expl_map = data.get("explanations", {})
    for q_num_str, ans in ans_map.items():
        q_num = int(q_num_str)
        expl = expl_map.get(q_num_str, "")
        c.execute("""
            UPDATE questions
            SET correct_answer = ?,
                explanation = CASE WHEN (explanation IS NULL OR explanation = '') AND ? != '' THEN ? ELSE explanation END
            WHERE site = 'study4' AND test_id = ? AND question_number = ?
        """, (ans, expl, expl, tid, q_num))
        updated_questions += c.rowcount

conn.commit()
print(f"Updated {updated_questions} Study4 questions with authentic answers and explanations!")

# Fix Speaking part numbers: Q1-2: Part 1, Q3-4: Part 2, Q5-7: Part 3, Q8-10: Part 4, Q11: Part 5
print("\nFixing Speaking test parts...")
c.execute("""
    UPDATE questions
    SET part = CASE
        WHEN question_number IN (1, 2) THEN 1
        WHEN question_number IN (3, 4) THEN 2
        WHEN question_number IN (5, 6, 7) THEN 3
        WHEN question_number IN (8, 9, 10) THEN 4
        WHEN question_number = 11 THEN 5
        ELSE part
    END
    WHERE question_type = 'Speaking' OR site = 'study4' AND test_id IN (
        SELECT id FROM tests WHERE slug LIKE '%speaking%'
    )
""")
print(f"Updated {c.rowcount} speaking question parts.")

# Fix Writing test parts: Q1-5: Part 1, Q6-7: Part 2, Q8: Part 3
print("\nFixing Writing test parts...")
c.execute("""
    UPDATE questions
    SET part = CASE
        WHEN question_number BETWEEN 1 AND 5 THEN 1
        WHEN question_number IN (6, 7) THEN 2
        WHEN question_number = 8 THEN 3
        ELSE part
    END
    WHERE question_type = 'Writing' OR site = 'study4' AND test_id IN (
        SELECT id FROM tests WHERE slug LIKE '%writing%'
    )
""")
print(f"Updated {c.rowcount} writing question parts.")

conn.commit()

# Verify answers count
c.execute("""
    SELECT count(*), sum(case when correct_answer IS NOT NULL AND trim(correct_answer) != '' then 1 else 0 end)
    FROM questions
    WHERE part BETWEEN 1 AND 7 AND question_type NOT IN ('Speaking', 'Writing')
""")
tot_lr, ans_lr = c.fetchone()
print(f"\nFinal verification in crawler.db: LR questions with valid answers: {ans_lr}/{tot_lr} ({ans_lr/tot_lr*100:.1f}%)")

conn.close()
