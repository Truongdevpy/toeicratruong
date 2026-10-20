import os
import re
import httpx
from pathlib import Path
from config import DAUTOEIC_CONFIG

user_data = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"

found_tokens = []
found_refresh = []

for root, dirs, files in os.walk(user_data):
    if "leveldb" in root.lower():
        for fname in files:
            if fname.endswith((".ldb", ".log")):
                fpath = Path(root) / fname
                try:
                    raw = fpath.read_bytes()
                    if b"sb-odlnhfaygiotcyehuysw-auth-token" in raw:
                        idx = raw.find(b"sb-odlnhfaygiotcyehuysw-auth-token")
                        chunk = raw[idx:idx+15000]
                        clean = "".join(chr(b) if 32 <= b < 127 else " " for b in chunk)
                        jwts = re.findall(r"eyJ[a-zA-Z0-9_\-\.]+", clean)
                        for jwt in jwts:
                            if len(jwt) > 100:
                                found_tokens.append((fpath.stat().st_mtime, jwt))
                        # Refresh tokens are typically alphanumeric or uuid-like or string
                        m_ref = re.findall(r'refresh_token\s*["\':]+\s*([a-zA-Z0-9_\-]+)', clean)
                        for r in m_ref:
                            found_refresh.append(r)
                except Exception as e:
                    pass

print(f"Found {len(found_tokens)} candidate JWT tokens.")
found_tokens.sort(key=lambda x: x[0], reverse=True)

# Test candidate tokens with Supabase
valid_token = None
for mtime, tok in found_tokens:
    try:
        res = httpx.get(
            f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/listening_items?select=id&limit=1",
            headers={
                "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
                "Authorization": f"Bearer {tok}"
            },
            timeout=5
        )
        if res.status_code == 200:
            print("FOUND WORKING TOKEN! Status 200!")
            valid_token = tok
            Path("dau_auth_token.txt").write_text(valid_token, encoding="utf-8")
            break
        else:
            print(f"Token status: {res.status_code}")
    except Exception as e:
        print(f"Error checking token: {e}")

if not valid_token:
    print("Testing refresh tokens...")
    for ref in set(found_refresh):
        try:
            res = httpx.post(
                f"{DAUTOEIC_CONFIG['supabase_url']}/auth/v1/token?grant_type=refresh_token",
                headers={"apikey": DAUTOEIC_CONFIG["supabase_anon_key"]},
                json={"refresh_token": ref},
                timeout=5
            )
            if res.status_code == 200:
                data = res.json()
                valid_token = data.get("access_token")
                print("SUCCESSFULLY REFRESHED TOKEN!")
                Path("dau_auth_token.txt").write_text(valid_token, encoding="utf-8")
                break
            else:
                print(f"Refresh failed: {res.status_code} {res.text}")
        except Exception as e:
            pass
