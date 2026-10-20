import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
from pathlib import Path

chrome_storage = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Default" / "Local Storage" / "leveldb"
print("Storage path exists:", chrome_storage.exists())
if chrome_storage.exists():
    for f in chrome_storage.glob("*.ldb"):
        try:
            raw = f.read_bytes()
            if b"sb-odlnhfaygiotcyehuysw-auth-token" in raw:
                print("Found in", f.name)
                # extract token JSON
                idx = raw.find(b"sb-odlnhfaygiotcyehuysw-auth-token")
                sub = raw[idx:idx+2000].decode("utf-8", errors="ignore")
                m = re.search(r'\{[^{}]+access_token[^{}]+\}', sub)
                if m:
                    print("Extracted auth token JSON!")
                    Path("dau_refreshed_session.json").write_text(m.group(0), encoding="utf-8")
        except Exception as e:
            pass

    for f in chrome_storage.glob("*.log"):
        try:
            raw = f.read_bytes()
            if b"sb-odlnhfaygiotcyehuysw-auth-token" in raw:
                print("Found in log", f.name)
                idx = raw.find(b"sb-odlnhfaygiotcyehuysw-auth-token")
                sub = raw[idx:idx+4000].decode("utf-8", errors="ignore")
                m = re.search(r'\{.*"access_token"\s*:\s*"([^"]+)".*\}', sub)
                if m:
                    print("Found access_token in log!")
                    # find refresh_token
                    m_ref = re.search(r'"refresh_token"\s*:\s*"([^"]+)"', sub)
                    Path("dau_auth_token.txt").write_text(m.group(1), encoding="utf-8")
                    print("Updated dau_auth_token.txt!")
        except Exception as e:
            pass
