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

with httpx.Client(headers=headers, timeout=20) as client:
    r_mq_audio = client.get(f"{url}/mock_test_questions?audio_url=not.is.null&select=id,part,audio_url&limit=5")
    print("mock_test_questions with audio_url:", r_mq_audio.headers.get("content-range"))
    if r_mq_audio.status_code in (200, 206):
        for q in r_mq_audio.json()[:3]:
            print("  part:", q.get("part"), "audio_url:", q.get("audio_url"))

    r_mq_img = client.get(f"{url}/mock_test_questions?image_url=not.is.null&select=id,part,image_url&limit=5")
    print("mock_test_questions with image_url:", r_mq_img.headers.get("content-range"))
    if r_mq_img.status_code in (200, 206):
        for q in r_mq_img.json()[:3]:
            print("  part:", q.get("part"), "image_url:", q.get("image_url"))

    # Also check mock_test_passages for image_url or audio_url
    r_passages = client.get(f"{url}/mock_test_passages?limit=5")
    if r_passages.status_code in (200, 206) and r_passages.json():
        print("Passage columns:", list(r_passages.json()[0].keys()))
        print("Passage sample:", r_passages.json()[:1])
