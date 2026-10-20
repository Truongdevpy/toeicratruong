import os
from pathlib import Path

p = Path("data/media")
s4_files = list((p / "study4").glob("**/*")) if (p / "study4").exists() else []
dau_files = list((p / "dautoeic").glob("**/*")) if (p / "dautoeic").exists() else []

print(f"Study4 media files on disk: {len([f for f in s4_files if f.is_file()])}")
print(f"Dautoeic media files on disk: {len([f for f in dau_files if f.is_file()])}")

# Also check data/dautoeic
p_dau = Path("data/dautoeic")
dau2_files = list(p_dau.glob("**/*")) if p_dau.exists() else []
print(f"data/dautoeic total files: {len([f for f in dau2_files if f.is_file()])}")
