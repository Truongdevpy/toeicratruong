import sys, docx
sys.stdout.reconfigure(encoding="utf-8")

for name in ["anh_giao_dien.docx", "phan_anh_con_thieu.docx"]:
    doc = docx.Document(name)
    print(f"==================== {name} ====================")
    for p_idx, p in enumerate(doc.paragraphs):
        print(f"P{p_idx} text: {repr(p.text)}")
        # Check runs and images in runs
        for r_idx, r in enumerate(p.runs):
            # check blip or drawing
            drawings = r._r.xpath(".//a:blip/@r:embed")
            if drawings:
                print(f"   Run {r_idx} has drawing embed: {drawings}")

