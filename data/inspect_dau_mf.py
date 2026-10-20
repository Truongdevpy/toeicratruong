from pathlib import Path

p = Path("data/dautoeic/media_files")
files = list(p.rglob("*.*"))
audio = [f for f in files if f.suffix.lower() in [".mp3", ".wav"]]
images = [f for f in files if f.suffix.lower() in [".jpg", ".png", ".webp"]]
print(f"data/dautoeic/media_files: {len(files)} total | {len(audio)} audio | {len(images)} images")
print("Sample audio files:")
for a in audio[:10]:
    print("  ", a.name, a.stat().st_size)
