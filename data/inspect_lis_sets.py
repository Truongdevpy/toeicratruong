import sqlite3
import os
from pathlib import Path

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

# Check listening items with 1.mp3, etc.
c.execute("""
SELECT id, set_id, toeic_part, audio_url, raw_json 
FROM listening_items 
WHERE audio_url NOT LIKE 'http%' 
LIMIT 5
""")
rows = c.fetchall()
for r in rows:
    print("Row:", r[:4])
    print("Raw JSON snippet:", str(r[4])[:200])

# Check set_id in listening_sets
c.execute("SELECT id, name, slug FROM listening_sets WHERE id LIKE '%0ab9cd18%' LIMIT 5")
print("Sets matching 0ab9cd18:", c.fetchall())

# Check all listening_sets
c.execute("SELECT count(*), site FROM listening_sets GROUP BY site")
print("Listening sets by site:", c.fetchall())
