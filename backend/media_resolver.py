from functools import lru_cache
import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "data"
MEDIA_DIR = DATA_DIR / "media"
DAU_DIR = DATA_DIR / "dautoeic"
CRAWLER_DB = DATA_DIR / "crawler.db"

_downloads_map = {}
if CRAWLER_DB.exists():
    try:
        conn = sqlite3.connect(str(CRAWLER_DB))
        c = conn.cursor()
        c.execute("SELECT url, local_path FROM downloads WHERE status='completed'")
        for u, p in c.fetchall():
            if u and p:
                _downloads_map[u] = p
        conn.close()
    except Exception as e:
        print("Warning loading downloads_map:", e)

# Fast filename lookup for 4000+ local media files
_filename_map = {}

def _build_filename_index():
    global _filename_map
    # 1. Index DauTOEIC media (exclude dictation_trimmed so regular practice keeps full audio)
    if DAU_DIR.exists():
        for root, _, files in os.walk(DAU_DIR):
            if "dictation_trimmed" in root.replace("\\", "/"):
                continue
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in {".mp3", ".wav", ".ogg", ".m4a", ".jpg", ".jpeg", ".png", ".webp", ".gif"}:
                    rel = os.path.relpath(os.path.join(root, f), DAU_DIR).replace("\\", "/")
                    _filename_map[f.lower()] = f"/dautoeic_media/{rel}"

    # 2. Index Study4 / general media
    if MEDIA_DIR.exists():
        for root, _, files in os.walk(MEDIA_DIR):
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in {".mp3", ".wav", ".ogg", ".m4a", ".jpg", ".jpeg", ".png", ".webp", ".gif"}:
                    rel = os.path.relpath(os.path.join(root, f), MEDIA_DIR).replace("\\", "/")
                    if f.lower() not in _filename_map:
                        _filename_map[f.lower()] = f"/media/{rel}"

_build_filename_index()

@lru_cache(maxsize=32768)
def _file_exists_on_disk(url: str) -> bool:
    if url.startswith("/media/"):
        rel = url[len("/media/"):].replace("/", "\\")
        return (MEDIA_DIR / rel).is_file()
    if url.startswith("/dautoeic_media/"):
        rel = url[len("/dautoeic_media/"):].replace("/", "\\")
        return (DAU_DIR / rel).is_file()
    if url.startswith("/data/"):
        rel = url[len("/data/"):].replace("/", "\\")
        return (DATA_DIR / rel).is_file()
    return False

@lru_cache(maxsize=32768)
def _resolve_media_url_cached(raw_str: str) -> str:
    # Already formatted web paths
    if raw_str.startswith("/media/") or raw_str.startswith("/dautoeic_media/") or raw_str.startswith("/data/"):
        if _file_exists_on_disk(raw_str):
            return raw_str

    # 1. Fast local filename lookup
    bname = os.path.basename(raw_str.split("?")[0]).lower()
    if bname and bname in _filename_map:
        return _filename_map[bname]

    # 2. Lookup in downloads_map if it's a remote URL
    local_path = _downloads_map.get(raw_str) or raw_str
    clean = str(local_path).replace("\\", "/")

    resolved = ""

    # Check dautoeic media folder
    if "/data/dautoeic/" in clean:
        sub = clean.split("/data/dautoeic/", 1)[1]
        resolved = f"/dautoeic_media/{sub}"
    elif clean.startswith("data/dautoeic/"):
        resolved = f"/dautoeic_media/{clean[len('data/dautoeic/'):]}"
    elif clean.startswith("dautoeic/"):
        resolved = f"/dautoeic_media/{clean[len('dautoeic/'):]}"
    # Check study4 media folder
    elif "/data/media/" in clean:
        sub = clean.split("/data/media/", 1)[1]
        resolved = f"/media/{sub}"
    elif clean.startswith("data/media/"):
        resolved = f"/media/{clean[len('data/media/'):]}"
    elif clean.startswith("media/"):
        resolved = f"/media/{clean[len('media/'):]}"
    elif "/data/study4/" in clean:
        sub = clean.split("/data/study4/", 1)[1]
        resolved = f"/data/study4/{sub}"
    elif clean.startswith("http://") or clean.startswith("https://"):
        return clean
    elif clean.startswith("/"):
        resolved = clean
    else:
        resolved = f"/media/{clean}"

    # Verify if local file actually exists
    if resolved and _file_exists_on_disk(resolved):
        return resolved

    # If it's a valid remote URL, return it
    if clean.startswith("http://") or clean.startswith("https://"):
        return clean

    # Return empty string if media does not exist on disk
    return ""

def resolve_media_url(raw_url: str, media_type: str = "auto") -> str:
    if not raw_url:
        return ""
    raw_str = str(raw_url).strip()
    if not raw_str or "\0" in raw_str or "%00" in raw_str or ".." in raw_str:
        return ""
    return _resolve_media_url_cached(raw_str)
