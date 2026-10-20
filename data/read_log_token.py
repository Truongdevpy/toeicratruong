import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
from pathlib import Path

log_path = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb" / "033892.log"
raw = log_path.read_bytes()
print(f"Log size: {len(raw)}")
# Search for access_token or eyJ in utf-16 or utf-8
pattern_utf16 = re.compile(rb'e\x00y\x00J\x00h\x00b\x00G\x00c\x00i\x00O\x00i\x00[^\x00]*(\x00[^\x00]+)+')
for m in re.finditer(rb'e\x00y\x00J\x00[a-zA-Z0-9_\-\x00]{200,}', raw):
    token = m.group(0).decode("utf-16-le", errors="ignore")
    print("Found token len:", len(token), "Starts:", token[:30])
    if len(token) > 500:
        Path("dau_auth_token.txt").write_text(token, encoding="utf-8")
        print("WROTE dau_auth_token.txt!")
        break
