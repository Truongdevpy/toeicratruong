import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import json
from config import DAUTOEIC_CONFIG

url = DAUTOEIC_CONFIG["supabase_url"] + "/rest/v1"
headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": "Bearer " + DAUTOEIC_CONFIG["supabase_anon_key"],
}

with httpx.Client(headers=headers, timeout=20) as client:
    r = client.get(f"{url}/questions?select=*&limit=3")
    print("Status:", r.status_code)
    if r.status_code == 200:
        data = r.json()
        print("Columns:", list(data[0].keys()) if data else [])
        print("Sample:", json.dumps(data[0], ensure_ascii=False, indent=2))
