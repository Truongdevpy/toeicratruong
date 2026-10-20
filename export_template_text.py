import sys, docx

template_path = r"c:\Users\truon\Downloads\CĐ DATNKHCN sửa lại bảng khoảng trắng ở chỉ mục.docx"
doc = docx.Document(template_path)

with open("template_full_text.txt", "w", encoding="utf-8") as f:
    for i, p in enumerate(doc.paragraphs):
        f.write(f"=== P{i} (style={p.style.name if p.style else 'None'}) ===\n")
        f.write(p.text + "\n")

print("Written template_full_text.txt, length:", len(doc.paragraphs))
