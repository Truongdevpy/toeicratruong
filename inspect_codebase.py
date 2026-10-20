import sys
sys.stdout.reconfigure(encoding="utf-8")

print("=== Reading backend/main.py ===")
with open("backend/main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
print(f"Lines in backend/main.py: {len(lines)}")
for l in lines[:40]:
    print(l, end="")

print("\n=== Reading backend/models.py ===")
with open("backend/models.py", "r", encoding="utf-8") as f:
    models_content = f.read()

import re
classes = re.findall(r"class\s+(\w+)\(Base\):", models_content)
print(f"Database Models ({len(classes)}):", classes)

print("\n=== Reading frontend/package.json ===")
with open("frontend/package.json", "r", encoding="utf-8") as f:
    print(f.read())
