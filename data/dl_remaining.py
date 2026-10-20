import asyncio
from pathlib import Path
from core.database import Database
from core.downloader import FileDownloader
from config import DATA_DIR

db = Database()
downloader = FileDownloader(concurrency=5, db=db)
pending = db.get_pending_downloads()
print(f"Found {len(pending)} pending items:")
tasks = []
for p in pending:
    url = p["url"]
    fname = Path(url).name
    t_id = p.get("test_id") or "common"
    part = p.get("part") or 1
    m_type = p.get("media_type") or "audio"
    dest = DATA_DIR / "dautoeic" / "Crack_TOEIC_Vol_2" / f"Test_{t_id[:6]}" / ("audio" if m_type == "audio" else "images") / fname
    tasks.append({"item": p, "dest_path": dest})

if tasks:
    results = asyncio.run(downloader.download_batch(tasks, check_resume=True))
    print(f"Downloaded: {sum(1 for r in results if r.get('status') == 'completed')}, Skipped: {sum(1 for r in results if r.get('status') == 'skipped')}, Failed: {sum(1 for r in results if r.get('status') == 'failed')}")
