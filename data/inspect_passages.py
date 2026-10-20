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
    r = client.get(f"{url}/mock_test_passages?select=*&limit=5")
    data = r.json()
    print("Passages count:", len(data))
    if data:
        print("Sample passage keys:", list(data[0].keys()))
        print("Sample passage:", json.dumps(data[0], ensure_ascii=False, indent=2))
