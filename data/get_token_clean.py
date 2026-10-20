import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import struct
import re
import cramjam
import httpx
from pathlib import Path
from config import DAUTOEIC_CONFIG

def read_varint(data, pos):
    res = 0
    shift = 0
    while True:
        b = data[pos]
        pos += 1
        res |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7
    return res, pos

def parse_sstable(fpath):
    data = Path(fpath).read_bytes()
    if len(data) < 48:
        return []
    magic = data[-8:]
    if magic != b"\x57\xfb\x80\x8b\x24\x75\x47\xdb":
        return []
    footer = data[-48:]
    pos = 0
    _, pos = read_varint(footer, pos)
    _, pos = read_varint(footer, pos)
    idx_offset, pos = read_varint(footer, pos)
    idx_size, pos = read_varint(footer, pos)
    
    idx_type = data[idx_offset + idx_size]
    idx_raw = data[idx_offset:idx_offset + idx_size]
    if idx_type == 1:
        idx_raw = bytes(cramjam.snappy.decompress_raw(idx_raw))
    else:
        idx_raw = bytes(idx_raw)
    
    blocks = []
    p = 0
    num_restarts = struct.unpack("<I", idx_raw[-4:])[0]
    limit = len(idx_raw) - 4 - num_restarts * 4
    while p < limit:
        shared, p = read_varint(idx_raw, p)
        unshared, p = read_varint(idx_raw, p)
        val_len, p = read_varint(idx_raw, p)
        key = idx_raw[p:p+unshared]
        p += unshared
        val = idx_raw[p:p+val_len]
        p += val_len
        boff, vp = read_varint(val, 0)
        bsz, vp = read_varint(val, vp)
        blocks.append((boff, bsz))
    
    decompressed_blocks = []
    for boff, bsz in blocks:
        btype = data[boff + bsz]
        bdata = data[boff:boff+bsz]
        if btype == 1:
            try:
                bdata = bytes(cramjam.snappy.decompress_raw(bdata))
            except Exception as e:
                pass
        else:
            bdata = bytes(bdata)
        decompressed_blocks.append(bdata)
    return decompressed_blocks

profile_dir = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb"
for f in sorted(profile_dir.glob("*.ldb"), key=lambda x: x.stat().st_mtime, reverse=True):
    try:
        blocks = parse_sstable(f)
        for b in blocks:
            if b"sb-odlnhfaygiotcyehuysw-auth-token" in b:
                for enc in ["utf-8", "utf-16-le"]:
                    try:
                        txt = b.decode(enc, errors="ignore")
                        for m in re.finditer(r'"access_token"\s*:\s*"([^"]+)"', txt):
                            tok = m.group(1)
                            print(f"Found access_token len {len(tok)}")
                            Path("dau_auth_token.txt").write_text(tok, encoding="utf-8")
                        for m in re.finditer(r'"refresh_token"\s*:\s*"([^"]+)"', txt):
                            ref = m.group(1)
                            print(f"Found refresh_token len {len(ref)}")
                            Path("dau_refresh_token.txt").write_text(ref, encoding="utf-8")
                    except Exception as e:
                        pass
    except Exception as e:
        pass

# Now test the token or refresh
tok = Path("dau_auth_token.txt").read_text().strip()
ref = Path("dau_refresh_token.txt").read_text().strip() if Path("dau_refresh_token.txt").exists() else ""

print("Testing access token with Supabase...")
try:
    with httpx.Client(timeout=15) as client:
        res = client.get(
            f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1/listening_items?select=id&limit=1",
            headers={
                "apikey": DAUTOEIC_CONFIG["supabase_anon_key"],
                "Authorization": f"Bearer {tok}"
            }
        )
        print("Access token response status:", res.status_code)
        if res.status_code == 200:
            print("ACCESS TOKEN IS VALID AND WORKING!")
        elif res.status_code == 401 and ref:
            print("Access token expired, refreshing with refresh token...")
            r_ref = client.post(
                f"{DAUTOEIC_CONFIG['supabase_url']}/auth/v1/token?grant_type=refresh_token",
                headers={"apikey": DAUTOEIC_CONFIG["supabase_anon_key"]},
                json={"refresh_token": ref}
            )
            print("Refresh response:", r_ref.status_code)
            if r_ref.status_code == 200:
                data = r_ref.json()
                new_acc = data["access_token"]
                new_ref = data.get("refresh_token")
                Path("dau_auth_token.txt").write_text(new_acc, encoding="utf-8")
                if new_ref:
                    Path("dau_refresh_token.txt").write_text(new_ref, encoding="utf-8")
                print("TOKEN REFRESHED SUCCESSFULLY!")
except Exception as e:
    print("Request error:", e)
