import sqlite3

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()
c.execute("UPDATE media SET media_type='audio' WHERE extension IN ('.mp3', '.wav', '.m4a', '.ogg') AND media_type != 'audio'")
print("Updated rows:", c.rowcount)
conn.commit()

c.execute("SELECT site, media_type, status, count(*) FROM media GROUP BY site, media_type, status")
for r in c.fetchall():
    print(r)
