from pathlib import Path

base = Path("C:/Users/truon/Downloads/toeicratruong")
print("Exists data:", (base / "data").exists())
print("Exists data/data:", (base / "data" / "data").exists())
print("Exists data/data/data:", (base / "data" / "data" / "data").exists())
print("Exists data/data/media:", (base / "data" / "data" / "media").exists())
print("Exists data/data/dautoeic:", (base / "data" / "data" / "dautoeic").exists())
print("Exists data/media:", (base / "data" / "media").exists())

for p in [(base / "data"), (base / "data" / "data"), (base / "data" / "data" / "data")]:
    if p.exists():
        subdirs = [x.name for x in p.iterdir() if x.is_dir()]
        print(f"Subdirs of {p}:", subdirs)
