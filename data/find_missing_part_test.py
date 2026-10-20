import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

# Check which test is missing parts
from check_all_study4_lr_parts import tests_with_parts
for t, p in tests_with_parts:
    if len(p) != 7:
        print("Missing parts:", t, p)
