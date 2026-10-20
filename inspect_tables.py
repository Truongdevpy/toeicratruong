import sys
sys.stdout.reconfigure(encoding="utf-8")

with open("template_dump.txt", "r", encoding="utf-8") as f:
    text = f.read()

tables_part = text.split("=== TABLES ===")[1]
tables = tables_part.split("--- TABLE ")

for t in tables[1:]:
    lines = t.strip().split("\n")
    print(lines[0])
    for row in lines[1:5]:
        print("  ", row[:120])
    if len(lines) > 5:
        print(f"   ... ({len(lines)-1} rows in total)")
