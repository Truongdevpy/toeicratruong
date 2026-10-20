with open("core/downloader.py", "r", encoding="utf-8") as f:
    text = f.read()

import re
print("Semaphore matches:")
for m in re.finditer(r"semaphore", text, re.IGNORECASE):
    idx = m.start()
    print(text[max(0, idx-60):min(len(text), idx+100)])
