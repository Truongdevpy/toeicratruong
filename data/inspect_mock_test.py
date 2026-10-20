# -*- coding: utf-8 -*-
import sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

catalog_path = Path('../data/data/web_ready/tests_catalog.json').resolve()
data = json.loads(catalog_path.read_text(encoding="utf-8"))
print("First item in tests_catalog.json:")
print(data[0])
