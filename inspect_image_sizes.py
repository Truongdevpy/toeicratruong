import sys, os, docx
from PIL import Image

for folder in ["extracted_anh_giao_dien", "extracted_docx_images"]:
    if os.path.exists(folder):
        print(f"=== Folder: {folder} ===")
        files = [f for f in os.listdir(folder) if f.endswith(".png")]
        for f in sorted(files):
            p = os.path.join(folder, f)
            with Image.open(p) as img:
                print(f"  {f}: size={img.size}, mode={img.mode}")

