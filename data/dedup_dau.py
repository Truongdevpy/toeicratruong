import sqlite3

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

# Remove duplicate unprefixed rows
c.execute("DELETE FROM questions WHERE site='dautoeic' AND test_id NOT LIKE 'dautoeic_%'")
deleted_q = c.rowcount
c.execute("DELETE FROM passages WHERE site='dautoeic' AND test_id NOT LIKE 'dautoeic_%'")
deleted_p = c.rowcount

conn.commit()
print(f"Deleted {deleted_q} duplicate questions and {deleted_p} duplicate passages.")

c.execute("SELECT count(*) FROM questions WHERE site='dautoeic'")
print(f"Remaining Dau TOEIC questions: {c.fetchone()[0]}")

c.execute("SELECT count(*) FROM passages WHERE site='dautoeic'")
print(f"Remaining Dau TOEIC passages: {c.fetchone()[0]}")
