import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import httpx
from datetime import datetime, timezone
from pathlib import Path

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

# 1. Delete rows where question_number > 200 for test 6852
c.execute("DELETE FROM questions WHERE site='study4' AND test_id='6852' AND question_number > 200")
deleted_count = c.rowcount
print(f"Deleted {deleted_count} junk questions for test 6852.")

# 2. Download the 5 graphic images
dest_dir = Path("data/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 1")
dest_dir.mkdir(parents=True, exist_ok=True)

img_map = {
    "62-64_updated_resized.c4ffb067.jpg": [62, 63, 64],
    "65-67_updated_resized.ed3754c6.jpg": [65, 66, 67],
    "68-70_updated_resized.86d48221.jpg": [68, 69, 70],
    "95-97_updated_resized.5ad6f272.jpg": [95, 96, 97],
    "98-100_updated_resized.f1b747b8.jpg": [98, 99, 100],
}

headers = {"User-Agent": "Mozilla/5.0"}
now_iso = datetime.now(timezone.utc).isoformat()

with httpx.Client(headers=headers, timeout=25) as client:
    for filename, qnums in img_map.items():
        url = f"https://study4.com/media/new_toeic_tests/new_toeic_updated/toeic-lr-collection-1-test-1/images/{filename}"
        dest_file = dest_dir / filename
        if not dest_file.is_file() or dest_file.stat().st_size == 0:
            resp = client.get(url)
            if resp.status_code == 200:
                dest_file.write_bytes(resp.content)
                print(f"Downloaded: {filename} ({dest_file.stat().st_size} bytes)")
            else:
                print(f"Failed to download {filename}: {resp.status_code}")

        local_path = str(dest_file)
        c.execute("""
        INSERT OR REPLACE INTO downloads (url, site, test_id, status, http_status, local_path, file_size, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (url, "study4", "6852", "completed", 200, local_path, dest_file.stat().st_size if dest_file.exists() else 0, now_iso))

        for qnum in qnums:
            c.execute("UPDATE questions SET image_url=? WHERE site='study4' AND test_id='6852' AND question_number=?", (local_path, qnum))

conn.commit()
c.execute("SELECT count(*) FROM questions WHERE site='study4' AND test_id='6852'")
print(f"Remaining questions for test 6852: {c.fetchone()[0]}")
