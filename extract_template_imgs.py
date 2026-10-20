import sys, os, docx

template_path = r"c:\Users\truon\Downloads\CĐ DATNKHCN sửa lại bảng khoảng trắng ở chỉ mục.docx"
doc = docx.Document(template_path)

os.makedirs("template_extracted_images", exist_ok=True)
for rel_id, rel in doc.part.rels.items():
    if "image" in rel.target_ref:
        img_data = rel.target_part.blob
        fname = os.path.basename(rel.target_ref)
        out_path = os.path.join("template_extracted_images", f"{rel_id}_{fname}")
        with open(out_path, "wb") as f:
            f.write(img_data)
        print(f"Saved {out_path}, size={len(img_data)} bytes")

