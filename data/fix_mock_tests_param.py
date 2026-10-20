from pathlib import Path

p = Path(r"..\backend\routers\mock_tests.py")
txt = p.read_text(encoding="utf-8")
txt = txt.replace('    if site:', '    if isinstance(site, str) and site:')
txt = txt.replace('    if test_type:', '    if isinstance(test_type, str) and test_type:')
txt = txt.replace('    if search:', '    if isinstance(search, str) and search:')
p.write_text(txt, encoding="utf-8")
print("Fixed query params.")
