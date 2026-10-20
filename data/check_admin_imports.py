# -*- coding: utf-8 -*-
with open('../backend/routers/admin.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[:45]):
    print(f"{i+1}: {l}", end="")
