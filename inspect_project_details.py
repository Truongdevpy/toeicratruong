import os
import docx

for path in ['anh_giao_dien.docx', 'phan_anh_con_thieu.docx']:
    if os.path.exists(path):
        print(f"=== {path} ===")
        doc = docx.Document(path)
        for i, p in enumerate(doc.paragraphs):
            if p.text.strip():
                print(f"P{i}: {p.text.strip()}")
        # Check shapes / images
        for i, rel in enumerate(doc.part.rels.values()):
            if "image" in rel.target_ref:
                print(f"  Image rel {i}: {rel.target_ref}")

