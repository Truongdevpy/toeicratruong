import os
from pathlib import Path

base = Path("data/media/study4")
files = list(base.rglob("*.*"))
audio = [f for f in files if f.suffix.lower() in [".mp3", ".wav", ".m4a"]]
images = [f for f in files if f.suffix.lower() in [".jpg", ".png", ".webp", ".jpeg"]]
print(f"Study4 on disk: {len(files)} total files | {len(audio)} audio files | {len(images)} image files")
