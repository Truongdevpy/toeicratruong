import os
from pathlib import Path

f1 = Path("C:/Users/truon/Downloads/toeicratruong/data/data/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 10/T10_audio.dc0c648d.mp3")
f2 = Path("C:/Users/truon/Downloads/toeicratruong/data/data/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 10/audio/part_1/q001.mp3")

print("Overall tape exists:", f1.exists(), "Size:", f1.stat().st_size if f1.exists() else 0)
print("q001 exists:", f2.exists(), "Size:", f2.stat().st_size if f2.exists() else 0)
