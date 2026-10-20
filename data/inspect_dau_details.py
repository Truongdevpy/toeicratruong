import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import json
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
    # 1. Inspect mock_test_questions distinct test_id or categories
    r = client.get(f"{url}/mock_test_questions?select=test_id,part_number&limit=20")
    print("mock_test_questions sample:", r.json()[:3])
    
    # 2. Check total distinct test_id in mock_test_questions
    r2 = client.get(f"{url}/mock_tests?select=id,name")
    print("mock_tests in table:", r2.json())

    # 3. Check listening_items parts
    r3 = client.get(f"{url}/listening_items?select=toeic_part,category,audio_url&limit=10")
    print("listening_items sample:", r3.json()[:3])

    # 4. Check vocabulary_words sample
    r4 = client.get(f"{url}/vocabulary_words?select=id,word,audio_url,image_url&limit=5")
    print("vocabulary_words sample:", r4.json()[:3])
