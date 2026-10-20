import os
from pathlib import Path

root = Path(r"C:\Users\truon\Downloads\toeicratruong")
print("Searching for *32-34* or *1.mp3*...")
found = []
for p in root.rglob("*32-34*"):
    found.append(str(p))

print(f"Found {len(found)} matching *32-34*:")
for f in found[:10]:
    print(" ", f)

# Also search downloads table in crawler.db
import sqlite3
conn = sqlite3.connect(r"C:\Users\truon\Downloads\toeicratruong\data\data\crawler.db")
c = conn.cursor()
c.execute("SELECT url, local_path FROM downloads WHERE url LIKE '%32-34%' OR local_path LIKE '%32-34%' LIMIT 5")
print("\nDownloads table matches:")
for r in c.fetchall():
    print(" ", r)
conn.close()

