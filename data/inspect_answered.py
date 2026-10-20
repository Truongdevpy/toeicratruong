import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
from collections import Counter

conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute("SELECT site, test_id, count(*) as total, sum(case when correct_answer IS NOT NULL AND trim(correct_answer) != '' then 1 else 0 end) as answered FROM questions GROUP BY site, test_id")
rows = c.fetchall()

test_status = []
for r in rows:
    test_status.append(dict(r))

print("Total test groups:", len(test_status))
fully_answered = [t for t in test_status if t["answered"] == t["total"]]
partially_answered = [t for t in test_status if 0 < t["answered"] < t["total"]]
zero_answered = [t for t in test_status if t["answered"] == 0]

print(f"Tests fully answered: {len(fully_answered)}")
print(f"Tests partially answered: {len(partially_answered)}")
print(f"Tests ZERO answered: {len(zero_answered)}")

print("\nBreakdown of fully answered by site:")
print(Counter(t["site"] for t in fully_answered))

print("\nBreakdown of zero answered by site:")
print(Counter(t["site"] for t in zero_answered))

# Let's inspect which tests have zero answered
c.execute("SELECT id, site, name, slug, test_id FROM tests WHERE id IN (%s)" % ",".join(f"'{t['test_id']}'" for t in zero_answered[:10]))
for t in c.fetchall():
    print("Zero answered sample test:", dict(t))

conn.close()
