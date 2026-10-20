import sys, glob
from pathlib import Path
backend_dir = Path("../backend").resolve()
sys.path.insert(0, str(backend_dir))
from mojibake_guard import sanitize_mojibake, is_mojibake

files_to_check = (
    list(Path("../frontend/src").rglob("*.tsx")) +
    list(Path("../frontend/src").rglob("*.ts")) +
    list(Path("../backend/routers").rglob("*.py"))
)

fixed_count = 0
for f in files_to_check:
    try:
        content = f.read_text(encoding="utf-8")
        if is_mojibake(content):
            new_content = sanitize_mojibake(content)
            if new_content != content:
                f.write_text(new_content, encoding="utf-8")
                fixed_count += 1
                print(f"Fixed mojibake in: {f}")
    except Exception as e:
        print(f"Error checking {f}: {e}")

print(f"Total files healed from mojibake: {fixed_count}")
