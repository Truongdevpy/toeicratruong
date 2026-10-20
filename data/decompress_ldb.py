import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
import cramjam
from pathlib import Path

f = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb" / "033895.ldb"
data = f.read_bytes()

# In LevelDB table files, blocks end with 1 byte compression type (0=none, 1=snappy) + 4 bytes CRC
# Let's search for blocks containing auth-token
all_decompressed = []
# Try scanning chunks
pos = 0
while pos < len(data) - 5:
    # try decompressing starting from pos
    for sz in range(100, min(65536, len(data) - pos)):
        try:
            chunk = data[pos:pos+sz]
            decomp = cramjam.snappy.decompress(chunk)
            if b"access_token" in decomp or b"refresh_token" in decomp:
                all_decompressed.append(decomp)
                print(f"Success at pos {pos}, size {sz}, decomp len {len(decomp)}")
                break
        except Exception:
            pass
    pos += 4096

if not all_decompressed:
    print("Testing sliding block search...")
