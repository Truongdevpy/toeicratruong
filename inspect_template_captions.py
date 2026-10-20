import sys
sys.stdout.reconfigure(encoding="utf-8")

with open("template_full_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Let us print out paragraphs around images
paragraphs = text.split("=== P")
for p_block in paragraphs[1:]:
    header, *content = p_block.split("\n", 1)
    body = content[0].strip() if content else ""
    idx = int(header.split(" ")[0])
    if any(k in body for k in ["Hình ", "Bảng ", "CHƯƠNG", "MỤC LỤC", "DANH MỤC", "KẾT LUẬN", "TÀI LIỆU", "PHỤ LỤC"]) or idx in [4, 76, 77, 78, 84, 85, 86, 89, 90, 91, 96, 97, 98, 104, 105, 106, 110, 111, 112, 136, 137, 138, 141, 142, 143, 146, 147, 148, 149, 150, 153, 154, 155, 159, 160, 161, 162, 163, 164]:
        print(f"P{idx}: {body[:120]}")
