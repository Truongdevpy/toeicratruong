import json

for p in [5, 6, 7]:
    path = f"C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/practice_by_part/part{p}_practice.json"
    data = json.load(open(path, 'r', encoding='utf-8'))
    print(f"=== PART {p} ===")
    for lvl, qs in data.get('data_by_level', {}).items():
        print(f"Level: {lvl}, count: {len(qs)}")
        for i, q in enumerate(qs[:4]):
            print(f"  [{i}] qnum={q.get('question_number')}, qtext={repr(q.get('question_text'))[:60]}, has_passage={bool(q.get('passage_text'))}, p_len={len(q.get('passage_text') or '')}")
        break
