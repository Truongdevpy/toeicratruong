import sys, os
from PIL import Image

for sub in ["anh_giao_dien", "phan_anh_con_thieu"]:
    p = os.path.join("extracted_docx_images", sub)
    if os.path.exists(p):
        print(f"=== {p} ===")
        for f in sorted(os.listdir(p)):
            fp = os.path.join(p, f)
            if os.path.isfile(fp) and f.endswith(".png"):
                with Image.open(fp) as img:
                    print(f"  {f}: size={img.size}, bytes={os.path.getsize(fp)}")
