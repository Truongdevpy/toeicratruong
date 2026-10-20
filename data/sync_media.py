import sqlite3
from pathlib import Path

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

c.execute("SELECT url, site, test_id, local_path, file_size, sha256 FROM downloads WHERE status='completed' AND local_path IS NOT NULL")
dl_rows = c.fetchall()

synced = 0
for url, site, test_id, local_path, file_size, sha256 in dl_rows:
    p = Path(local_path)
    if not p.is_file():
        continue
    
    ext = p.suffix.lower()
    if ext in [".mp3", ".wav", ".m4a", ".ogg"]:
        mtype = "audio"
    elif ext in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        mtype = "image"
    else:
        mtype = "other"
        
    c.execute("""
    INSERT INTO media (site, test_id, url, media_type, extension, local_path, sha256, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'))
    ON CONFLICT(url) DO UPDATE SET
        local_path = excluded.local_path,
        sha256 = COALESCE(excluded.sha256, media.sha256),
        status = 'completed'
    """, (site, test_id, url, mtype, ext, local_path, sha256))
    synced += 1

conn.commit()
print(f"Synchronized {synced} media records.")

c.execute("SELECT site, media_type, status, count(*) FROM media GROUP BY site, media_type, status")
print("\nUpdated media table:")
for r in c.fetchall():
    print(r)
