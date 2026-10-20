from pathlib import Path

p = Path(r"..\backend\main.py")
txt = p.read_text(encoding="utf-8")
if "from pathlib import Path" not in txt:
    txt = "from pathlib import Path\n" + txt
    p.write_text(txt, encoding="utf-8")
    print("Added Path import.")
