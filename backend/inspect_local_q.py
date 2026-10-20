import sqlite3

db_path = r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("PRAGMA table_info(questions);")
print("Questions columns:", [r[1] for r in cur.fetchall()])
cur.execute("SELECT part, question_number, text, choices, correct_answer FROM questions LIMIT 3")
for r in cur.fetchall():
    print(r)
