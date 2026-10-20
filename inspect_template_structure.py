import sys
sys.stdout.reconfigure(encoding="utf-8")

with open("template_dump.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for i, line in enumerate(lines):
    line_clean = line.strip()
    if any(k in line_clean for k in ["CHƯƠNG", "DANH MỤC", "MỤC LỤC", "KẾT LUẬN", "TÀI LIỆU", "PHỤ LỤC", "TABLE", "Hình ", "Bảng "]):
        print(f"L{i}: {line_clean[:110]}")
    elif line_clean.startswith("[") and any(w in line_clean for w in ["TRƯỜNG", "KHOA", "BÁO CÁO", "CHUYÊN ĐỀ", "Nhóm", "Danh sách", "Giảng viên"]):
        print(f"L{i}: {line_clean[:110]}")
