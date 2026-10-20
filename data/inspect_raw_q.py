import sqlite3
import json

conn = sqlite3.connect("data/crawler.db")
conn.row_factory = sqlite3.Row
c = conn.cursor()
c.execute("SELECT raw_json FROM questions WHERE test_id='dautoeic_0ab9cd18-cf4b-4b5e-909f-ec524c2a9af8' AND question_number=1")
row = c.fetchone()
d = json.loads(row["raw_json"])
print("Keys in raw_json:", list(d.keys()))
for k in ["audio_url", "image_url", "source", "test_id"]:
    print(f"  {k}: {d.get(k)}")
conn.close()
