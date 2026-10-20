with open("crawler.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(max(0, 305), min(len(lines), 330)):
    print(f"{i+1}: {repr(lines[i])}")
