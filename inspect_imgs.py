import sys, os

print("=== Checking extracted_anh_giao_dien images ===")
for f in sorted(os.listdir("extracted_anh_giao_dien")):
    p = os.path.join("extracted_anh_giao_dien", f)
    print(f"{f}: {os.path.getsize(p)} bytes")

print("\n=== Checking extracted_docx_images ===")
for f in sorted(os.listdir("extracted_docx_images")):
    p = os.path.join("extracted_docx_images", f)
    if os.path.isfile(p):
        print(f"{f}: {os.path.getsize(p)} bytes")
    else:
        print(f"DIR: {f}")
