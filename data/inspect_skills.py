import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
from config import DAUTOEIC_CONFIG

url = DAUTOEIC_CONFIG["supabase_url"] + "/rest/v1"
headers = {
    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
    "Authorization": "Bearer " + DAUTOEIC_CONFIG["supabase_anon_key"],
    "Prefer": "count=exact"
}

skill_tables = [
    # Listening
    "listening_sets", "listening_items", "listening_collection_order", "listening_chapter_order",
    "listening_attempts", "listening_notes", "listening_questions", "listening_transcripts",
    # Reading
    "reading_passages", "reading_sets", "reading_items", "reading_questions", "user_reading_progress",
    # Speaking
    "speaking_sets", "speaking_questions", "speaking_prompts", "speaking_topics", "speaking_items",
    # Writing
    "writing_part1_questions", "writing_part2_questions", "writing_part3_questions",
    "writing_questions", "writing_topics", "writing_sets", "writing_part2_starred", "writing_items",
    # Video / Blog
    "videos", "video_lessons", "video_playlists", "blogs", "blog_posts",
    # Grammar
    "grammar_topics", "grammar_subtopics", "lessons", "questions"
]

with httpx.Client(headers=headers, timeout=20) as client:
    for t in skill_tables:
        try:
            r = client.get(f"{url}/{t}?select=*&limit=1")
            count_header = r.headers.get("content-range", "")
            items = r.json()
            sample_keys = list(items[0].keys()) if items and isinstance(items, list) and len(items) > 0 else []
            print(f"Table: {t:<28} Status: {r.status_code} Count: {count_header:<15} Keys: {sample_keys[:6]}")
        except Exception as e:
            print(f"Table: {t:<28} Error: {e}")
