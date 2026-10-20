# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('../backend/routers/admin.py', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()
endpoints = [l for l in lines if l.startswith('@router.')]
print(f"Total admin endpoints: {len(endpoints)}")
for ep in endpoints:
    print(" -", ep)
