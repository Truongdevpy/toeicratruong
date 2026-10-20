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
    r = client.get(f"{url}/listening_sets?select=*&limit=10")
    print("listening_sets sample:")
    print(json.dumps(r.json()[:3], ensure_ascii=False, indent=2))
    
    r_parts = client.get(f"{url}/listening_sets?select=toeic_part,collection_name,chapter_name")
    parts = set(x.get("toeic_part") for x in r_parts.json())
    colls = set(x.get("collection_name") for x in r_parts.json())
    print("Parts:", parts)
    print("Collections:", colls)
