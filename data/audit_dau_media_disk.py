import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import json
from pathlib import Path

mock_dir = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data\web_ready\mock_tests")
data_dir = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data")

dau_files = list(mock_dir.glob("dautoeic_*.json"))

audio_missing = 0
audio_file_not_found = 0
image_missing_p1 = 0
image_file_not_found_p1 = 0

for f in dau_files:
    data = json.loads(f.read_text(encoding="utf-8"))
    for q in data.get("questions", []):
        p = q.get("part")
        qn = q.get("question_number")
        
        if p in [1, 2, 3, 4]:
            loc_a = q.get("local_audio")
            aud = q.get("audio_url")
            if not loc_a and not aud:
                audio_missing += 1
            else:
                p_check = loc_a or aud
                if not os.path.exists(p_check) and not (data_dir / p_check).exists() and not (data_dir.parent / p_check).exists():
                    audio_file_not_found += 1
                    
        if p == 1:
            loc_i = q.get("local_image")
            img = q.get("image_url")
            if not loc_i and not img:
                image_missing_p1 += 1
            else:
                p_check = loc_i or img
                if not os.path.exists(p_check) and not (data_dir / p_check).exists() and not (data_dir.parent / p_check).exists():
                    image_file_not_found_p1 += 1

print(f"Dau TOEIC media audit across 31 tests:")
print(f"  Audio missing in listening: {audio_missing}")
print(f"  Audio file not found on disk: {audio_file_not_found}")
print(f"  Image missing in Part 1: {image_missing_p1}")
print(f"  Image file not found on disk: {image_file_not_found_p1}")

