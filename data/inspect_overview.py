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
    r = client.get(f"{url}/platform_modules?select=*&order=order_index.asc")
    print("=== PLATFORM MODULES ===")
    for m in r.json():
        print(f"[{m.get('id')}] {m.get('name_vi')} ({m.get('slug')}) - hidden: {m.get('is_hidden')}")

    r = client.get(f"{url}/vocabulary_sets?select=*&order=order_index.asc")
    print("\n=== VOCABULARY SETS ===")
    for v in r.json():
        print(f"[{v.get('id')}] {v.get('name')} ({v.get('source')})")

    r = client.get(f"{url}/mock_test_sets?select=*")
    print("\n=== MOCK TEST SETS ===")
    for s in r.json():
        print(f"[{s.get('id')}] {s.get('name')}")

    r = client.get(f"{url}/mock_tests?select=id,name,source,year,total_questions,order_index&order=order_index.asc")
    print("\n=== MOCK TESTS ===")
    for t in r.json():
        print(f"[{t.get('id')}] {t.get('name')} (Year: {t.get('year')}, Questions: {t.get('total_questions')})")
