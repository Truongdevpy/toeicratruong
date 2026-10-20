import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
from pathlib import Path

profile_dir = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb"
print("Checking:", profile_dir)
for f in profile_dir.glob("*"):
    if f.suffix in [".ldb", ".log"]:
        try:
            raw = f.read_bytes()
            if b"sb-odlnhfaygiotcyehuysw-auth-token" in raw:
                print(f"Found in {f.name}!")
                idx = raw.find(b"sb-odlnhfaygiotcyehuysw-auth-token")
                sub = raw[idx:idx+4000].decode("utf-8", errors="ignore")
                m = re.search(r'\{[^{}]+"access_token"\s*:\s*"([^"]+)"[^{}]+\}', sub)
                if not m:
                    m = re.search(r'"access_token"\s*:\s*"([^"]+)"', sub)
                if m:
                    token = m.group(1)
                    print(f"Got fresh access token (len {len(token)})!")
                    Path("dau_auth_token.txt").write_text(token, encoding="utf-8")
                    
                    # Also find refresh_token to refresh if needed
                    m_ref = re.search(r'"refresh_token"\s*:\s*"([^"]+)"', sub)
                    if m_ref:
                        Path("dau_refresh_token.txt").write_text(m_ref.group(1), encoding="utf-8")
                        print("Got refresh token!")
                    break
        except Exception as e:
            print("Error reading:", f.name, e)
