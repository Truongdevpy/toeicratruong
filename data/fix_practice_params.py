from pathlib import Path

p = Path(r"..\backend\routers\practice.py")
txt = p.read_text(encoding="utf-8")
txt = txt.replace('    if part is not None:', '    if isinstance(part, int):')
txt = txt.replace('    if set_id:', '    if isinstance(set_id, str) and set_id:')
txt = txt.replace('    start = (page - 1) * limit', '    page_num = page if isinstance(page, int) else 1\n    limit_num = limit if isinstance(limit, int) else 20\n    start = (page_num - 1) * limit_num')
txt = txt.replace('    selected = filtered[start:start + limit]', '    selected = filtered[start:start + limit_num]')
txt = txt.replace('"total_pages": max(1, (len(filtered) + limit - 1) // limit),', '"total_pages": max(1, (len(filtered) + limit_num - 1) // limit_num),')
txt = txt.replace('"has_more": start + limit < len(filtered)', '"has_more": start + limit_num < len(filtered)')
p.write_text(txt, encoding="utf-8")
print("Fixed dictation query params.")
