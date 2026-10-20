import sqlite3

conn = sqlite3.connect("C:/Users/truon/Downloads/toeicratruong/backend/platform.db")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)

for t in ["tests", "mock_tests", "questions", "test_questions", "reading_passages"]:
    if t in tables:
        cur.execute(f"PRAGMA table_info({t})")
        cols = [c[1] for c in cur.fetchall()]
        print(f"Columns in {t}:", cols)

cur.execute("SELECT part, COUNT(*), COUNT(DISTINCT audio_url), MIN(audio_url), MAX(audio_url) FROM questions GROUP BY part")
print("Audio by part in questions:")
for row in cur.fetchall():
    print(row)

cur.execute("SELECT DISTINCT audio_url FROM questions WHERE audio_url IS NOT NULL LIMIT 20")
print("Sample audio_url in questions:")
for row in cur.fetchall():
    print(row)
