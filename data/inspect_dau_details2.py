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
    r = client.get(f"{url}/mock_test_questions?select=test_id,part_number&limit=5")
    print("Status:", r.status_code)
    data = r.json()
    print("Type:", type(data))
    print("Data:", data)
