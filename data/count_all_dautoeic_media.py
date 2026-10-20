import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from config import DAUTOEIC_CONFIG

headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": "Bearer " + DAUTOEIC_CONFIG["supabase_anon_key"],
}

with httpx.Client(headers=headers, timeout=30) as client:
    # 1. Questions media
    r_q = client.get(f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/mock_test_questions?select=id,test_id,part,question_number,audio_url,image_url&limit=2000")
    questions = r_q.json()
    q_audios = set(q["audio_url"] for q in questions if q.get("audio_url"))
    q_images = set(q["image_url"] for q in questions if q.get("image_url"))
    
    # 2. Passages media
    r_p = client.get(f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/mock_test_passages?select=id,test_id,part,audio_url,image_url&limit=1000")
    passages = r_p.json()
    p_audios = set(p["audio_url"] for p in passages if p.get("audio_url"))
    p_images = set(p["image_url"] for p in passages if p.get("image_url"))

    all_audios = q_audios | p_audios
    all_images = q_images | p_images

    print(f"Questions: {len(questions)}")
    print(f"Passages: {len(passages)}")
    print(f"Total Unique Audios: {len(all_audios)} (Questions: {len(q_audios)}, Passages: {len(p_audios)})")
    print(f"Total Unique Images: {len(all_images)} (Questions: {len(q_images)}, Passages: {len(p_images)})")
    print(f"Total Media: {len(all_audios) + len(all_images)}")
