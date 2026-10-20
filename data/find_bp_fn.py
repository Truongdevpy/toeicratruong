from pathlib import Path
import re

text = Path("temp_js/index-laDVicvl.js").read_text(encoding="utf-8")
idx = text.rfind("as bP")
if idx != -1:
    orig_name = text[idx-20:idx].split(",")[-1].strip().split()[-1]
    print(f"Original name for bP is: {orig_name}")
    # find definition of orig_name
    match = re.search(r'function ' + re.escape(orig_name) + r'\s*\([^)]*\)\s*\{[^}]{1,300}\}', text)
    if match:
        print("Function definition:")
        print(match.group(0))
    else:
        m2 = re.search(r'(?:const|let|var)\s+' + re.escape(orig_name) + r'\s*=\s*[^;]+;', text)
        if m2:
            print("Variable definition:")
            print(m2.group(0))
