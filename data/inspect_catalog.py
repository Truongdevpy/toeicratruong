# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('../backend/routers/tests.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[160:220]):
    print(f'{i+161}: {l}', end='')
