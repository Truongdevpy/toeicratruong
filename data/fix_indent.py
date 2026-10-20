from pathlib import Path

p = Path(r"..\backend\routers\practice.py")
txt = p.read_text(encoding="utf-8")

# Fix indentation in get_listening_questions
bad_block = """            page_num = page if isinstance(page, int) else 1
    limit_num = limit if isinstance(limit, int) else 20
    start = (page_num - 1) * limit_num"""

good_block = """            page_num = page if isinstance(page, int) else 1
            limit_num = limit if isinstance(limit, int) else 20
            start = (page_num - 1) * limit_num"""

txt = txt.replace(bad_block, good_block)
p.write_text(txt, encoding="utf-8")
print("Cleaned up indentation.")
