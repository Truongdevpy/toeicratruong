import sys, os, docx

template_path = r"c:\Users\truon\Downloads\CĐ DATNKHCN sửa lại bảng khoảng trắng ở chỉ mục.docx"
doc = docx.Document(template_path)

print("Images in template document:")
for rel_id, rel in doc.part.rels.items():
    if "image" in rel.target_ref:
        print(f"  Rel ID: {rel_id}, Target: {rel.target_ref}")

# Let us see which paragraphs or table cells reference these images
for p_idx, p in enumerate(doc.paragraphs):
    drawings = p._element.xpath(".//a:blip/@r:embed")
    if drawings:
        print(f"  P{p_idx} ({p.text[:30]}...): embed={drawings}")

for t_idx, tbl in enumerate(doc.tables):
    for r_idx, row in enumerate(tbl.rows):
        for c_idx, cell in enumerate(row.cells):
            drawings = cell._element.xpath(".//a:blip/@r:embed")
            if drawings:
                print(f"  Table {t_idx} Row {r_idx} Col {c_idx}: embed={drawings}")
