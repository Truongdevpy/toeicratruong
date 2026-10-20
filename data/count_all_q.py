import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from config import DAUTOEIC_CONFIG

headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": "Bearer " + DAUTOEIC_CONFIG["supabase_anon_key"],
}

with httpx.Client(headers=headers, timeout=30) as client:
    all_q = []
    offset = 0
    while True:
        r = client.get(f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/mock_test_questions?select=id,test_id,part,question_number,audio_url,image_url&limit=1000&offset={offset}")
        rows = r.json()
        if not rows:
            break
        all_q.extend(rows)
        offset += len(rows)
        if len(rows) < 1000:
            break

    q_audios = set(q["audio_url"] for q in all_q if q.get("audio_url"))
    q_images = set(q["image_url"] for q in all_q if q.get("image_url"))

    r_p = client.get(f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/mock_test_passages?select=id,test_id,part,audio_url,image_url&limit=1000")
    passages = r_p.json()
    p_audios = set(p["audio_url"] for p in passages if p.get("audio_url"))
    p_images = set(p["image_url"] for p in passages if p.get("image_url"))

    all_audios = q_audios | p_audios
    all_images = q_images | p_images

    print(f"Total Questions: {len(all_q)}")
    print(f"Total Passages: {len(passages)}")
    print(f"Total Unique Audios: {len(all_audios)}")
    print(f"Total Unique Images: {len(all_images)}")
    print(f"Grand Total Media: {len(all_audios) + len(all_images)}")
