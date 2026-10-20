import json
with open("data/web_ready/tests_catalog.json", "r", encoding="utf-8") as f:
    cat = json.load(f)

for t in cat:
    if t.get("site") == "dautoeic":
        print(f"ID: {t['id']} | Name: {t['name']} | Questions: {t['total_questions']}")
