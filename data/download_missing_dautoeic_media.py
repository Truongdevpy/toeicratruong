import sys
sys.stdout.reconfigure(encoding="utf-8")
import sqlite3
import httpx
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

# Get missing audios
c.execute("SELECT distinct audio_url FROM questions WHERE site='dautoeic' AND audio_url LIKE 'http%'")
q_audios = set(r[0] for r in c.fetchall())
c.execute("SELECT distinct audio_url FROM passages WHERE site='dautoeic' AND audio_url LIKE 'http%'")
p_audios = set(r[0] for r in c.fetchall())
all_audios = q_audios | p_audios

c.execute("SELECT distinct image_url FROM questions WHERE site='dautoeic' AND image_url LIKE 'http%'")
q_imgs = set(r[0] for r in c.fetchall())
c.execute("SELECT distinct image_url FROM passages WHERE site='dautoeic' AND image_url LIKE 'http%'")
p_imgs = set(r[0] for r in c.fetchall())
all_imgs = q_imgs | p_imgs

c.execute("SELECT url, local_path FROM downloads WHERE status='completed'")
downloaded_map = dict(c.fetchall())

items_to_download = []
for u in all_audios:
    if u not in downloaded_map or not Path(downloaded_map.get(u, "")).is_file():
        items_to_download.append((u, "audio"))

for u in all_imgs:
    if u not in downloaded_map or not Path(downloaded_map.get(u, "")).is_file():
        items_to_download.append((u, "image"))

print(f"Total items to download: {len(items_to_download)} ({len(all_audios)} audios, {len(all_imgs)} images)")

base_out = Path("data/dautoeic/media_files")
base_out.mkdir(parents=True, exist_ok=True)

def dl_item(item):
    url, mtype = item
    fname = Path(url.split("?")[0]).name
    # if name collision or too generic
    subdir = base_out / mtype
    subdir.mkdir(parents=True, exist_ok=True)
    dest = subdir / fname
    if dest.is_file() and dest.stat().st_size > 0:
        return True, url, str(dest), dest.stat().st_size, "skipped"

    try:
        with httpx.Client(timeout=30) as client:
            r = client.get(url)
            if r.status_code == 200:
                dest.write_bytes(r.content)
                return True, url, str(dest), len(r.content), "downloaded"
            else:
                return False, url, str(dest), 0, f"http_{r.status_code}"
    except Exception as e:
        return False, url, str(dest), 0, str(e)

success = 0
failed = 0
now_iso = datetime.now(timezone.utc).isoformat()

with ThreadPoolExecutor(max_workers=6) as executor:
    futures = {executor.submit(dl_item, it): it for it in items_to_download}
    for fut in as_completed(futures):
        ok, url, local_path, sz, msg = fut.result()
        if ok:
            success += 1
            c.execute("""
            INSERT OR REPLACE INTO downloads (
                url, site, test_id, status, http_status, local_path, file_size, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (url, "dautoeic", "dautoeic_all", "completed", 200, local_path, sz, now_iso))
        else:
            failed += 1

conn.commit()
conn.close()
print(f"Finished: {success} downloaded/skipped, {failed} failed.")
