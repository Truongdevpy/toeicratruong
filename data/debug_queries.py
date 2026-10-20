import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from config import DAUTOEIC_CONFIG

headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": "Bearer " + DAUTOEIC_CONFIG["supabase_anon_key"],
}

with httpx.Client(headers=headers, timeout=20) as client:
    # 1. Vocab words
    url1 = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/vocabulary_words?select=*&order=part_id.asc,order_index.asc&limit=10&offset=0"
    r1 = client.get(url1)
    print("Vocab words with order:", r1.status_code, r1.text[:200])

    url1_simple = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/vocabulary_words?select=*&limit=10"
    r1_simple = client.get(url1_simple)
    print("Vocab words simple:", r1_simple.status_code, len(r1_simple.json()) if r1_simple.status_code == 200 else r1_simple.text[:200])

    # 2. Grammar questions
    url2 = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/questions?select=*&limit=10&offset=0"
    r2 = client.get(url2)
    print("Grammar questions:", r2.status_code, r2.text[:200])
