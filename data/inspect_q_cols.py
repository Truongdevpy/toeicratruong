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
    r = client.get(f"{url}/mock_test_questions?limit=1")
    if r.status_code in (200, 206):
        items = r.json()
        print("Columns in mock_test_questions:", list(items[0].keys()) if items else [])
        print("Sample:", items[0] if items else {})
