from pathlib import Path
import re

base = Path("C:/Users/truon/Downloads/toeicratruong/data/data")
audio_files = list(base.glob("**/*.mp3"))
print(f"Total mp3 files found: {len(audio_files)}")

sliced_dirs = set()
for f in audio_files:
    fname = f.name.lower()
    if any(k in fname for k in ["q0", "part_", "passage_", "001_audio", "002_audio", "003_audio", "preview-"]):
        sliced_dirs.add(f.parent)

print(f"Directories containing sliced audio: {len(sliced_dirs)}")
for d in sorted(sliced_dirs):
    print(" -", d)
