# -*- coding: utf-8 -*-
with open('../backend/routers/admin.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Total lines in admin.py:", len(lines))
for i, l in enumerate(lines[-50:]):
    print(f"{len(lines)-50+i+1}: {l}", end="")
