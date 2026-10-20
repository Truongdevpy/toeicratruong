import httpx
from pathlib import Path
import sqlite3

url = "https://study4.com/media/users/2554841/g.jpg"
dest = Path("data/media/study4/user_avatars/g.jpg")
dest.parent.mkdir(parents=True, exist_ok=True)

try:
    r = httpx.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
    if r.status_code == 200:
        dest.write_bytes(r.content)
        conn = sqlite3.connect("data/crawler.db")
        c = conn.cursor()
        c.execute("UPDATE downloads SET local_path=? WHERE url=?", (str(dest.resolve()), url))
        conn.commit()
        print("Updated g.jpg:", str(dest), dest.stat().st_size)
    else:
        conn = sqlite3.connect("data/crawler.db")
        c = conn.cursor()
        c.execute("DELETE FROM downloads WHERE url=?", (url,))
        conn.commit()
        print(f"Deleted non-existent avatar download record: {r.status_code}")
except Exception as e:
    conn = sqlite3.connect("data/crawler.db")
    c = conn.cursor()
    c.execute("DELETE FROM downloads WHERE url=?", (url,))
    conn.commit()
    print("Deleted error download:", e)
