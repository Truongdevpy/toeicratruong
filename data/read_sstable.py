import sys
sys.stdout.reconfigure(encoding="utf-8")
import struct
import cramjam
import re
import json
from pathlib import Path
import os

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

def parse_sstable(file_path):
    data = Path(file_path).read_bytes()
    if len(data) < 48:
        return
    footer = data[-48:]
    magic = struct.unpack("<Q", footer[-8:])[0]
    if magic != 0xdb4775248b80fb57:
        print("Not a standard LevelDB sstable")
        return

    pos = 0
    _, pos = read_varint(footer, pos)
    _, pos = read_varint(footer, pos)
    index_offset, pos = read_varint(footer, pos)
    index_size, pos = read_varint(footer, pos)

    index_block_data = data[index_offset:index_offset+index_size]
    comp_type = data[index_offset+index_size]
    if comp_type == 1:
        index_block = cramjam.snappy.decompress_raw(index_block_data)
    else:
        index_block = index_block_data

    ipos = 0
    blocks = []
    while ipos < len(index_block) - 4:
        try:
            shared, ipos = read_varint(index_block, ipos)
            non_shared, ipos = read_varint(index_block, ipos)
            val_len, ipos = read_varint(index_block, ipos)
            key = index_block[ipos:ipos+non_shared]
            ipos += non_shared
            val = index_block[ipos:ipos+val_len]
            ipos += val_len
            
            b_offset, vpos = read_varint(val, 0)
            b_size, _ = read_varint(val, vpos)
            blocks.append((b_offset, b_size))
        except Exception:
            break

    print(f"Total data blocks in {Path(file_path).name}: {len(blocks)}")
    for b_offset, b_size in blocks:
        raw_block = data[b_offset:b_offset+b_size]
        comp = data[b_offset+b_size]
        if comp == 1:
            try:
                decomp = cramjam.snappy.decompress_raw(raw_block)
            except Exception:
                decomp = raw_block
        else:
            decomp = raw_block

        if b"sb-odlnhfaygiotcyehuysw-auth-token" in decomp or b"refresh_token" in decomp:
            print(f"Found match in block at {b_offset}!")
            # try utf-16-le
            text = decomp.decode("utf-16-le", errors="ignore")
            m_acc = re.search(r'"access_token"\s*:\s*"([^"]+)"', text)
            m_ref = re.search(r'"refresh_token"\s*:\s*"([^"]+)"', text)
            if m_acc:
                print("Found ACCESS TOKEN! Len:", len(m_acc.group(1)))
                Path("dau_auth_token.txt").write_text(m_acc.group(1), encoding="utf-8")
            if m_ref:
                print("Found REFRESH TOKEN! Len:", len(m_ref.group(1)))
                Path("dau_refresh_token.txt").write_text(m_ref.group(1), encoding="utf-8")

f = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data" / "Profile 2" / "Local Storage" / "leveldb" / "033895.ldb"
parse_sstable(f)
