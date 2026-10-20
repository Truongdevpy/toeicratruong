import httpx
import re
from pathlib import Path

base = "https://dauenglish.com"
r_index = httpx.get(f"{base}/assets/index-laDVicvl.js", timeout=15)
chunks = set(re.findall(r'assets/[a-zA-Z0-9_\-]+\.js', r_index.text))

out_dir = Path("temp_js")
out_dir.mkdir(exist_ok=True)
(out_dir / "index-laDVicvl.js").write_text(r_index.text, encoding="utf-8")

with httpx.Client(timeout=10) as client:
    for c in chunks:
        name = c.split("/")[-1]
        p = out_dir / name
        if not p.exists():
            try:
                res = client.get(f"{base}/{c}")
                if res.status_code == 200:
                    p.write_text(res.text, encoding="utf-8")
            except Exception:
                pass
print(f"Downloaded {len(list(out_dir.glob('*.js')))} JS files.")
