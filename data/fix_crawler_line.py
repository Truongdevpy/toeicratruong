with open("crawler.py", "r", encoding="utf-8") as f:
    text = f.read()

text = text.replace('print("\n" + "=" * 40)', 'print("\\n" + "=" * 40)')

with open("crawler.py", "w", encoding="utf-8") as f:
    f.write(text)

print("Fixed!")
