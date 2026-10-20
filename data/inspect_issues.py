import sqlite3
import json

db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
c = conn.cursor()

# Breakdown of no answer by site and test_type
c.execute("""
    SELECT q.site, t.slug, count(*) as count, count(q.correct_answer) as with_ans, count(*) - count(q.correct_answer) as no_ans
    FROM questions q
    JOIN tests t ON q.test_id = t.id OR q.test_id = t.test_id
    GROUP BY q.site, (CASE WHEN t.slug LIKE '%speaking%' THEN 'speaking' WHEN t.slug LIKE '%writing%' THEN 'writing' ELSE 'lr' END)
""")
for r in c.fetchall():
    print(dict(r))

# Check sample question study4_1209_1
c.execute("SELECT * FROM questions WHERE id = 'study4_1209_1'")
sample = dict(c.fetchone())
print("\nSample study4_1209_1:")
for k, v in sample.items():
    if k == "raw_json" and v:
        print(f"  raw_json: {v[:200]}...")
    else:
        print(f"  {k}: {v}")

# Check sample question study4_5895_7
c.execute("SELECT * FROM questions WHERE id = 'study4_5895_7'")
sample2 = dict(c.fetchone())
print("\nSample study4_5895_7:")
for k, v in sample2.items():
    if k == "raw_json" and v:
        print(f"  raw_json: {v[:200]}...")
    else:
        print(f"  {k}: {v}")

# Check sample question study4_230_32
c.execute("SELECT * FROM questions WHERE id = 'study4_230_32'")
sample3 = dict(c.fetchone())
print("\nSample study4_230_32:")
for k, v in sample3.items():
    if k == "raw_json" and v:
        print(f"  raw_json: {v[:200]}...")
    else:
        print(f"  {k}: {v}")

conn.close()
