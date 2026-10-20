import os
import json
import httpx
from pathlib import Path
from config import DAUTOEIC_CONFIG

p = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb" / "033921.ldb"
raw = p.read_bytes()
idx = raw.find(b"sb-odlnhfaygiotcyehuysw-auth-token")
chunk = raw[idx:idx+15000]

# Try decoding utf-16le from chunk
idx_brace = chunk.find(b"{\x00")
if idx_brace != -1:
    sub = chunk[idx_brace:]
    # decode utf-16-le
    # find where it ends (closing brace in utf-16-le is b"}\x00")
    end_brace = sub.rfind(b"}\x00")
    if end_brace != -1:
        json_bytes = sub[:end_brace+2]
        decoded = json_bytes.decode("utf-16le", errors="ignore")
        print("Decoded length:", len(decoded))
        try:
            data = json.loads(decoded)
            acc = data.get("access_token")
            ref = data.get("refresh_token")
            print("Access token prefix:", acc[:30] if acc else None)
            print("Refresh token prefix:", ref[:30] if ref else None)
            
            # test access token
            res = httpx.get(
                f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/listening_items?select=id&limit=1",
                headers={
                    "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
                    "Authorization": f"Bearer {acc}"
                },
                timeout=5
            )
            print("Access token test:", res.status_code)
            if res.status_code == 200:
                print("ACCESS TOKEN IS VALID!")
                Path("dau_auth_token.txt").write_text(acc, encoding="utf-8")
            else:
                print("Trying refresh...")
                res_ref = httpx.post(
                    f"{DAUTOEIC_CONFIG['supabase_url']}/auth/v1/token?grant_type=refresh_token",
                    headers={"apikey": DAUTOEIC_CONFIG["supabase_anon_key"]},
                    json={"refresh_token": ref},
                    timeout=5
                )
                print("Refresh status:", res_ref.status_code)
                if res_ref.status_code == 200:
                    new_acc = res_ref.json()["access_token"]
                    print("SUCCESSFULLY REFRESHED!")
                    Path("dau_auth_token.txt").write_text(new_acc, encoding="utf-8")
        except Exception as e:
            print("JSON parse error:", e)
            print("Raw decoded snippet:", decoded[:200])
