import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from pathlib import Path
from config import DAUTOEIC_CONFIG

token = Path("dau_auth_token.txt").read_text().strip()
headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": f"Bearer {token}",
    "Prefer": "count=exact"
}
url = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1"

with httpx.Client(headers=headers, timeout=15) as client:
    r_v = client.get(f"{url}/vocabulary_words?audio_url=not.is.null&limit=3")
    print("vocabulary_words with audio_url count header:", r_v.headers.get("content-range"))
    if r_v.status_code in (200, 206) and r_v.json():
        print("Sample vocab audio:", r_v.json()[0].get("word"), r_v.json()[0].get("audio_url"))
        
    r_l = client.get(f"{url}/listening_items?audio_url=not.is.null&limit=3")
    print("listening_items with audio_url count header:", r_l.headers.get("content-range"))
    if r_l.status_code in (200, 206) and r_l.json():
        print("Sample listening audio:", r_l.json()[0].get("title_vi"), r_l.json()[0].get("audio_url"))
