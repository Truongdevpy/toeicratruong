from pathlib import Path
import os

base = Path("C:/Users/truon/Downloads/toeicratruong/data/data/media")
target_rel = "study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 10/audio/part_1/q001.mp3"
full_target = base / target_rel.replace("/", os.sep)
print("full_target:", full_target)
print("exists?:", full_target.exists())

# Step by step directory check
curr = base
for part in target_rel.split("/"):
    print(f"\nChecking inside {curr}:")
    if curr.exists():
        sub = [p.name for p in curr.iterdir()]
        print(f"Contains {part}? {part in sub}")
        if part not in sub:
            print("Matches starting with:", [p.name for p in curr.iterdir() if p.name.lower().startswith(part.lower()[:8])])
    curr = curr / part
